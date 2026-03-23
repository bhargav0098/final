require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in backend/.env');
    console.error('   Copy backend/.env.example to backend/.env and fill in your MongoDB Atlas URI');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (e) {
    console.error('❌ Could not connect to MongoDB:', e.message);
    console.error('   Check your MONGODB_URI in backend/.env');
    process.exit(1);
  }

  const User = require('./models/User');

  const demoEmails = [
    'admin@mediscanai.com',
    'doctor@demo.com',
    'doctor2@demo.com',
    'doctor3@demo.com',
    'patient@demo.com',
    'patient2@demo.com',
  ];

  const removed = await User.deleteMany({ email: { $in: demoEmails } });
  console.log(`🗑  Removed ${removed.deletedCount} old demo accounts`);

  const demos = [
    { name: 'System Admin', email: 'admin@mediscanai.com', password: 'Admin@12345', role: 'admin', status: 'approved', age: 35, gender: 'Male' },
    {
      name: 'Dr. Sarah Johnson', email: 'doctor@demo.com', password: 'Doctor@123',
      role: 'doctor', status: 'approved', specialization: 'Cardiology',
      licenseNumber: 'MED-CARD-001', experience: 12, age: 40, gender: 'Female',
      workingHoursStart: '09:00', workingHoursEnd: '17:00',
      avgConsultTime: 15, breakTime: 60, dailyCapacity: 25, emergencyBufferSlots: 3,
      qualifications: 'MBBS, MD Cardiology', department: 'Cardiology', isAvailable: true,
      consultationFee: 150, followUpFee: 80, emergencyFee: 300, currency: 'USD',
      bio: 'Experienced cardiologist with 12 years in cardiac care.',
    },
    {
      name: 'Dr. Raj Patel', email: 'doctor2@demo.com', password: 'Doctor@123',
      role: 'doctor', status: 'approved', specialization: 'General Medicine',
      licenseNumber: 'MED-GM-002', experience: 8, age: 36, gender: 'Male',
      workingHoursStart: '08:00', workingHoursEnd: '16:00',
      avgConsultTime: 12, breakTime: 45, dailyCapacity: 30, emergencyBufferSlots: 3,
      qualifications: 'MBBS, MD', department: 'General Medicine', isAvailable: true,
      consultationFee: 100, followUpFee: 60, emergencyFee: 200, currency: 'USD',
    },
    {
      name: 'Dr. Priya Sharma', email: 'doctor3@demo.com', password: 'Doctor@123',
      role: 'doctor', status: 'approved', specialization: 'Pediatrics',
      licenseNumber: 'MED-PED-003', experience: 6, age: 34, gender: 'Female',
      workingHoursStart: '10:00', workingHoursEnd: '18:00',
      avgConsultTime: 20, breakTime: 60, dailyCapacity: 18, emergencyBufferSlots: 2,
      qualifications: 'MBBS, MD Pediatrics', department: 'Pediatrics', isAvailable: true,
      consultationFee: 120, followUpFee: 70, emergencyFee: 250, currency: 'USD',
    },
    { name: 'John Patient', email: 'patient@demo.com', password: 'Patient@123', role: 'patient', status: 'approved', age: 28, gender: 'Male', phone: '+1-555-0100', bloodGroup: 'O+', medicalHistory: ['Hypertension', 'Diabetes Type 2'], allergies: ['Penicillin'] },
    { name: 'Mary Smith', email: 'patient2@demo.com', password: 'Patient@123', role: 'patient', status: 'approved', age: 65, gender: 'Female', phone: '+1-555-0200', bloodGroup: 'A+', medicalHistory: ['Asthma', 'Heart Disease'], allergies: ['Aspirin'] },
  ];

  for (const u of demos) {
    await User.create(u);
    console.log(`  ✅ ${u.role.padEnd(7)}  ${u.email}`);
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:     admin@mediscanai.com  /  Admin@12345');
  console.log('Doctor 1:  doctor@demo.com       /  Doctor@123');
  console.log('Doctor 2:  doctor2@demo.com      /  Doctor@123');
  console.log('Doctor 3:  doctor3@demo.com      /  Doctor@123');
  console.log('Patient 1: patient@demo.com      /  Patient@123');
  console.log('Patient 2: patient2@demo.com     /  Patient@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
