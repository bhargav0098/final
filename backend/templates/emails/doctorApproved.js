const b = require('./base');
module.exports = ({ doctorName, specialization }) =>
b('Welcome Doctor', `<h2>Welcome to MediQueueAI, Dr. ${doctorName}!</h2>
<p>Your application has been <strong>approved</strong>. You now have full access to the doctor portal.</p>
<div class="box">
<div class="row"><span class="lbl">Specialization</span><span class="val">${specialization}</span></div>
<div class="row"><span class="lbl">Status</span><span class="val"><span class="badge lo">APPROVED ✅</span></span></div>
</div>
<p><strong>Getting Started:</strong></p>
<ul style="color:#374151;font-size:14px;line-height:2.2">
<li>Log in with your registered credentials</li>
<li>Complete your doctor profile and working hours</li>
<li>Set your consultation duration and capacity</li>
<li>Start accepting patient appointments</li>
</ul>`,
'Login to Dashboard', `${process.env.FRONTEND_URL||'http://localhost:5173'}/login`);
