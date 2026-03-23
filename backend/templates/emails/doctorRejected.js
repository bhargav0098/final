const b = require('./base');
module.exports = ({ doctorName, reason='Application did not meet current requirements.' }) =>
b('Application Status', `<h2>Application Status Update</h2>
<p>Dear Dr. <strong>${doctorName}</strong>, we regret to inform you that your application was not approved at this time.</p>
<div class="box">
<div class="row"><span class="lbl">Status</span><span class="val"><span class="badge em">NOT APPROVED</span></span></div>
<div class="row"><span class="lbl">Reason</span><span class="val">${reason}</span></div>
</div>
<p>If you believe this is an error or wish to appeal, please contact our support team.</p>`,
'Contact Support', `mailto:${process.env.ADMIN_EMAIL||'support@mediqueueai.com'}`);
