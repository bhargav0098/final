require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const connectDB = require('./config/db');

const app = express();

// ─── CORS MUST BE FIRST ────────────────────────────────────────────────────
// Fixes 405 Method Not Allowed on OPTIONS preflight requests
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    // Allow all in development
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Explicit OPTIONS handler for all routes (preflight)
app.options('*', cors());

// ─── BODY PARSERS ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── LAZY DB (serverless-safe) ─────────────────────────────────────────────
let dbConnected = false;
app.use(async (req, res, next) => {
  try {
    if (!dbConnected) {
      await connectDB();
      dbConnected = true;
    }
    next();
  } catch (err) {
    res.status(503).json({ message: 'Database unavailable', error: err.message });
  }
});

// ─── ROUTES ────────────────────────────────────────────────────────────────
const apptRoutes = require('./routes/appointments');
if (typeof apptRoutes.setIO === 'function') apptRoutes.setIO(null);

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MediQueueAI backend is running',
    version: '7.0.0',
  });
});

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/appointments',  apptRoutes);
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/doctors',       require('./routes/doctors'));
app.use('/api/patients',      require('./routes/patients'));
app.use('/api/ai',            require('./routes/ai'));
app.use('/api/queue',         require('./routes/queue'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/users',         require('./routes/users'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '7.0.0',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ─── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.originalUrl });
});

// ─── ERROR HANDLER ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

module.exports = app;
