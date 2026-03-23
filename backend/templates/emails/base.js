const base = (title, content, cta='', ctaLink='') => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif}
.w{max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
.hd{background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:28px 36px;text-align:center}
.hd h1{color:#fff;margin:0;font-size:22px}.hd p{color:#bfdbfe;margin:4px 0 0;font-size:12px}
.bd{padding:32px 36px}.bd h2{color:#1e3a8a;font-size:18px;margin:0 0 14px}
.bd p{color:#374151;line-height:1.7;margin:0 0 12px;font-size:14px}
.box{background:#f0f9ff;border-left:4px solid #3b82f6;border-radius:8px;padding:14px 18px;margin:16px 0}
.row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px}
.lbl{color:#6b7280;font-weight:500}.val{color:#111827;font-weight:600}
.cta{display:inline-block;background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff!important;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:16px 0}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
.em{background:#fee2e2;color:#991b1b}.hi{background:#fffbeb;color:#92400e}
.me{background:#dbeafe;color:#1e40af}.lo{background:#dcfce7;color:#166534}
.warn{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:12px 0;color:#991b1b;font-size:13px}
.ft{background:#f8fafc;padding:20px 36px;text-align:center;border-top:1px solid #e5e7eb}
.ft p{color:#9ca3af;font-size:11px;margin:3px 0}.ft a{color:#3b82f6;text-decoration:none}
</style></head><body><div class="w">
<div class="hd"><h1>MediQueueAI</h1><p>Smart Hospital Management System</p></div>
<div class="bd">${content}${cta&&ctaLink?`<div style="text-align:center"><a href="${ctaLink}" class="cta">${cta}</a></div>`:''}</div>
<div class="ft"><p>Automated message from <strong>MediQueueAI Hospital System</strong></p>
<p>Need help? <a href="mailto:${process.env.ADMIN_EMAIL||'support@mediqueueai.com'}">Contact Support</a></p>
<p style="color:#d1d5db;font-size:10px;margin-top:6px">© 2025 MediQueueAI · All rights reserved</p></div>
</div></body></html>`;
module.exports = base;
