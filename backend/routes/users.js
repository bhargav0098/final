const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Appointment = require('../models/Appointment');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/users — all users (admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { specialization: new RegExp(search, 'i') },
      ];
    }
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/:id — single user profile (admin or self)
router.get('/:id', protect, async (req, res) => {
  try {
    const isSelf  = String(req.user._id) === req.params.id;
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Access denied' });

    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Appointment summary
    const apptFilter = user.role === 'doctor'
      ? { doctor: user._id }
      : user.role === 'patient'
      ? { patient: user._id }
      : null;

    let appointmentStats = null;
    if (apptFilter) {
      const appts = await Appointment.find(apptFilter);
      appointmentStats = {
        total: appts.length,
        completed: appts.filter(a => a.status === 'completed').length,
        pending: appts.filter(a => a.status === 'pending').length,
        cancelled: appts.filter(a => a.status?.includes('cancelled')).length,
        emergency: appts.filter(a => a.priority_level === 'EMERGENCY').length,
        recent: appts.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))
          .slice(0,5)
          .map(a => ({
            _id: a._id, ticketNumber: a.ticketNumber, date: a.date,
            status: a.status, priority_level: a.priority_level,
            appointmentType: a.appointmentType, reason: a.reason,
          })),
      };
    }

    res.json({ user, appointmentStats });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/:id — update profile (admin or self)
router.put('/:id', protect, async (req, res) => {
  try {
    const isSelf  = String(req.user._id) === req.params.id;
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Access denied' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fields anyone can update on their own profile
    const selfFields = ['name','phone','age','gender','bloodGroup','address',
      'medicalHistory','allergies','avgConsultTime','breakTime',
      'workingHoursStart','workingHoursEnd','qualifications','department'];

    // Fields only admin can update
    const adminFields = ['status','isAvailable','isBlocked','dailyCapacity',
      'emergencyBufferSlots','specialization'];

    const allowed = isAdmin ? [...selfFields, ...adminFields] : selfFields;
    const updates = {};
    for (const f of allowed) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/:id/status — admin approve/reject/block
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved','rejected','blocked','pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const user = await User.findByIdAndUpdate(req.params.id,
      { status, isBlocked: status === 'blocked' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Send email notification
    const { queueEmail } = require('../services/emailService');
    if (status === 'approved' && user.role === 'doctor') {
      const tpl = require('../templates/emails/doctorApproved');
      queueEmail(user.email, 'Welcome to Our Hospital Platform',
        tpl({ doctorName: user.name, specialization: user.specialization }),
        'doctor_approved', user._id);
    } else if (status === 'rejected' && user.role === 'doctor') {
      const tpl = require('../templates/emails/doctorRejected');
      queueEmail(user.email, 'Application Status Update',
        tpl({ doctorName: user.name, reason: reason || 'Does not meet requirements' }),
        'doctor_rejected', user._id);
    }

    res.json({ message: `User ${status}`, user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/users/:id — admin delete
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/:id/appointments — user's appointments (admin or self)
router.get('/:id/appointments', protect, async (req, res) => {
  try {
    const isSelf  = String(req.user._id) === req.params.id;
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Access denied' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const filter = user.role === 'doctor' ? { doctor: user._id } : { patient: user._id };
    const appts = await Appointment.find(filter)
      .populate('patient', 'name email age gender')
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 }).limit(50);
    res.json(appts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
