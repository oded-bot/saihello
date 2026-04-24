const https = require('https');

const SENDGRID_KEY = process.env.SENDGRID_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@servuswiesn.de';

/**
 * Sendet eine E-Mail über die SendGrid HTTP API (ohne npm-Package).
 */
function sendMail(to, subject, htmlContent) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: EMAIL_FROM, name: 'Servus Wiesn' },
      subject,
      content: [{ type: 'text/html', value: htmlContent }],
    });

    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          console.error('SendGrid Fehler:', res.statusCode, body);
          reject(new Error(`SendGrid ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('SendGrid Request Fehler:', err);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Sendet den 6-stelligen Bestätigungscode per E-Mail.
 */
async function sendVerificationEmail(email, code) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n*** DEV-MODUS: Verifizierungscode für ${email}: ${code} ***\n`);
    return { success: true };
  }
  const subject = 'Servus Wiesn — Dein Bestätigungscode';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="420" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#fd267a,#ff6036);padding:32px 24px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">🎪</div>
              <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Servus Wiesn</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="color:#333;font-size:16px;line-height:1.5;margin:0 0 8px;">
                Willkommen bei Servus Wiesn!
              </p>
              <p style="color:#666;font-size:14px;line-height:1.5;margin:0 0 24px;">
                Gib diesen Code in der App ein, um deine E-Mail-Adresse zu bestätigen:
              </p>
              <!-- Code -->
              <div style="background:#f8f8f8;border:2px dashed #e0e0e0;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#fd267a;font-family:monospace;">
                  ${code}
                </span>
              </div>
              <p style="color:#999;font-size:13px;line-height:1.5;margin:0;">
                Der Code ist <strong>10 Minuten</strong> gültig. Falls du dich nicht registriert hast, ignoriere diese E-Mail einfach.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:16px 28px;border-top:1px solid #f0f0f0;">
              <p style="color:#bbb;font-size:12px;text-align:center;margin:0;">
                Servus Wiesn — Finde deinen Platz auf dem Oktoberfest
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendMail(email, subject, html);
}

module.exports = { sendVerificationEmail };
