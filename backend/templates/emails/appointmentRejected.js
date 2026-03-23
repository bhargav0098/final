const b = require('./base');
module.exports = ({ patientName, doctorName, date, reason='Schedule unavailable', ticketNumber }) =>
b('Appointment Update', `<h2>Appointment Update</h2>
<p>Dear <strong>${patientName}</strong>, unfortunately your appointment request with Dr. ${doctorName} for <strong>${date}</strong> could not be confirmed.</p>
<div class="box">
<div class="row"><span class="lbl">Ticket</span><span class="val">${ticketNumber}</span></div>
<div class="row"><span class="lbl">Status</span><span class="val"><span class="badge em">REJECTED</span></span></div>
<div class="row"><span class="lbl">Reason</span><span class="val">${reason}</span></div>
</div>
<p>We apologize for the inconvenience. You can book with another available doctor below.</p>`,
'Book New Appointment', `${process.env.FRONTEND_URL||'http://localhost:5173'}/book-appointment`);
