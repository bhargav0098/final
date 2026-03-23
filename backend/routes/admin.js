const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const Appointment = require('../models/Appointment');
const EmailLog = require('../models/EmailLog');
const Notification = require('../models/Notification');
const DoctorCapacity = require('../models/DoctorCapacity');
const { protect, adminOnly } = require('../middleware/auth');
const { getOrCreateDayCapacity } = require('../services/capacityEngine');
const { queueEmail } = require('../services/emailService');
const doctorApprovedTpl = require('../templates/emails/doctorApproved');
const doctorRejectedTpl = require('../templates/emails/doctorRejected');

router.use(protect, adminOnly);

router.get('/stats', async (req,res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const [td,pd,tp,ta,today_a,pending_a,completed_a,emergency_a] = await Promise.all([
      User.countDocuments({ role:'doctor',status:'approved' }),
      User.countDocuments({ role:'doctor',status:'pending' }),
      User.countDocuments({ role:'patient' }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ date:today }),
      Appointment.countDocuments({ status:'pending' }),
      Appointment.countDocuments({ status:'completed' }),
      Appointment.countDocuments({ priority_level:'EMERGENCY' }),
    ]);
    res.json({ totalDoctors:td,pendingDoctors:pd,totalPatients:tp,totalAppointments:ta,todayAppointments:today_a,pendingAppointments:pending_a,completedAppointments:completed_a,emergencyAppointments:emergency_a });
  } catch(err) { res.status(500).json({ message:err.message }); }
});

router.get('/ai-analytics', async (req,res) => {
  try {
    const since = new Date(Date.now()-30*24*60*60*1000);
    const appts = await Appointment.find({ createdAt:{ $gte:since } }).populate('doctor','name specialization');
    const sev={ LOW:0,MEDIUM:0,HIGH:0,EMERGENCY:0 };
    const stat={ pending:0,confirmed:0,completed:0,rejected:0,cancelled_by_patient:0,rescheduled_by_ai:0,rescheduled_by_doctor:0,'no-show':0 };
    const peakHours=Array(24).fill(0);
    const wordFreq={};
    const doctorMap={};
    const dailyMap={};
    appts.forEach(a=>{
      if(sev[a.priority_level]!==undefined) sev[a.priority_level]++;
      if(stat[a.status]!==undefined) stat[a.status]++;
      const h=parseInt((a.time||'09:00').split(':')[0]);
      if(!isNaN(h)) peakHours[h]++;
      (a.reason||'').split(/\s+/).forEach(w=>{ if(w.length>4) wordFreq[w.toLowerCase()]=(wordFreq[w.toLowerCase()]||0)+1; });
      const dn=a.doctor?.name||'Unknown';
      if(!doctorMap[dn]) doctorMap[dn]={ completed:0,pending:0,cancelled:0,emergency:0 };
      if(a.status==='completed') doctorMap[dn].completed++;
      else if(a.status==='pending') doctorMap[dn].pending++;
      else if(a.status?.includes('cancelled')) doctorMap[dn].cancelled++;
      if(a.priority_level==='EMERGENCY') doctorMap[dn].emergency++;
      const d=a.createdAt?.toISOString().slice(0,10);
      if(d) dailyMap[d]=(dailyMap[d]||0)+1;
    });
    const total=appts.length||1;
    res.json({
      severityBreakdown:sev, statusBreakdown:stat, peakHours,
      cancellationRate:Math.round(((stat.cancelled_by_patient||0)/total)*100),
      noShowRate:Math.round(((stat['no-show']||0)/total)*100),
      aiModifiedRate:Math.round((appts.filter(a=>a.ai_modified).length/total)*100),
      doctorPerformance:Object.entries(doctorMap).map(([name,v])=>({name,...v})).sort((a,b)=>b.completed-a.completed).slice(0,10),
      dailyTrend:Object.entries(dailyMap).sort().slice(-7).map(([date,count])=>({date,count})),
      topSymptoms:Object.entries(wordFreq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([word,count])=>({word,count})),
      totalLast30Days:total,
    });
  } catch(err) { res.status(500).json({ message:err.message }); }
});

router.get('/doctors', async (req,res) => {
  try {
    const { status } = req.query;
    const filter = { role:'doctor' };
    if (status) filter.status=status;
    res.json(await User.find(filter).select('-password'));
  } catch(err) { res.status(500).json({ message:err.message }); }
});

router.put('/doctors/:id/approve', async (req,res) => {
  try {
    const doctor = await User.findByIdAndUpdate(req.params.id,{ status:'approved' },{ new:true }).select('-password');
    if (!doctor) return res.status(404).json({ message:'Not found' });
    queueEmail(doctor.email,'Welcome to Our Hospital Platform',doctorApprovedTpl({ doctorName:doctor.name,specialization:doctor.specialization }),'doctor_approved',doctor._id);
    await Notification.create({ user:doctor._id,title:'Approved!',message:'Your doctor application is approved.',type:'doctor_approved' });
    res.json({ message:'Doctor approved', doctor });
  } catch(err) { res.status(500).json({ message:err.message }); }
});

router.put('/doctors/:id/reject', async (req,res) => {
  try {
    const { reason='Does not meet requirements' } = req.body;
    const doctor = await User.findByIdAndUpdate(req.params.id,{ status:'rejected' },{ new:true }).select('-password');
    if (!doctor) return res.status(404).json({ message:'Not found' });
    queueEmail(doctor.email,'Application Status Update',doctorRejectedTpl({ doctorName:doctor.name,reason }),'doctor_rejected',doctor._id);
    res.json({ message:'Doctor rejected' });
  } catch(err) { res.status(500).json({ message:err.message }); }
});

router.get('/patients', async (req,res) => {
  try { res.json(await User.find({ role:'patient' }).select('-password')); }
  catch(err) { res.status(500).json({ message:err.message }); }
});

router.put('/patients/:id/block', async (req,res) => {
  try {
    const p = await User.findById(req.params.id);
    if (!p) return res.status(404).json({ message:'Not found' });
    p.isBlocked=!p.isBlocked; await p.save();
    res.json({ message:p.isBlocked?'Blocked':'Unblocked', isBlocked:p.isBlocked });
  } catch(err) { res.status(500).json({ message:err.message }); }
});

router.get('/appointments', async (req,res) => {
  try {
    const { date,status,priority } = req.query;
    const filter = {};
    if (date) filter.date=date;
    if (status) filter.status=status;
    if (priority) filter.priority_level=priority;
    const appts = await Appointment.find(filter).populate('patient','name email age').populate('doctor','name specialization').sort({ createdAt:-1 }).limit(300);
    res.json(appts);
  } catch(err) { res.status(500).json({ message:err.message }); }
});

router.get('/capacity', async (req,res) => {
  try {
    const date = req.query.date||new Date().toISOString().slice(0,10);
    const doctors = await User.find({ role:'doctor',status:'approved' }).select('-password');
    const result = [];
    for (const doc of doctors) {
      const cap = await getOrCreateDayCapacity(doc._id,date);
      const pct = Math.round((cap.usedSlots/Math.max(cap.calculatedCapacity,1))*100);
      result.push({ doctor:{ _id:doc._id,name:doc.name,specialization:doc.specialization,fatigueScore:doc.fatigueScore,isRunningLate:doc.isRunningLate,consultationFee:doc.consultationFee||0 },
        date,calculatedCapacity:cap.calculatedCapacity,usedSlots:cap.usedSlots,emergencySlots:cap.emergencySlots,emergencyUsed:cap.emergencyUsed,utilizationPct:pct,
        isOverloaded:pct>=90, remainingSlots:Math.max(cap.calculatedCapacity-cap.usedSlots,0) });
    }
    res.json(result.sort((a,b)=>b.utilizationPct-a.utilizationPct));
  } catch(err) { res.status(500).json({ message:err.message }); }
});

router.post('/detect-no-shows', async (req,res) => {
  try {
    const now=new Date(); const today=now.toISOString().slice(0,10);
    const threshold=new Date(now-45*60*1000);
    const candidates=await Appointment.find({ status:{ $in:['pending','confirmed'] },date:today }).populate('patient','name').populate('doctor','name');
    let count=0;
    for (const a of candidates) {
      const [h,m]=(a.time||'09:00').split(':').map(Number);
      const apptTime=new Date(); apptTime.setHours(h,m,0,0);
      if (apptTime<threshold) {
        a.status='no-show'; await a.save(); count++;
        await Notification.create({ user:a.doctor._id,title:'No-Show',message:`${a.patient.name} did not show up`,type:'no_show',relatedId:a._id });
      }
    }
    res.json({ message:`Detected ${count} no-show(s)`, count });
  } catch(err) { res.status(500).json({ message:err.message }); }
});

router.get('/email-logs', async (req,res) => {
  try { res.json(await EmailLog.find().sort({ createdAt:-1 }).limit(100)); }
  catch(err) { res.status(500).json({ message:err.message }); }
});

router.get('/queue-overview', async (req,res) => {
  try {
    const date = req.query.date||new Date().toISOString().slice(0,10);
    const appts = await Appointment.find({ date, status:{ $in:['pending','confirmed','rescheduled_by_ai','rescheduled_by_doctor'] } })
      .populate('patient','name age').populate('doctor','name specialization').sort({ queuePosition:1 });
    // Group by doctor
    const byDoctor = {};
    for (const a of appts) {
      const dn = a.doctor?.name||'Unknown';
      if (!byDoctor[dn]) byDoctor[dn] = { doctor:a.doctor, patients:[] };
      byDoctor[dn].patients.push(a);
    }
    res.json(Object.values(byDoctor));
  } catch(err) { res.status(500).json({ message:err.message }); }
});

module.exports = router;
