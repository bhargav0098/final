const b = require('./base');
module.exports = ({ patientName, doctorName, date, time, ticketNumber, queuePosition, estimatedWait }) =>
b('Appointment Approved', `<h2>Appointment Approved 🎉</h2>
<p>Dear <strong>${patientName}</strong>, Dr. ${doctorName} has confirmed your appointment.</p>
<div class="box">
<div class="row"><span class="lbl">Doctor</span><span class="val">Dr. ${doctorName}</span></div>
<div class="row"><span class="lbl">Date</span><span class="val">${date}</span></div>
<div class="row"><span class="lbl">Time</span><span class="val">${time||'TBD'}</span></div>
${queuePosition?`<div class="row"><span class="lbl">Queue Position</span><span class="val">#${queuePosition}</span></div>`:''}
${estimatedWait!==undefined?`<div class="row"><span class="lbl">Est. Wait</span><span class="val">~${estimatedWait} minutes</span></div>`:''}
<div class="row"><span class="lbl">Status</span><span class="val"><span class="badge lo">CONFIRMED</span></span></div>
<div class="row"><span class="lbl">Ticket</span><span class="val">${ticketNumber}</span></div>
</div>
<p>Please arrive on time. Bring any relevant medical documents.</p>`,
'Track Queue Position', `${process.env.FRONTEND_URL||'http://localhost:5173'}/my-appointments`);
