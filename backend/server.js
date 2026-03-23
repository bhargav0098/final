require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
];

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
});

// Wire socket.io into routes that need it
const apptRoutes = require('./routes/appointments');
if (typeof apptRoutes.setIO === 'function') apptRoutes.setIO(io);

const { setIO: qmSetIO, recalculateQueue, broadcastHospitalQueue } = require('./services/queueManager');
qmSetIO(io);

// Socket events
io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(`user:${userId}`));
  socket.on('join_admin', () => socket.join('admin_room'));
  socket.on('join_doctor', (doctorId) => {
    socket.join(`doctor:${doctorId}`);
    socket.join(`user:${doctorId}`);
  });
  socket.on('join_live_queue', ({ doctorId, date }) => {
    if (doctorId && date) socket.join(`livequeue:${doctorId}:${date}`);
    socket.join(`livequeue:all:${date || new Date().toISOString().slice(0, 10)}`);
  });
  socket.on('disconnect', () => console.log(`🔌 Disconnected: ${socket.id}`));
});

// Cron jobs
const Appointment = require('./models/Appointment');
const Notification = require('./models/Notification');
const User = require('./models/User');
const DoctorCapacity = require('./models/DoctorCapacity');
const { queueEmail } = require('./services/emailService');
const reminderTpl = require('./templates/emails/appointmentReminder');
const noShowTpl = require('./templates/emails/noShow');

cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const appts = await Appointment.find({
      date: today,
      status: { $in: ['pending', 'confirmed'] },
      reminderSent: { $ne: true },
    })
      .populate('patient', 'name email')
      .populate('doctor', 'name');

    let sent = 0;

    for (const a of appts) {
      const [h, m] = (a.time || '09:00').split(':').map(Number);
      const apptTime = new Date();
      apptTime.setHours(h, m, 0, 0);
      const diff = apptTime - now;

      if (diff > 0 && diff <= 3600000) {
        a.reminderSent = true;
        await a.save();

        queueEmail(
          a.patient?.email,
          `⏰ Reminder: Appointment in ~${Math.round(diff / 60000)} min`,
          reminderTpl({
            patientName: a.patient?.name,
            doctorName: a.doctor?.name,
            date: a.date,
            time: a.time,
            ticketNumber: a.ticketNumber,
            queuePosition: a.queuePosition,
            estimatedWait: a.estimatedWaitMinutes,
          }),
          'reminder',
          a._id
        );

        sent++;
      }
    }

    if (sent) console.log(`⏰ Reminders sent: ${sent}`);
  } catch (e) {
    console.error('reminder cron:', e.message);
  }
});

cron.schedule('*/30 8-20 * * *', async () => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const threshold = new Date(now - 45 * 60 * 1000);

    const candidates = await Appointment.find({
      status: { $in: ['pending', 'confirmed'] },
      date: today,
    })
      .populate('patient', 'name email')
      .populate('doctor', 'name');

    let count = 0;

    for (const a of candidates) {
      const [h, m] = (a.time || '09:00').split(':').map(Number);
      const apptTime = new Date();
      apptTime.setHours(h, m, 0, 0);

      if (apptTime < threshold) {
        a.status = 'no-show';
        a.statusHistory.push({
          status: 'no-show',
          changedByRole: 'system',
          timestamp: new Date(),
          reason: 'Auto-detected: Patient did not arrive within 45 minutes',
        });

        await a.save();
        count++;

        const n = await Notification.create({
          user: a.doctor._id,
          title: 'No-Show',
          message: `Patient ${a.patient?.name} did not arrive`,
          type: 'no_show',
          relatedId: a._id,
        });

        io.to(`user:${a.doctor._id}`).emit('notification', n);

        queueEmail(
          a.patient?.email,
          'Missed Appointment Notice',
          noShowTpl({
            patientName: a.patient?.name,
            doctorName: a.doctor?.name,
            date: a.date,
            time: a.time,
            ticketNumber: a.ticketNumber,
          }),
          'no_show',
          a._id
        );
      }
    }

    if (count) console.log(`⚠️ No-shows: ${count}`);
  } catch (e) {
    console.error('no-show cron:', e.message);
  }
});

cron.schedule('*/5 * * * *', async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const doctors = await User.find({ role: 'doctor', status: 'approved' });

    for (const doc of doctors) {
      const count = await recalculateQueue(doc._id, today);
      if (count > 0) broadcastHospitalQueue(today);
    }
  } catch (e) {
    console.error('queue cron:', e.message);
  }
});

cron.schedule('0 21 * * *', async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const caps = await DoctorCapacity.find({ date: today });

    for (const cap of caps) {
      const pct = Math.round((cap.usedSlots / Math.max(cap.calculatedCapacity, 1)) * 100);

      if (pct > 90) {
        await User.findByIdAndUpdate(cap.doctor, { fatigueScore: pct });

        const n = await Notification.create({
          user: cap.doctor,
          title: '😓 Fatigue Alert',
          message: `You saw ${pct}% capacity today.`,
          type: 'fatigue_alert',
        });

        io.to(`user:${cap.doctor}`).emit('notification', n);
      }
    }
  } catch (e) {
    console.error('fatigue cron:', e.message);
  }
});

cron.schedule('0 0 * * *', async () => {
  try {
    await User.updateMany({ role: 'doctor' }, { todayBookingCount: 0 });
    console.log('✅ Daily reset');
  } catch (e) {
    console.error('reset cron:', e.message);
  }
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\nMediQueueAI V7 running on port ${PORT}`);
    console.log(`📡 WebSocket | 🤖 AI Triage | 📋 Live Queue | 💊 Prescriptions`);
  });
});

module.exports = server;
