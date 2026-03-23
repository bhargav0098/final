const mongoose = require('mongoose');
const notifSchema = new mongoose.Schema({
  user:    { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  title:   { type:String, required:true },
  message: { type:String, required:true },
  type: {
    type:String,
    enum:['appointment_booked','appointment_confirmed','appointment_rejected','appointment_cancelled',
          'appointment_completed','appointment_rescheduled','emergency','no_show','queue_update',
          'doctor_approved','doctor_rejected','capacity_warning','fatigue_alert','late_running',
          'login_alert','registration','reminder','system'],
    default:'system'
  },
  relatedId:{ type:mongoose.Schema.Types.ObjectId },
  isRead:  { type:Boolean, default:false },
},{ timestamps:true });
module.exports = mongoose.model('Notification', notifSchema);
