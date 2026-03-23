const express = require('express');
const router  = express.Router();
const Appointment = require('../models/Appointment');
const { protect } = require('../middleware/auth');

router.get('/analytics', protect, async (req,res) => {
  try {
    const appts=await Appointment.find({ patient:req.user._id }).populate('doctor','name specialization').sort({ createdAt:-1 });
    const today=new Date().toISOString().slice(0,10);
    const sev={ LOW:0,MEDIUM:0,HIGH:0,EMERGENCY:0 };
    appts.forEach(a=>{ if(sev[a.priority_level]!==undefined) sev[a.priority_level]++; });
    const completed=appts.filter(a=>a.status==='completed');
    const healthTrend=completed.slice(-10).map((a,i)=>({
      visit:i+1,date:a.date,score:{ LOW:1,MEDIUM:2,HIGH:3,EMERGENCY:4 }[a.priority_level]||1,
      level:a.priority_level,doctor:a.doctor?.name
    }));
    let suggestion='Health stable. Continue routine check-ups.';
    if (sev.EMERGENCY>=1||sev.HIGH>=3) suggestion='High risk pattern detected. Please consult a specialist soon.';
    else if (sev.HIGH>=1) suggestion='Monitor your health closely. Schedule a follow-up.';
    else if (sev.MEDIUM>=3) suggestion='Moderate issues detected. Consider a detailed examination.';
    const lastSev=appts[0]?.priority_level;
    const nextVisit=new Date(Date.now()+(['HIGH','EMERGENCY'].includes(lastSev)?14:30)*86400000).toISOString().slice(0,10);
    res.json({ total:appts.length,completed:completed.length,cancelled:appts.filter(a=>a.status?.includes('cancelled')).length,
      severity:sev,healthTrend,suggestion,nextSuggestedVisit:nextVisit,
      recent:appts.slice(0,5),upcoming:appts.filter(a=>['pending','confirmed'].includes(a.status)&&a.date>=today).slice(0,5) });
  } catch(err) { res.status(500).json({ message:err.message }); }
});

module.exports = router;
