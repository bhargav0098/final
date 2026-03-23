const Appointment = require('../models/Appointment');
const User        = require('../models/User');
const Notification= require('../models/Notification');
const { queueEmail } = require('./emailService');

let io;
const setIO = (s) => { io = s; };

const W = { severity:0.35, emergency:0.28, wait:0.20, age:0.10, type:0.07 };

const calcDPS = (appt, waitMins, age = 30) => {
  const sev  = { EMERGENCY:100, HIGH:75, MEDIUM:45, LOW:20 }[appt.priority_level] || 20;
  const emg  = appt.appointmentType === 'emergency' ? 100 : 0;
  const wait = Math.min((waitMins / 60) * 100, 100);
  const ageR = age < 5 || age > 80 ? 90 : age < 12 || age > 65 ? 60 : 20;
  const type = appt.appointmentType === 'follow-up' ? 70 : 50;
  return Math.round(W.severity*sev + W.emergency*emg + W.wait*wait + W.age*ageR + W.type*type);
};

const recalculateQueue = async (doctorId, date) => {
  const appts = await Appointment.find({
    doctor: doctorId, date,
    status: { $in: ['pending','confirmed','rescheduled_by_ai','rescheduled_by_doctor'] },
  }).populate('patient','age name');

  const now = new Date();
  const scored = appts.map(a => {
    const waitMins = Math.floor((now - new Date(a.createdAt)) / 60000);
    const dps = calcDPS(a, waitMins, a.patient?.age || 30);
    return { appt: a, dps };
  }).sort((a, b) => b.dps - a.dps);

  const doctor = await User.findById(doctorId);
  const avgConsult = doctor?.avgConsultTime || 15;
  let cum = 0;

  const updates = scored.map(({ appt, dps }, i) => {
    const eta = new Date(now.getTime() + cum * 60000);
    const etaStr = eta.toTimeString().slice(0, 5);
    cum += avgConsult;
    return Appointment.findByIdAndUpdate(appt._id, {
      queuePosition: i + 1,
      dynamicPriorityScore: dps,
      estimatedWaitMinutes: i * avgConsult,
      estimatedStartTime: etaStr,
    });
  });
  await Promise.all(updates);

  if (io) io.to(`doctor:${doctorId}`).emit('queue_updated', { doctorId, date, count: scored.length });
  return scored.length;
};

const getLiveQueue = async (doctorId, date) => {
  return Appointment.find({
    doctor: doctorId, date,
    status: { $in: ['pending','confirmed','rescheduled_by_ai','rescheduled_by_doctor'] },
  })
    .populate('patient', 'name age gender')
    .populate('doctor',  'name specialization avgConsultTime')
    .sort({ queuePosition: 1 });
};

const getHospitalQueue = async (date) => {
  const today = date || new Date().toISOString().slice(0,10);
  return Appointment.find({
    date: today,
    status: { $in: ['pending','confirmed','rescheduled_by_ai','rescheduled_by_doctor'] },
  })
    .populate('patient', 'name age gender')
    .populate('doctor',  'name specialization avgConsultTime department')
    .sort({ priority_level: -1, queuePosition: 1 });
};

// Emergency insertion — shift all other patients down
const handleEmergencyInsertion = async (emergencyAppt, socketIO) => {
  const { doctor, date } = emergencyAppt;
  const theIO = socketIO || io;

  const affected = await Appointment.find({
    doctor, date,
    status: { $in: ['pending','confirmed'] },
    _id: { $ne: emergencyAppt._id },
  }).populate('patient','name email');

  const extraMins = emergencyAppt.triageResult?.estimated_consult_minutes || 25;
  const reschedulesTpl = require('../templates/emails/appointmentRescheduledAI');
  const notifs = [];
  const emailJobs = [];

  for (const appt of affected) {
    const newWait = (appt.estimatedWaitMinutes || 0) + extraMins;
    await Appointment.findByIdAndUpdate(appt._id, {
      status: 'rescheduled_by_ai',
      ai_modified: true,
      reschedule_reason: `Emergency patient inserted. Your wait increased by ~${extraMins} min.`,
      estimatedWaitMinutes: newWait,
    });
    notifs.push({
      user: appt.patient._id,
      title: '⚠️ Queue Updated',
      message: `An emergency was added ahead of you. New estimated wait: ~${newWait} min.`,
      type: 'queue_update', relatedId: appt._id,
    });
    emailJobs.push({
      to: appt.patient.email,
      subject: 'Your Appointment Time Updated – Emergency Case',
      html: reschedulesTpl({
        patientName: appt.patient.name,
        date: appt.date, time: appt.time,
        reason: 'An emergency patient required immediate attention.',
        newWait, ticketNumber: appt.ticketNumber,
      }),
      type: 'rescheduled_by_ai', relatedId: appt._id,
    });
  }

  if (notifs.length > 0) await Notification.insertMany(notifs);
  for (const e of emailJobs) queueEmail(e.to, e.subject, e.html, e.type, e.relatedId);

  await recalculateQueue(doctor, date);

  if (theIO) {
    theIO.to(`doctor:${doctor}`).emit('emergency_inserted', {
      emergencyId: emergencyAppt._id, affectedCount: affected.length,
    });
    for (const appt of affected) {
      theIO.to(`user:${appt.patient._id}`).emit('queue_update', {
        appointmentId: appt._id,
        message: 'Emergency case added. Your wait time updated.',
      });
    }
    // Broadcast to live queue room
    theIO.to(`livequeue:${doctor}:${date}`).emit('queue_reordered', { date, doctorId: doctor });
  }

  return affected.length;
};

// Broadcast full hospital queue to all live-queue subscribers
const broadcastHospitalQueue = async (date) => {
  if (!io) return;
  const queue = await getHospitalQueue(date);
  io.to(`livequeue:all:${date}`).emit('hospital_queue_update', queue);
};

module.exports = {
  recalculateQueue, handleEmergencyInsertion, getLiveQueue,
  getHospitalQueue, broadcastHospitalQueue, calcDPS, setIO,
};
