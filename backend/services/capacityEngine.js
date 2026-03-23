const User = require('../models/User');
const DoctorCapacity = require('../models/DoctorCapacity');

const calculateDailyCapacity = (doctor, fatiguePct = 0) => {
  const [sh,sm] = (doctor.workingHoursStart||'09:00').split(':').map(Number);
  const [eh,em] = (doctor.workingHoursEnd||'17:00').split(':').map(Number);
  const totalMins   = (eh*60+em) - (sh*60+sm);
  const breakMins   = doctor.breakTime || 60;
  const available   = totalMins - breakMins;
  const avgConsult  = doctor.avgConsultTime || 15;
  let base = Math.floor(available / avgConsult);
  base = Math.floor(base * 0.90); // 10% safety buffer
  if (fatiguePct > 80) base = Math.floor(base * 0.85);
  else if (fatiguePct > 60) base = Math.floor(base * 0.90);
  const emergencySlots = doctor.emergencyBufferSlots || 3;
  return { totalCapacity:base, normalSlots:Math.max(base-emergencySlots,3), emergencySlots, availableMins:available };
};

const getOrCreateDayCapacity = async (doctorId, date) => {
  let cap = await DoctorCapacity.findOne({ doctor:doctorId, date });
  if (cap) return cap;
  const doctor = await User.findById(doctorId);
  if (!doctor) throw new Error('Doctor not found');
  const yDate = new Date(date); yDate.setDate(yDate.getDate()-1);
  const yCap = await DoctorCapacity.findOne({ doctor:doctorId, date:yDate.toISOString().slice(0,10) });
  const fatigue = yCap ? Math.round((yCap.usedSlots/Math.max(yCap.calculatedCapacity,1))*100) : 0;
  const { normalSlots, emergencySlots } = calculateDailyCapacity(doctor, fatigue);
  cap = await DoctorCapacity.create({ doctor:doctorId, date, calculatedCapacity:normalSlots, usedSlots:0, emergencySlots, emergencyUsed:0, fatigueReduction:fatigue>60?fatigue:0 });
  await User.findByIdAndUpdate(doctorId, { dailyCapacity:normalSlots, fatigueScore:fatigue });
  return cap;
};

const isDoctorFull = async (doctorId, date, isEmergency=false) => {
  const cap = await getOrCreateDayCapacity(doctorId, date);
  return isEmergency ? cap.emergencyUsed >= cap.emergencySlots : cap.usedSlots >= cap.calculatedCapacity;
};

const incrementSlot = async (doctorId, date, isEmergency=false) => {
  const cap = await getOrCreateDayCapacity(doctorId, date);
  if (isEmergency) cap.emergencyUsed = (cap.emergencyUsed||0)+1;
  else cap.usedSlots = (cap.usedSlots||0)+1;
  await cap.save(); return cap;
};

const decrementSlot = async (doctorId, date, isEmergency=false) => {
  const cap = await DoctorCapacity.findOne({ doctor:doctorId, date });
  if (!cap) return;
  if (isEmergency) cap.emergencyUsed = Math.max(0,(cap.emergencyUsed||0)-1);
  else cap.usedSlots = Math.max(0,(cap.usedSlots||0)-1);
  await cap.save();
};

const getAlternatives = async (specialization, date, excludeId) => {
  const doctors = await User.find({ role:'doctor', specialization, _id:{$ne:excludeId}, status:'approved', isAvailable:true });
  const results = [];
  for (const doc of doctors) {
    const cap = await getOrCreateDayCapacity(doc._id, date);
    const remaining = cap.calculatedCapacity - cap.usedSlots;
    if (remaining > 0) results.push({ doctor:doc, remainingSlots:remaining, utilizationPct:Math.round((cap.usedSlots/cap.calculatedCapacity)*100) });
  }
  return results.sort((a,b)=>b.remainingSlots-a.remainingSlots);
};

module.exports = { calculateDailyCapacity, getOrCreateDayCapacity, isDoctorFull, incrementSlot, decrementSlot, getAlternatives };
