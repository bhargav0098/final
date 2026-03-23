const mongoose = require('mongoose');
const emailLogSchema = new mongoose.Schema({
  recipient:   { type:String, required:true },
  subject:     { type:String, required:true },
  type:        { type:String, required:true },
  relatedId:   { type:mongoose.Schema.Types.ObjectId },
  status:      { type:String, enum:['pending','sent','failed'], default:'pending' },
  retryCount:  { type:Number, default:0 },
  errorMessage:{ type:String, default:'' },
},{ timestamps:true });
module.exports = mongoose.model('EmailLog', emailLogSchema);
