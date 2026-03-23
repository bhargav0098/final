const base = require('./base');
module.exports = ({ patientName, doctorName, date, time, ticketNumber }) =>
base('Appointment No-Show', `
<h2>⚠️ Missed Appointment Notice</h2>
<p>Dear <strong>${patientName}</strong>, you were marked as no-show for the following appointment.</p>
<div class="box">
  <div class="row"><span class="lbl">Doctor</span><span class="val">Dr. ${doctorName}</span></div>
  <div class="row"><span class="lbl">Date</span><span class="val">${date}</span></div>
  <div class="row"><span class="lbl">Time</span><span class="val">${time || 'TBD'}</span></div>
  <div class="row"><span class="lbl">Ticket</span><span class="val">${ticketNumber}</span></div>
  <div class="row"><span class="lbl">Status</span><span class="val"><span class="badge" style="background:#f3f4f6;color:#6b7280;padding:3px 9px;border-radius:20px;font-size:11px">NO-SHOW</span></span></div>
</div>
<p>If you missed your appointment, please rebook at your earliest convenience. Repeated no-shows may affect your booking privileges.</p>
`, 'Book New Appointment', `${process.env.FRONTEND_URL || 'http://localhost:5173'}/book-appointment`);
