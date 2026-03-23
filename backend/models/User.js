const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role:  { type: String, enum: ['admin','doctor','patient'], default: 'patient' },
  phone: { type: String, default: '' },
  age:   { type: Number, default: 25 },
  gender:{ type: String, enum: ['Male','Female','Other'], default: 'Male' },
  bloodGroup: { type: String, default: '' },
  address:    { type: String, default: '' },
  profilePic: { type: String, default: '' },

  // ── Doctor-specific ──────────────────────────
  specialization:    { type: String, default: '' },
  licenseNumber:     { type: String, default: '' },
  experience:        { type: Number, default: 0 },
  workingHoursStart: { type: String, default: '09:00' },
  workingHoursEnd:   { type: String, default: '17:00' },
  avgConsultTime:    { type: Number, default: 15 },    // minutes
  breakTime:         { type: Number, default: 60 },    // minutes/day
  fatigueScore:      { type: Number, default: 0, min: 0, max: 100 },
  dailyCapacity:     { type: Number, default: 20 },
  emergencyBufferSlots: { type: Number, default: 3 },
  isAvailable:       { type: Boolean, default: true },
  isRunningLate:     { type: Boolean, default: false },
  lateByMinutes:     { type: Number, default: 0 },
  qualifications:    { type: String, default: '' },
  department:        { type: String, default: '' },
  bio:               { type: String, default: '' },
  languages:         [{ type: String }],

  // Doctor fee
  consultationFee:   { type: Number, default: 0 },    // in USD/local currency
  followUpFee:       { type: Number, default: 0 },
  emergencyFee:      { type: Number, default: 0 },
  currency:          { type: String, default: 'USD' },

  // Rating
  totalRatings:      { type: Number, default: 0 },
  averageRating:     { type: Number, default: 0 },

  status: { type: String, enum: ['pending','approved','rejected','blocked'], default: 'pending' },

  // ── Patient-specific ─────────────────────────
  medicalHistory:    [{ type: String }],
  allergies:         [{ type: String }],
  isBlocked:         { type: Boolean, default: false },
  bloodType:         { type: String, default: '' },
  emergencyContact:  { type: String, default: '' },

}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (p) {
  return bcrypt.compare(p, this.password);
};

module.exports = mongoose.model('User', userSchema);
