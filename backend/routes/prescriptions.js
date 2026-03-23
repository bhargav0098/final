const express = require('express');
const router  = express.Router();
const Appointment = require('../models/Appointment');
const User        = require('../models/User');
const { protect, doctorOnly } = require('../middleware/auth');
const { queueEmail } = require('../services/emailService');
const prescriptionTpl = require('../templates/emails/prescription');

// POST /api/prescriptions/:appointmentId — doctor issues prescription
router.post('/:appointmentId', protect, doctorOnly, async (req, res) => {
  try {
    const { diagnosis, medicines, instructions, followUpDate, followUpNotes } = req.body;
    if (!diagnosis) return res.status(400).json({ message: 'Diagnosis is required' });

    const appt = await Appointment.findById(req.params.appointmentId)
      .populate('patient', 'name email age medicalHistory allergies')
      .populate('doctor', 'name specialization');

    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (String(appt.doctor._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the assigned doctor can issue a prescription' });
    }

    // AI suggestions based on diagnosis keywords
    const aiSuggestions = generateAISuggestions(diagnosis, appt.patient?.medicalHistory || [], appt.patient?.allergies || []);

    const prescription = {
      diagnosis,
      medicines:    medicines || [],
      instructions: instructions || '',
      followUpDate: followUpDate || '',
      followUpNotes:followUpNotes || '',
      aiSuggestions,
      issuedAt: new Date(),
      emailSent: false,
    };

    appt.prescription    = prescription;
    appt.hasPrescription = true;
    appt.doctorNotes     = req.body.doctorNotes || appt.doctorNotes;
    if (appt.status !== 'completed') {
      appt.status = 'completed';
      appt.completedAt = new Date();
      appt.statusHistory.push({
        status: 'completed', changedBy: req.user._id, changedByRole: 'doctor',
        timestamp: new Date(), reason: 'Consultation completed with prescription',
      });
    }
    await appt.save();

    // Email prescription to patient
    queueEmail(
      appt.patient.email,
      `💊 Prescription from Dr. ${appt.doctor.name}`,
      prescriptionTpl({
        patientName:   appt.patient.name,
        doctorName:    appt.doctor.name,
        specialization:appt.doctor.specialization,
        date:          appt.date,
        diagnosis,
        medicines:     medicines || [],
        instructions:  instructions || '',
        followUpDate:  followUpDate || '',
        ticketNumber:  appt.ticketNumber,
      }),
      'prescription', appt._id
    );

    // Mark email sent
    appt.prescription.emailSent = true;
    await appt.save();

    res.json({ message: 'Prescription issued and sent to patient', prescription, aiSuggestions });
  } catch (err) {
    console.error('Prescription error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/prescriptions/:appointmentId — get prescription
router.get('/:appointmentId', protect, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.appointmentId)
      .populate('patient', 'name email age')
      .populate('doctor', 'name specialization consultationFee');

    if (!appt) return res.status(404).json({ message: 'Not found' });

    const isOwner  = String(appt.patient._id) === String(req.user._id);
    const isDoctor = String(appt.doctor._id)  === String(req.user._id);
    const isAdmin  = req.user.role === 'admin';

    if (!isOwner && !isDoctor && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ prescription: appt.prescription, appointment: appt });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/prescriptions/patient/all — all prescriptions for logged-in patient
router.get('/patient/all', protect, async (req, res) => {
  try {
    const appts = await Appointment.find({
      patient: req.user._id,
      hasPrescription: true,
    }).populate('doctor', 'name specialization').sort({ createdAt: -1 });

    res.json(appts.map(a => ({
      _id: a._id, ticketNumber: a.ticketNumber, date: a.date,
      doctor: a.doctor, prescription: a.prescription,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// AI suggestion engine (rule-based)
function generateAISuggestions(diagnosis, history, allergies) {
  const d = diagnosis.toLowerCase();
  const suggestions = { possibleConditions: [], recommendedTests: [], warnings: [], medicineSuggestions: [] };

  if (/fever|infection|bacterial/.test(d)) {
    suggestions.possibleConditions.push('Bacterial infection', 'Viral fever');
    suggestions.recommendedTests.push('CBC', 'Blood culture');
    suggestions.medicineSuggestions.push(
      { name:'Paracetamol 500mg', note:'For fever management', caution:'Avoid in liver disease' },
      { name:'Amoxicillin 500mg', note:'For bacterial infection', caution:'Check for penicillin allergy' }
    );
  }
  if (/chest|cardiac|heart/.test(d)) {
    suggestions.possibleConditions.push('Cardiac event', 'Angina', 'Costochondritis');
    suggestions.recommendedTests.push('ECG', 'Troponin levels', 'Echo');
    suggestions.medicineSuggestions.push(
      { name:'Aspirin 75mg', note:'Antiplatelet', caution:'Check bleeding history' }
    );
  }
  if (/diabetes|blood sugar|glucose/.test(d)) {
    suggestions.possibleConditions.push('Type 2 Diabetes', 'Hyperglycemia');
    suggestions.recommendedTests.push('HbA1c', 'Fasting glucose', 'Kidney function');
  }
  if (/hypertension|blood pressure/.test(d)) {
    suggestions.possibleConditions.push('Essential Hypertension');
    suggestions.recommendedTests.push('Renal function', 'Urine ACR', 'ECG');
  }

  // Allergy warnings
  if (allergies.includes('Penicillin') && suggestions.medicineSuggestions.some(m => /amoxicillin|ampicillin/i.test(m.name))) {
    suggestions.warnings.push('⚠️ Patient is allergic to Penicillin — avoid Amoxicillin');
  }
  if (allergies.includes('Aspirin') && suggestions.medicineSuggestions.some(m => /aspirin/i.test(m.name))) {
    suggestions.warnings.push('⚠️ Patient is allergic to Aspirin — avoid NSAIDs');
  }
  if (history.includes('Diabetes Type 2') || history.includes('Diabetes')) {
    suggestions.warnings.push('⚠️ Diabetic patient — monitor glucose levels carefully');
  }
  if (history.includes('Heart Disease')) {
    suggestions.warnings.push('⚠️ History of heart disease — exercise caution with cardiac medications');
  }

  return suggestions;
}

module.exports = router;
