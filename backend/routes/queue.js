const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { getLiveQueue, getHospitalQueue, recalculateQueue } = require('../services/queueManager');
const Appointment = require('../models/Appointment');

// GET /api/queue/hospital?date=YYYY-MM-DD — all queues (admin/doctor)
router.get('/hospital', protect, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0,10);
    const queue = await getHospitalQueue(date);
    res.json(queue);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/queue/doctor/:doctorId?date= — single doctor queue
router.get('/doctor/:doctorId', protect, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0,10);
    const queue = await getLiveQueue(req.params.doctorId, date);
    res.json(queue);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/queue/patient/my?date= — patient's own queue position
router.get('/patient/my', protect, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0,10);
    const appts = await Appointment.find({
      patient: req.user._id, date,
      status: { $in: ['pending','confirmed','rescheduled_by_ai','rescheduled_by_doctor'] },
    })
      .populate('doctor','name specialization avgConsultTime isRunningLate lateByMinutes')
      .sort({ queuePosition: 1 });
    res.json(appts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/queue/recalculate/:doctorId — manual recalc
router.post('/recalculate/:doctorId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && String(req.user._id) !== req.params.doctorId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const date = req.body.date || new Date().toISOString().slice(0,10);
    const count = await recalculateQueue(req.params.doctorId, date);
    res.json({ message: `Queue recalculated — ${count} appointments updated` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/queue/stats — status counters for admin
router.get('/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const since = new Date(Date.now() - 30*24*60*60*1000);
    const appts  = await Appointment.find({ createdAt: { $gte: since } });
    const counts = {};
    const statuses = ['pending','confirmed','completed','rejected','cancelled_by_patient','cancelled_by_doctor','rescheduled_by_doctor','rescheduled_by_ai','no-show'];
    for (const s of statuses) counts[s] = appts.filter(a => a.status === s).length;
    res.json({ counts, total: appts.length, period: '30 days' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
