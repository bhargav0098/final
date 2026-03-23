const b = require('./base');
module.exports = ({ name, email, role }) =>
b('Welcome', `<h2>Welcome to MediQueueAI!</h2>
<p>Dear <strong>${name}</strong>, your account has been successfully created.</p>
<div class="box">
<div class="row"><span class="lbl">Name</span><span class="val">${name}</span></div>
<div class="row"><span class="lbl">Email</span><span class="val">${email}</span></div>
<div class="row"><span class="lbl">Account Type</span><span class="val" style="text-transform:capitalize">${role}</span></div>
<div class="row"><span class="lbl">Status</span><span class="val"><span class="badge lo">ACTIVE</span></span></div>
</div>
<p>You now have full access to the MediQueueAI hospital management system. Book appointments, track your queue, and manage your health.</p>` ,
'Go to Dashboard', `${process.env.FRONTEND_URL||'http://localhost:5173'}`);
