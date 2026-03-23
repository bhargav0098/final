const express     = require('express');
const router      = express.Router();
const Appointment = require('../models/Appointment');
const User        = require('../models/User');
const Notification= require('../models/Notification');
const { protect } = require('../middleware/auth');
const { triagePatient } = require('../services/triageAgent');
const { isDoctorFull, incrementSlot, decrementSlot, getAlternatives } = require('../services/capacityEngine');
const { recalculateQueue, handleEmergencyInsertion } = require('../services/queueManager');
const { queueEmail } = require('../services/emailService');
const bookedTpl    = require('../templates/emails/appointmentBooked');
const acceptedTpl  = require('../templates/emails/appointmentAccepted');
const rejectedTpl  = require('../templates/emails/appointmentRejected');
const cancelledTpl = require('../templates/emails/appointmentCancelled');
const reschedDrTpl = require('../templates/emails/appointmentRescheduledDoctor');

let io;
const setIO = (s) => { io = s; };

// Helper: create notification + send socket to BOTH user room and doctor room
const notify = async (userId, title, message, type, relatedId) => {
  try {
    const n = await Notification.create({ user: userId, title, message, type, relatedId });
    if (io) {
      // emit to user room (everyone joins this)
      io.to(`user:${userId}`).emit('notification', n);
      // also emit to doctor room (doctors join this separately)
      io.to(`doctor:${userId}`).emit('notification', n);
    }
    return n;
  } catch(e) { console.error('notify error:', e.message); }
};

const addStatusHistory = (appt, status, userId, reason='') => {
  if (!appt.statusHistory) appt.statusHistory = [];
  appt.statusHistory.push({ status, changedAt: new Date(), changedBy: userId, reason });
};

// ─── POST /book ───────────────────────────────────────
router.post('/book', protect, async (req, res) => {
  try {
    const { doctorId, date, time, reason, appointmentType = 'new', description = '' } = req.body;
    if (!doctorId || !date || !reason) {
      return res.status(400).json({ message: 'Doctor, date and reason are required' });
    }

    const doctor  = await User.findById(doctorId);
    const patient = await User.findById(req.user._id);

    if (!doctor || doctor.role !== 'doctor') {
      return res.status(400).json({ message: 'Doctor not found' });
    }
    if (doctor.status !== 'approved') {
      return res.status(400).json({ message: 'Doctor account not approved' });
    }

    const isEmergency = appointmentType === 'emergency';

    // Capacity check
    if (await isDoctorFull(doctorId, date, isEmergency)) {
      const alts = await getAlternatives(doctor.specialization, date, doctorId);
      return res.status(409).json({
        message: `Dr. ${doctor.name} is fully booked for ${date}`,
        doctorFull: true,
        alternatives: alts.slice(0, 3),
      });
    }

    // AI Triage
    const triage = await triagePatient(reason, description, patient?.age || 30, patient?.medicalHistory || []);

    // Create appointment
    const appt = await Appointment.create({
      patient:    req.user._id,
      doctor:     doctorId,
      date, time, reason,
      appointmentType,
      department: triage.recommended_department || doctor.department || doctor.specialization,
      priority_level: triage.severity,
      triageResult:   triage,
      predictedDuration: triage.estimated_consult_minutes || doctor.avgConsultTime || 15,
      isEmergencySlot: isEmergency,
      statusHistory: [{ status: 'pending', changedAt: new Date(), changedBy: req.user._id }],
    });

    await incrementSlot(doctorId, date, isEmergency);

    // Queue
    if (triage.severity === 'EMERGENCY' || isEmergency) {
      setImmediate(() => handleEmergencyInsertion(appt, io));
    } else {
      await recalculateQueue(doctorId, date);
    }

    // Notify patient
    await notify(
      req.user._id,
      '📅 Appointment Booked',
      `Your appointment with Dr. ${doctor.name} on ${date} has been submitted.`,
      'appointment_booked', appt._id
    );

    // Notify doctor — send to BOTH user:{id} and doctor:{id} rooms
    const doctorNotif = await Notification.create({
      user: doctorId,
      title: triage.severity === 'EMERGENCY' ? '🚨 EMERGENCY Appointment Request' : '📋 New Appointment Request',
      message: `Patient: ${patient?.name || 'Unknown'} | Date: ${date} | Priority: ${triage.severity} | Reason: ${reason.slice(0, 60)}`,
      type: triage.severity === 'EMERGENCY' ? 'emergency' : 'appointment_booked',
      relatedId: appt._id,
    });
    if (io) {
      io.to(`user:${doctorId}`).emit('notification', doctorNotif);
      io.to(`doctor:${doctorId}`).emit('notification', doctorNotif);
      io.to(`doctor:${doctorId}`).emit('new_appointment', {
        appointment: appt,
        patient: { name: patient?.name, age: patient?.age },
        triage: { severity: triage.severity, priority_score: triage.priority_score },
      });
      if (triage.severity === 'EMERGENCY') {
        io.to(`doctor:${doctorId}`).emit('emergency_alert', {
          appointment: appt,
          patient: { name: patient?.name, age: patient?.age },
          triage,
        });
      }
    }

    // Email to patient
    queueEmail(
      patient?.email,
      `Appointment Confirmed with Dr. ${doctor.name}`,
      bookedTpl({
        patientName: patient?.name, doctorName: doctor.name,
        specialization: doctor.specialization, date,
        time: time || 'TBD', ticketNumber: appt.ticketNumber,
        department: doctor.department || doctor.specialization,
        severity: triage.severity,
      }),
      'appointment_booked', appt._id
    );

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: appt,
      triage: {
        severity: triage.severity,
        priority_score: triage.priority_score,
        confidence: triage.confidence,
        action: triage.recommended_action,
        detected_symptoms: triage.detected_symptoms,
      },
    });
  } catch (err) {
    console.error('Book error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /my (patient) ───────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const appts = await Appointment.find({ patient: req.user._id })
      .populate('doctor', 'name specialization avgConsultTime isRunningLate lateByMinutes department email')
      .sort({ createdAt: -1 });
    res.json(appts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET /doctor (doctor's queue) ───────────────────
router.get('/doctor', protect, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Doctor only' });
    const { date } = req.query;
    const filter = { doctor: req.user._id };
    if (date) filter.date = date;
    const appts = await Appointment.find(filter)
      .populate('patient', 'name age gender phone medicalHistory allergies bloodGroup email')
      .sort({ queuePosition: 1, dynamicPriorityScore: -1, createdAt: 1 });
    res.json(appts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET /all (admin) ───────────────────────────────
router.get('/all', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { date, status, doctorId, patientId } = req.query;
    const filter = {};
    if (date)     filter.date   = date;
    if (status)   filter.status = status;
    if (doctorId) filter.doctor = doctorId;
    if (patientId)filter.patient= patientId;
    const appts = await Appointment.find(filter)
      .populate('patient', 'name email age')
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 }).limit(300);
    res.json(appts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── PUT /:id/accept ─────────────────────────────────
router.put('/:id/accept', protect, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name email');
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (String(appt.doctor._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    addStatusHistory(appt, 'confirmed', req.user._id);
    appt.status = 'confirmed';
    await appt.save();
    await recalculateQueue(req.user._id, appt.date);

    await notify(
      appt.patient._id,
      '✅ Appointment Confirmed',
      `Dr. ${appt.doctor.name} confirmed your appointment on ${appt.date} at ${appt.time || 'TBD'}`,
      'appointment_confirmed', appt._id
    );

    if (io) io.to(`user:${appt.patient._id}`).emit('appointment_update', { id: appt._id, status: 'confirmed' });

    queueEmail(
      appt.patient.email,
      'Your Appointment Has Been Approved',
      acceptedTpl({
        patientName: appt.patient.name, doctorName: appt.doctor.name,
        date: appt.date, time: appt.time, ticketNumber: appt.ticketNumber,
        queuePosition: appt.queuePosition, estimatedWait: appt.estimatedWaitMinutes,
      }),
      'appointment_confirmed', appt._id
    );

    res.json({ message: 'Appointment confirmed', appointment: appt });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── PUT /:id/reject ─────────────────────────────────
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const { reason = 'Schedule conflict' } = req.body;
    const appt = await Appointment.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name specialization');
    if (!appt) return res.status(404).json({ message: 'Not found' });
    const canReject = String(appt.doctor._id) === String(req.user._id) || req.user.role === 'admin';
    if (!canReject) return res.status(403).json({ message: 'Forbidden' });

    addStatusHistory(appt, 'rejected', req.user._id, reason);
    appt.status = 'rejected';
    appt.cancellationReason = reason;
    await appt.save();
    await decrementSlot(appt.doctor._id, appt.date, appt.isEmergencySlot);
    await recalculateQueue(appt.doctor._id, appt.date);

    await notify(appt.patient._id, '❌ Appointment Rejected', `Appointment rejected: ${reason}`, 'appointment_rejected', appt._id);

    queueEmail(appt.patient.email, 'Appointment Request Update',
      rejectedTpl({ patientName: appt.patient.name, doctorName: appt.doctor.name, date: appt.date, reason, ticketNumber: appt.ticketNumber }),
      'appointment_rejected', appt._id);

    res.json({ message: 'Appointment rejected' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── PUT /:id/cancel ─────────────────────────────────
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason = 'Cancelled' } = req.body;
    const appt = await Appointment.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name email');
    if (!appt) return res.status(404).json({ message: 'Not found' });

    const isOwner  = String(appt.patient._id) === String(req.user._id);
    const isDoctor = String(appt.doctor._id)  === String(req.user._id);
    const isAdmin  = req.user.role === 'admin';
    if (!isOwner && !isDoctor && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const newStatus = isDoctor ? 'cancelled_by_doctor' : 'cancelled_by_patient';
    addStatusHistory(appt, newStatus, req.user._id, reason);
    appt.status = newStatus;
    appt.cancellationReason = reason;
    await appt.save();
    await decrementSlot(appt.doctor._id, appt.date, appt.isEmergencySlot);
    await recalculateQueue(appt.doctor._id, appt.date);

    await notify(appt.patient._id, '🚫 Appointment Cancelled', `Appointment on ${appt.date} was cancelled`, 'appointment_cancelled', appt._id);
    await notify(appt.doctor._id, '🚫 Appointment Cancelled', `${appt.patient.name} cancelled appointment on ${appt.date}`, 'appointment_cancelled', appt._id);

    queueEmail(appt.patient.email, `Appointment Cancelled – ${appt.date}`,
      cancelledTpl({ recipientName: appt.patient.name, patientName: appt.patient.name, doctorName: appt.doctor.name, date: appt.date, time: appt.time, reason, ticketNumber: appt.ticketNumber }),
      'appointment_cancelled', appt._id);
    queueEmail(appt.doctor.email, `Appointment Cancelled – ${appt.date}`,
      cancelledTpl({ recipientName: `Dr. ${appt.doctor.name}`, patientName: appt.patient.name, doctorName: appt.doctor.name, date: appt.date, time: appt.time, reason, ticketNumber: appt.ticketNumber, isDoctor: true }),
      'appointment_cancelled', appt._id);

    res.json({ message: 'Appointment cancelled' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── PUT /:id/reschedule ─────────────────────────────
router.put('/:id/reschedule', protect, async (req, res) => {
  try {
    const { newDate, newTime, reason = 'Schedule adjustment' } = req.body;
    if (!newDate) return res.status(400).json({ message: 'New date required' });
    const appt = await Appointment.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name');
    if (!appt) return res.status(404).json({ message: 'Not found' });
    const canReschedule = String(appt.doctor._id) === String(req.user._id) || req.user.role === 'admin';
    if (!canReschedule) return res.status(403).json({ message: 'Forbidden' });

    const oldDate = appt.date;
    const oldTime = appt.time;
    addStatusHistory(appt, 'rescheduled_by_doctor', req.user._id, reason);
    appt.status = 'rescheduled_by_doctor';
    appt.date   = newDate;
    if (newTime) appt.time = newTime;
    appt.reschedule_reason = reason;
    appt.ai_modified = false;
    await appt.save();
    await recalculateQueue(appt.doctor._id, newDate);

    await notify(appt.patient._id, '📅 Appointment Rescheduled',
      `Appointment moved to ${newDate} ${newTime || ''} by Dr. ${appt.doctor.name}`,
      'appointment_rescheduled', appt._id);

    queueEmail(appt.patient.email, 'Your Appointment Has Been Rescheduled',
      reschedDrTpl({ patientName: appt.patient.name, doctorName: appt.doctor.name, oldDate, oldTime, newDate, newTime: newTime || appt.time, reason, ticketNumber: appt.ticketNumber }),
      'appointment_rescheduled', appt._id);

    if (io) io.to(`user:${appt.patient._id}`).emit('appointment_update', { id: appt._id, status: 'rescheduled_by_doctor', newDate, newTime });

    res.json({ message: 'Appointment rescheduled', appointment: appt });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── PUT /:id/complete ───────────────────────────────
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const { actualDuration, notes } = req.body;
    const appt = await Appointment.findById(req.params.id).populate('patient', 'name');
    if (!appt) return res.status(404).json({ message: 'Not found' });
    if (String(appt.doctor) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    addStatusHistory(appt, 'completed', req.user._id);
    appt.status      = 'completed';
    appt.completedAt = new Date();
    if (actualDuration) appt.actualDuration = actualDuration;
    if (notes) appt.notes = notes;
    await appt.save();

    // Update doctor's avg consult time (rolling average)
    if (actualDuration) {
      const doc = await User.findById(req.user._id);
      const newAvg = Math.round(doc.avgConsultTime * 0.8 + actualDuration * 0.2);
      await User.findByIdAndUpdate(req.user._id, { avgConsultTime: newAvg });
    }

    await recalculateQueue(req.user._id, appt.date);
    await notify(appt.patient._id, '✅ Consultation Completed', 'Your consultation has been completed.', 'appointment_completed', appt._id);

    res.json({ message: 'Completed', appointment: appt });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── POST /triage ────────────────────────────────────
router.post('/triage', protect, async (req, res) => {
  try {
    const { reason = '', description = '', age, medicalHistory = [] } = req.body;
    if (!reason && !description) return res.status(400).json({ message: 'Reason or description required' });
    const result = await triagePatient(reason, description, age || req.user.age || 30, medicalHistory);
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET /queue/:doctorId/:date ──────────────────────
router.get('/queue/:doctorId/:date', protect, async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const filter = {
      doctor: doctorId,
      date,
      status: { $in: ['pending','confirmed','rescheduled_by_ai','rescheduled_by_doctor'] },
    };
    if (req.user.role === 'patient') filter.patient = req.user._id;
    const appts = await Appointment.find(filter)
      .populate('patient', 'name age')
      .sort({ queuePosition: 1 });
    res.json(appts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
module.exports.setIO = setIO;
