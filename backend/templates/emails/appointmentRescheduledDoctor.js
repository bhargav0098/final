const b = require('./base');
module.exports = ({ patientName, doctorName, oldDate, oldTime, newDate, newTime, reason, ticketNumber }) =>
b('Appointment Rescheduled', `<h2>Your Appointment Has Been Rescheduled</h2>
<p>Dear <strong>${patientName}</strong>, Dr. ${doctorName} has rescheduled your appointment.</p>
<div class="box">
<div class="row"><span class="lbl">Previous Date</span><span class="val" style="text-decoration:line-through;color:#9ca3af">${oldDate} ${oldTime||''}</span></div>
<div class="row"><span class="lbl">New Date</span><span class="val" style="color:#059669">${newDate} ${newTime||''}</span></div>
<div class="row"><span class="lbl">Status</span><span class="val"><span class="badge hi">RESCHEDULED BY DOCTOR</span></span></div>
<div class="row"><span class="lbl">Reason</span><span class="val">${reason||'Doctor scheduling update'}</span></div>
<div class="row"><span class="lbl">Ticket</span><span class="val">${ticketNumber}</span></div>
</div>
<p>If this new time does not work for you, please contact us or cancel and rebook.</p>`,
'View My Appointments', `${process.env.FRONTEND_URL||'http://localhost:5173'}/my-appointments`);
