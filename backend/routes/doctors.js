const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Appointment  = require('../models/Appointment');
const Notification = require('../models/Notification');
const { protect, doctorOnly } = require('../middleware/auth');
const { getOrCreateDayCapacity } = require('../services/capacityEngine');
const { recalculateQueue } = require('../services/queueManager');

// GET /api/doctors  — list approved available doctors
router.get('/', async (req, res) => {
  try {
    const { specialization } = req.query;
    const filter = { role: 'doctor', status: 'approved', isAvailable: true };
    if (specialization) filter.specialization = new RegExp(specialization, 'i');
    const doctors = await User.find(filter).select('-password');
    res.json(doctors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/doctors/analytics  — must be before /:id
router.get('/analytics', protect, doctorOnly, async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const today = new Date().toISOString().slice(0, 10);
    const appts = await Appointment.find({ doctor: req.user._id, createdAt: { $gte: since } }).populate('patient', 'name age');
    const completed = appts.filter(a => a.status === 'completed');
    const critical  = appts.filter(a => ['HIGH','EMERGENCY'].includes(a.priority_level) && ['pending','confirmed'].includes(a.status));
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      weeklyTrend.push({ date: d, count: appts.filter(a => a.date === d).length });
    }
    const sev = { LOW: 0, MEDIUM: 0, HIGH: 0, EMERGENCY: 0 };
    appts.forEach(a => { if (sev[a.priority_level] !== undefined) sev[a.priority_level]++; });
    const cap = await getOrCreateDayCapacity(req.user._id, today);
    res.json({
      total: appts.length,
      today: appts.filter(a => a.date === today).length,
      completed: completed.length,
      noShows: appts.filter(a => a.status === 'no-show').length,
      cancelRate: appts.length > 0 ? Math.round((appts.filter(a => a.status?.includes('cancelled')).length / appts.length) * 100) : 0,
      critical, weeklyTrend, severityDist: sev,
      capacity: { max: cap.calculatedCapacity, used: cap.usedSlots, emergency: cap.emergencySlots, emergencyUsed: cap.emergencyUsed },
      recentCompleted: completed.slice(-3).reverse(),
      upcoming: appts.filter(a => ['pending','confirmed'].includes(a.status) && a.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/doctors/availability
router.put('/availability', protect, doctorOnly, async (req, res) => {
  try {
    const doc = await User.findByIdAndUpdate(req.user._id, { isAvailable: req.body.isAvailable }, { new: true }).select('-password');
    res.json({ message: 'Updated', isAvailable: doc.isAvailable });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/doctors/late-status
router.put('/late-status', protect, doctorOnly, async (req, res) => {
  try {
    const { isRunningLate, lateByMinutes = 0 } = req.body;
    const doc = await User.findByIdAndUpdate(req.user._id, { isRunningLate, lateByMinutes }, { new: true }).select('-password');
    const today = new Date().toISOString().slice(0, 10);
    if (isRunningLate) {
      const pending = await Appointment.find({ doctor: req.user._id, date: today, status: { $in: ['pending','confirmed'] } });
      for (const a of pending) {
        await Notification.create({ user: a.patient, title: 'Doctor Running Late', message: `Dr. ${doc.name} is running ${lateByMinutes} min late`, type: 'late_running', relatedId: a._id });
      }
      await recalculateQueue(req.user._id, today);
    }
    res.json({ message: 'Status updated', doctor: doc });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/doctors/fees/:id  — FIXED: was dead code after module.exports
router.get('/fees/:id', async (req, res) => {
  try {
    const doc = await User.findById(req.params.id).select('name specialization consultationFee followUpFee emergencyFee currency avgConsultTime');
    if (!doc) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/doctors/capacity/:date
router.get('/capacity/:date', protect, doctorOnly, async (req, res) => {
  try {
    res.json(await getOrCreateDayCapacity(req.user._id, req.params.date));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/doctors/:id  — MUST be last to avoid matching /analytics, /fees, etc.
router.get('/:id', async (req, res) => {
  try {
    const doc = await User.findById(req.params.id).select('-password');
    if (!doc || doc.role !== 'doctor') return res.status(404).json({ message: 'Doctor not found' });
    const today = new Date().toISOString().slice(0, 10);
    const cap = await getOrCreateDayCapacity(doc._id, today);
    res.json({ ...doc.toObject(), capacity: cap });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
