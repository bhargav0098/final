const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  diagnosis:       { type: String, default: '' },
  medicines: [{
    name:     { type: String },
    dosage:   { type: String },
    duration: { type: String },
    notes:    { type: String },
  }],
  instructions:    { type: String, default: '' },
  followUpDate:    { type: String, default: '' },
  followUpNotes:   { type: String, default: '' },
  aiSuggestions:   { type: mongoose.Schema.Types.Mixed },
  issuedAt:        { type: Date, default: Date.now },
  emailSent:       { type: Boolean, default: false },
}, { _id: false });

const apptSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  date:       { type: String, required: true },
  time:       { type: String, default: '09:00' },
  reason:     { type: String, default: '' },
  notes:      { type: String, default: '' },
  department: { type: String, default: 'General Medicine' },
  consultationFee: { type: Number, default: 0 },

  status: {
    type: String,
    enum: [
      'pending','confirmed','rejected',
      'cancelled_by_patient','cancelled_by_doctor',
      'rescheduled_by_doctor','rescheduled_by_ai',
      'completed','no-show',
    ],
    default: 'pending',
  },

  statusHistory: [{
    status:    { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByRole: { type: String },
    timestamp: { type: Date, default: Date.now },
    reason:    { type: String, default: '' },
  }],

  appointmentType: { type: String, enum: ['new','follow-up','emergency'], default: 'new' },

  // AI Triage
  priority_level:       { type: String, enum: ['LOW','MEDIUM','HIGH','EMERGENCY'], default: 'LOW' },
  triageResult:         { type: mongoose.Schema.Types.Mixed },
  queuePosition:        { type: Number, default: 0 },
  dynamicPriorityScore: { type: Number, default: 0 },
  estimatedWaitMinutes: { type: Number, default: 0 },
  estimatedStartTime:   { type: String, default: '' },
  predictedDuration:    { type: Number, default: 15 },

  // Rescheduling
  ai_modified:     { type: Boolean, default: false },
  reschedule_reason:{ type: String, default: '' },
  originalDate:    { type: String, default: '' },
  originalTime:    { type: String, default: '' },

  // Emergency
  isEmergencySlot: { type: Boolean, default: false },

  // Completion
  checkedIn:       { type: Boolean, default: false },
  checkedInAt:     { type: Date },
  completedAt:     { type: Date },
  actualDuration:  { type: Number, default: 0 },
  cancellationReason: { type: String, default: '' },
  doctorNotes:     { type: String, default: '' },

  // Prescription
  prescription: { type: prescriptionSchema, default: null },
  hasPrescription: { type: Boolean, default: false },

  // Reminder
  reminderSent: { type: Boolean, default: false },

}, { timestamps: true });

// Auto ticket number
apptSchema.pre('validate', async function (next) {
  if (!this.ticketNumber) {
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const count   = await mongoose.model('Appointment').countDocuments() + 1;
    this.ticketNumber = `MSAI-${dateStr}-${String(count).padStart(4,'0')}`;
  }
  next();
});

apptSchema.index({ doctor: 1, date: 1 });
apptSchema.index({ patient: 1, date: 1 });
apptSchema.index({ ticketNumber: 1 }, { unique: true });
apptSchema.index({ priority_level: 1, queuePosition: 1 });

module.exports = mongoose.model('Appointment', apptSchema);
