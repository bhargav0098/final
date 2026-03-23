const b = require('./base');
module.exports = ({ recipientName, patientName, doctorName, date, time, reason='Cancelled', ticketNumber, isDoctor=false }) =>
b('Appointment Cancelled', `<h2>Appointment Cancelled</h2>
<p>Dear <strong>${recipientName}</strong>,</p>
<p>${isDoctor?`Patient <strong>${patientName}</strong> has cancelled their appointment.`:'Your appointment has been cancelled.'}</p>
<div class="box">
<div class="row"><span class="lbl">Patient</span><span class="val">${patientName}</span></div>
<div class="row"><span class="lbl">Doctor</span><span class="val">Dr. ${doctorName}</span></div>
<div class="row"><span class="lbl">Date</span><span class="val">${date}</span></div>
<div class="row"><span class="lbl">Time</span><span class="val">${time||'TBD'}</span></div>
<div class="row"><span class="lbl">Reason</span><span class="val">${reason}</span></div>
<div class="row"><span class="lbl">Ticket</span><span class="val">${ticketNumber}</span></div>
</div>
${!isDoctor?'<p>You may book a new appointment at any time from the patient portal.</p>':''}`,
isDoctor?'':' Book Again', isDoctor?'': `${process.env.FRONTEND_URL||'http://localhost:5173'}/book-appointment`);
