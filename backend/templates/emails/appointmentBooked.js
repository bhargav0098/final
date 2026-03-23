const b = require('./base');
module.exports = ({ patientName, doctorName, specialization, date, time, ticketNumber, department, severity, branch='Main Campus' }) =>
b('Appointment Confirmed', `<h2>Appointment Confirmed ✅</h2>
<p>Dear <strong>${patientName}</strong>, your appointment has been successfully booked.</p>
<div class="box">
<div class="row"><span class="lbl">Doctor</span><span class="val">Dr. ${doctorName}</span></div>
<div class="row"><span class="lbl">Department</span><span class="val">${department||specialization}</span></div>
<div class="row"><span class="lbl">Date</span><span class="val">${date}</span></div>
<div class="row"><span class="lbl">Time</span><span class="val">${time||'Doctor will confirm'}</span></div>
<div class="row"><span class="lbl">Branch</span><span class="val">${branch}</span></div>
<div class="row"><span class="lbl">Booking ID</span><span class="val">${ticketNumber}</span></div>
${severity?`<div class="row"><span class="lbl">AI Priority</span><span class="val"><span class="badge ${severity==='EMERGENCY'?'em':severity==='HIGH'?'hi':severity==='MEDIUM'?'me':'lo'}">${severity}</span></span></div>`:''}
</div>
<p>Please arrive <strong>10 minutes early</strong> with your ID and any previous medical reports.</p>`,
'View My Appointments', `${process.env.FRONTEND_URL||'http://localhost:5173'}/my-appointments`);
