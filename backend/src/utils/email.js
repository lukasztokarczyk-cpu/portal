const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[EMAIL] BRAK zmiennych EMAIL_USER / EMAIL_PASS na Render!');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  transporter.verify((err, ok) => {
    if (err) console.error('[EMAIL] SMTP verify error:', err.message, err.code);
    else console.log('[EMAIL] SMTP połączono pomyślnie ✓', process.env.EMAIL_USER);
  });

  return transporter;
}

async function sendMail(subject, html) {
  const t = getTransporter();
  if (!t) return;

  const to = process.env.NOTIFY_EMAIL || 'lukasz.tokarczyk@gmail.com';
  console.log(`[EMAIL] Wysyłam do: ${to} | temat: ${subject}`);

  try {
    const info = await t.sendMail({
      from: `"Strefa Pary Młodej" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log('[EMAIL] Wysłano ✓ messageId:', info.messageId);
  } catch (err) {
    console.error('[EMAIL] Błąd wysyłki:', err.message, '| code:', err.code, '| response:', err.response);
    transporter = null; // reset — spróbuje połączyć ponownie
  }
}

exports.sendMessageNotification = async ({ senderName, senderRole, coupleName, content }) => {
  const roleLabel = senderRole === 'couple' ? 'Para Młoda' : senderRole === 'coordinator' ? 'Koordynator' : 'Administrator';
  const portalUrl = process.env.FRONTEND_URL || 'https://portal-five-lac.vercel.app';

  await sendMail(
    `💬 Nowa wiadomość — ${coupleName || 'Para Młoda'}`,
    `
    <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;padding:24px;background:#f8f6f3;">
      <div style="background:#fff;border:1px solid #e4e0da;border-radius:4px;padding:24px;">
        <h2 style="margin:0 0 4px;font-size:18px;color:#1c1a17;">Nowa wiadomość</h2>
        <p style="margin:0 0 16px;font-size:13px;color:#9a9590;">${roleLabel} ${coupleName ? `• ${coupleName}` : ''} — ${senderName}</p>
        <div style="background:#f8f6f3;border-left:3px solid #b08a50;padding:14px 16px;border-radius:0 4px 4px 0;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#1c1a17;line-height:1.6;">${content}</p>
        </div>
        <a href="${portalUrl}/chat" style="display:inline-block;padding:12px 24px;background:#1c1a17;color:#f0ebe0;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;border-radius:2px;">
          Odpowiedz w portalu →
        </a>
      </div>
    </div>
    `
  );
};

exports.sendNapkinNotification = async ({ coupleName, napkinColor, napkinLink, napkinNotes }) => {
  const portalUrl = process.env.FRONTEND_URL || 'https://portal-five-lac.vercel.app';

  await sendMail(
    `🎀 Wybór serwetek — ${coupleName || 'Para Młoda'}`,
    `
    <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;padding:24px;background:#f8f6f3;">
      <div style="background:#fff;border:1px solid #e4e0da;border-radius:4px;padding:24px;">
        <h2 style="margin:0 0 4px;font-size:18px;color:#1c1a17;">Wybór koloru serwetek</h2>
        <p style="margin:0 0 16px;font-size:13px;color:#9a9590;">${coupleName || 'Para Młoda'}</p>
        <div style="background:#f8f6f3;border-left:3px solid #b08a50;padding:16px;border-radius:0 4px 4px 0;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:20px;color:#1c1a17;">🎀 ${napkinColor}</p>
          ${napkinLink ? `<p style="margin:4px 0 0;"><a href="${napkinLink}" style="color:#b08a50;font-size:12px;">🔗 Zobacz inspirację</a></p>` : ''}
          ${napkinNotes ? `<p style="margin:8px 0 0;font-size:12px;color:#9a9590;font-style:italic;">💬 ${napkinNotes}</p>` : ''}
        </div>
        <a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#1c1a17;color:#f0ebe0;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;border-radius:2px;">
          Otwórz portal →
        </a>
      </div>
    </div>
    `
  );
};
