const base = require('./base');
module.exports = ({ patientName, doctorName, specialization, date, diagnosis, medicines, instructions, followUpDate, ticketNumber }) => {
  const medList = (medicines || []).map(m =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600">${m.name}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${m.dosage}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${m.duration}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#6b7280">${m.notes||'—'}</td></tr>`
  ).join('');

  return base('Prescription', `
<h2>💊 Your Prescription</h2>
<p>Dear <strong>${patientName}</strong>, here is your prescription from Dr. ${doctorName}.</p>
<div class="box">
  <div class="row"><span class="lbl">Doctor</span><span class="val">Dr. ${doctorName} — ${specialization}</span></div>
  <div class="row"><span class="lbl">Date</span><span class="val">${date}</span></div>
  <div class="row"><span class="lbl">Ticket</span><span class="val">${ticketNumber}</span></div>
  <div class="row"><span class="lbl">Diagnosis</span><span class="val">${diagnosis || 'See notes'}</span></div>
  ${followUpDate ? `<div class="row"><span class="lbl">Follow-up</span><span class="val">${followUpDate}</span></div>` : ''}
</div>
${medList ? `
<h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#1e3a8a">💊 Medicines Prescribed</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px;background:#f8fafc;border-radius:8px;overflow:hidden">
  <thead><tr style="background:#1e3a8a;color:#fff">
    <th style="padding:10px 12px;text-align:left">Medicine</th>
    <th style="padding:10px 12px;text-align:left">Dosage</th>
    <th style="padding:10px 12px;text-align:left">Duration</th>
    <th style="padding:10px 12px;text-align:left">Notes</th>
  </tr></thead>
  <tbody>${medList}</tbody>
</table>` : ''}
${instructions ? `<div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #10b981;font-size:13px;color:#374151"><strong>Instructions:</strong> ${instructions}</div>` : ''}
<p style="margin-top:16px;font-size:12px;color:#9ca3af">⚠️ Please take medicines as prescribed. Contact your doctor if you experience any side effects.</p>
`, 'Book Follow-up', `${process.env.FRONTEND_URL || 'http://localhost:5173'}/book-appointment`);
};
