const nodemailer = require('nodemailer');
const EmailLog   = require('../models/EmailLog');

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
};

const isEmailConfigured = () =>
  process.env.EMAIL_USER &&
  process.env.EMAIL_USER !== 'yourhospital@gmail.com' &&
  process.env.EMAIL_PASS &&
  process.env.EMAIL_PASS !== 'your_16_char_app_password';

const sendEmail = async (to, subject, html, type = 'system', relatedId = null, attempt = 0) => {
  if (!isEmailConfigured()) {
    console.log(`📧 [EMAIL SKIP - not configured] ${type} → ${to}`);
    return { success: true, skipped: true };
  }
  let log;
  try {
    log = await EmailLog.create({ recipient: to, subject, type, relatedId, status: 'pending', retryCount: attempt });
    await getTransporter().sendMail({ from: process.env.EMAIL_FROM || process.env.EMAIL_USER, to, subject, html });
    await EmailLog.findByIdAndUpdate(log._id, { status: 'sent' });
    console.log(`✅ Email sent: ${type} → ${to}`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Email failed [${type}] → ${to}: ${err.message}`);
    if (log) {
      if (attempt < 3) {
        await EmailLog.findByIdAndUpdate(log._id, { status: 'pending', retryCount: attempt + 1 });
        setTimeout(() => sendEmail(to, subject, html, type, relatedId, attempt + 1), 5000 * (attempt + 1));
      } else {
        await EmailLog.findByIdAndUpdate(log._id, { status: 'failed', errorMessage: err.message });
      }
    }
    return { success: false, error: err.message };
  }
};

const queueEmail = (to, subject, html, type, relatedId) =>
  setImmediate(() => sendEmail(to, subject, html, type, relatedId));

module.exports = { sendEmail, queueEmail, isEmailConfigured };
