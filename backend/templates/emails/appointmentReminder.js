const b = require('./base');
module.exports = ({ patientName, doctorName, date, time, ticketNumber, queuePosition, estimatedWait }) =>
b('Appointment Reminder', `<h2>⏰ Appointment Reminder</h2>
<p>Dear <strong>${patientName}</strong>, this is a reminder for your upcoming appointment.</p>
<div class="box">
<div class="row"><span class="lbl">Doctor</span><span class="val">Dr. ${doctorName}</span></div>
<div class="row"><span class="lbl">Date</span><span class="val">${date}</span></div>
<div class="row"><span class="lbl">Time</span><span class="val">${time||'TBD'}</span></div>
${queuePosition?`<div class="row"><span class="lbl">Queue Position</span><span class="val">#${queuePosition}</span></div>`:''}
${estimatedWait!==undefined?`<div class="row"><span class="lbl">Est. Wait</span><span class="val">~${estimatedWait} min</span></div>`:''}
<div class="row"><span class="lbl">Ticket</span><span class="val">${ticketNumber}</span></div>
</div>
<p>Please arrive 10 minutes before your scheduled time with a valid ID.</p>`,
'Check Queue Status', `${process.env.FRONTEND_URL||'http://localhost:5173'}/my-appointments`);
