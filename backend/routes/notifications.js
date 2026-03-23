const express = require('express');
const router  = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
router.get('/', protect, async (req,res) => {
  try {
    const notifs=await Notification.find({ user:req.user._id }).sort({ createdAt:-1 }).limit(30);
    const unread=await Notification.countDocuments({ user:req.user._id,isRead:false });
    res.json({ notifications:notifs,unread });
  } catch(err) { res.status(500).json({ message:err.message }); }
});
router.put('/read-all', protect, async (req,res) => {
  try { await Notification.updateMany({ user:req.user._id,isRead:false },{ isRead:true }); res.json({ message:'Done' }); }
  catch(err) { res.status(500).json({ message:err.message }); }
});
router.put('/:id/read', protect, async (req,res) => {
  try { await Notification.findOneAndUpdate({ _id:req.params.id,user:req.user._id },{ isRead:true }); res.json({ ok:true }); }
  catch(err) { res.status(500).json({ message:err.message }); }
});
module.exports = router;
