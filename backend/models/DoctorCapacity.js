const mongoose = require('mongoose');
const capSchema = new mongoose.Schema({
  doctor:{ type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  date:  { type:String, required:true },
  calculatedCapacity:{ type:Number, default:20 },
  usedSlots:    { type:Number, default:0 },
  emergencySlots:{ type:Number, default:3 },
  emergencyUsed: { type:Number, default:0 },
  fatigueReduction:{ type:Number, default:0 },
  avgActualConsultTime:{ type:Number, default:15 },
},{ timestamps:true });
capSchema.index({ doctor:1, date:1 }, { unique:true });
module.exports = mongoose.model('DoctorCapacity', capSchema);
