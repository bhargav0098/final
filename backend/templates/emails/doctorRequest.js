const b = require('./base');
module.exports = ({ doctorName, specialization, experience, licenseNumber, email, phone='' }) =>
b('New Doctor Request', `<h2>New Doctor Registration Request 👨‍⚕️</h2>
<p>A new doctor has applied to join the MediQueueAI platform and requires admin review.</p>
<div class="box">
<div class="row"><span class="lbl">Name</span><span class="val">${doctorName}</span></div>
<div class="row"><span class="lbl">Specialization</span><span class="val">${specialization}</span></div>
<div class="row"><span class="lbl">Experience</span><span class="val">${experience} years</span></div>
<div class="row"><span class="lbl">License</span><span class="val">${licenseNumber}</span></div>
<div class="row"><span class="lbl">Email</span><span class="val">${email}</span></div>
${phone?`<div class="row"><span class="lbl">Phone</span><span class="val">${phone}</span></div>`:''}
</div>`,
'Review in Admin Dashboard', `${process.env.FRONTEND_URL||'http://localhost:5173'}/admin`);
