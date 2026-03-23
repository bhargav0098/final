const b = require('./base');
module.exports = ({ patientName, date, time, reason, newWait, ticketNumber }) =>
b('Queue Update', `<h2>⚙️ AI Queue Update – Your Appointment</h2>
<p>Dear <strong>${patientName}</strong>, our AI queue management system has updated your appointment schedule.</p>
<div class="warn">⚠️ An emergency case required immediate priority attention. Your appointment time has been adjusted automatically.</div>
<div class="box">
<div class="row"><span class="lbl">Date</span><span class="val">${date}</span></div>
<div class="row"><span class="lbl">Original Time</span><span class="val">${time||'TBD'}</span></div>
<div class="row"><span class="lbl">New Est. Wait</span><span class="val">~${newWait} minutes</span></div>
<div class="row"><span class="lbl">Status</span><span class="val"><span class="badge hi">AI ADJUSTED</span></span></div>
<div class="row"><span class="lbl">Ticket</span><span class="val">${ticketNumber}</span></div>
<div class="row"><span class="lbl">Reason</span><span class="val">${reason}</span></div>
</div>
<p>We apologize for any inconvenience. The system ensures emergency cases receive immediate care while keeping your appointment secure.</p>`,
'Track Live Queue', `${process.env.FRONTEND_URL||'http://localhost:5173'}/my-appointments`);
