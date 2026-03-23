const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const Notification = require('../models/Notification');
const { queueEmail }        = require('../services/emailService');
const { protect, adminOnly } = require('../middleware/auth');
const registeredTpl     = require('../templates/emails/userRegistered');
const doctorReqTpl      = require('../templates/emails/doctorRequest');
const doctorApprovedTpl = require('../templates/emails/doctorApproved');
const doctorRejectedTpl = require('../templates/emails/doctorRejected');

const sign = (id) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set');
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ── POST /api/auth/register ──────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, role,
      specialization, licenseNumber, experience,
      phone, age, gender, qualifications, department,
    } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists)
      return res.status(400).json({ message: 'An account with this email already exists' });

    const assignedRole = role === 'doctor' ? 'doctor' : role === 'admin' ? 'admin' : 'patient';

    if (assignedRole === 'doctor') {
      if (!specialization) return res.status(400).json({ message: 'Specialization is required' });
      if (!licenseNumber)  return res.status(400).json({ message: 'License number is required' });
    }

    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone || '',
      age: parseInt(age) || 25,
      gender: gender || 'Male',
      role: assignedRole,
      status: assignedRole === 'doctor' ? 'pending' : 'approved',
    };

    if (assignedRole === 'doctor') {
      Object.assign(userData, { specialization, licenseNumber, experience: parseInt(experience) || 0, qualifications: qualifications || '', department: department || '' });
    }

    const user = await User.create(userData);

    setImmediate(async () => {
      try {
        if (assignedRole !== 'doctor') {
          queueEmail(user.email, 'Welcome to MediQueueAI', registeredTpl({ name: user.name, email: user.email, role: user.role }), 'registration', user._id);
          await Notification.create({ user: user._id, title: 'Welcome!', message: 'Account created successfully. Welcome to MediQueueAI!', type: 'registration' });
        }
        if (assignedRole === 'doctor' && process.env.ADMIN_EMAIL) {
          queueEmail(process.env.ADMIN_EMAIL, 'New Doctor Registration', doctorReqTpl({ doctorName: name, specialization, experience, licenseNumber, email, phone }), 'doctor_request', user._id);
        }
      } catch (_) {}
    });

    const token = sign(user._id);
    res.status(201).json({
      message: assignedRole === 'doctor' ? 'Application submitted. Awaiting admin approval.' : 'Registration successful',
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, specialization: user.specialization },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    if (user.role === 'doctor' && user.status !== 'approved')
      return res.status(403).json({ message: user.status === 'pending' ? 'Your account is pending admin approval' : 'Your account has not been approved' });

    if (user.isBlocked)
      return res.status(403).json({ message: 'Your account has been blocked. Contact admin.' });

    setImmediate(async () => {
      try {
        await Notification.create({ user: user._id, title: 'Login Alert', message: `New login at ${new Date().toLocaleString()}`, type: 'login_alert' });
      } catch (_) {}
    });

    res.json({
      message: 'Login successful',
      token: sign(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status, specialization: user.specialization, dailyCapacity: user.dailyCapacity, fatigueScore: user.fatigueScore, isRunningLate: user.isRunningLate, isAvailable: user.isAvailable },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/auth/profile ────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = ['name','phone','age','gender','bloodGroup','address','avgConsultTime','breakTime','workingHoursStart','workingHoursEnd','qualifications','department','medicalHistory','allergies'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/auth/change-password ────────────────────────────────────────
// FIXED: was after module.exports (dead code) in original
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both current and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    if (!(await user.comparePassword(currentPassword)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/auth/doctors/:id/approve  (admin only) ─────────────────────
router.put('/doctors/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const doctor = await User.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true }).select('-password');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    queueEmail(doctor.email, 'Application Approved', doctorApprovedTpl({ doctorName: doctor.name, specialization: doctor.specialization }), 'doctor_approved', doctor._id);
    await Notification.create({ user: doctor._id, title: 'Application Approved!', message: 'Your doctor application has been approved. You can now log in.', type: 'doctor_approved' });
    res.json({ message: 'Doctor approved', doctor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/auth/doctors/:id/reject  (admin only) ──────────────────────
router.put('/doctors/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const { reason = 'Does not meet requirements' } = req.body;
    const doctor = await User.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true }).select('-password');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    queueEmail(doctor.email, 'Application Update', doctorRejectedTpl({ doctorName: doctor.name, reason }), 'doctor_rejected', doctor._id);
    await Notification.create({ user: doctor._id, title: 'Application Update', message: `Not approved: ${reason}`, type: 'doctor_rejected' });
    res.json({ message: 'Doctor rejected', doctor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
