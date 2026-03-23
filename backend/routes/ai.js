const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { triagePatient } = require('../services/triageAgent');

// POST /api/ai/triage — standalone triage endpoint
router.post('/triage', protect, async (req, res) => {
  try {
    const { reason = '', description = '', age, medicalHistory = [] } = req.body;
    if (!reason && !description) {
      return res.status(400).json({ message: 'Reason or description required' });
    }
    const result = await triagePatient(
      reason,
      description,
      age || req.user.age || 30,
      medicalHistory
    );
    res.json(result);
  } catch (err) {
    console.error('AI triage error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/ai/health — check if AI service is available
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini: !!process.env.GEMINI_API_KEY,
    triage: 'available',
  });
});

module.exports = router;
