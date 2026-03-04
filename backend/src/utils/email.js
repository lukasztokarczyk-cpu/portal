const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // hasło aplikacji Gmail (App Password)
  },
});

/**
 * Wyślij email z powiadomieniem o nowej wiadomości
 */
exports.sendMessageNotification = async ({ senderName, senderRole, coupleName, content, weddingId }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[EMAIL] Brak konfiguracji EMAIL_USER/EMAIL_PASS — pomijam wysyłkę');
    return;
  }

  const roleLabel = senderRole === 'couple' ? 'Para Młoda' : senderRole === 'coordinator' ? 'Koordynator' : 'Administrator';
  const portalUrl = process.env.FRONTEND_URL || 'https://portal-five-lac.vercel.app';

  try {
    await transporter.sendMail({
      from: `"Strefa Pary Młodej" <${process.env.EMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL || 'lukasz.tokarczyk@gmail.com',
      subject: `💬 Nowa wiadomość — ${coupleName || 'Para Młoda'}`,
      html: `
        <div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:0 auto;background:#f8f6f3;padding:32px 24px;border-radius:4px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-family:Georgia,serif;font-size:22px;color:#1c1a17;letter-spacing:2px;">PERŁA PIENIN</div>
            <div style="height:1px;background:linear-gradient(90deg,transparent,#b08a50,transparent);margin:10px auto;width:60%;"></div>
            <div style="font-size:11px;color:#b08a50;letter-spacing:2px;text-transform:uppercase;">Strefa Pary Młodej</div>
          </div>

          <div style="background:#fff;border:1px solid #e4e0da;border-radius:4px;padding:24px;">
            <p style="font-size:13px;color:#9a9590;margin:0 0 6px;letter-spacing:1px;text-transform:uppercase;">Nowa wiadomość od</p>
            <p style="font-size:18px;font-family:Georgia,serif;color:#1c1a17;margin:0 0 4px;">${senderName}</p>
            <p style="font-size:12px;color:#b08a50;margin:0 0 20px;">${roleLabel} ${coupleName ? `• ${coupleName}` : ''}</p>

            <div style="background:#f8f6f3;border-left:3px solid #b08a50;padding:14px 16px;border-radius:0 4px 4px 0;">
              <p style="margin:0;font-size:14px;color:#1c1a17;line-height:1.6;">${content}</p>
            </div>

            <div style="margin-top:24px;text-align:center;">
              <a href="${portalUrl}/chat" style="display:inline-block;padding:12px 28px;background:#1c1a17;color:#f0ebe0;text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;border-radius:2px;position:relative;">
                Odpowiedz w portalu
                <span style="display:block;height:2px;background:#b08a50;position:absolute;bottom:0;left:0;right:0;"></span>
              </a>
            </div>
          </div>

          <p style="text-align:center;font-size:11px;color:#b0aba4;margin-top:20px;">Perła Pienin • Podzagonie 12, Grywałd</p>
        </div>
      `,
    });
    console.log(`[EMAIL] Wysłano powiadomienie do ${process.env.NOTIFY_EMAIL || 'lukasz.tokarczyk@gmail.com'}`);
  } catch (err) {
    console.error('[EMAIL] Błąd wysyłki:', err.message);
  }
};

/**
 * Powiadomienie o wyborze koloru serwetek
 */
exports.sendNapkinNotification = async ({ coupleName, napkinColor, napkinLink, napkinNotes }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  const portalUrl = process.env.FRONTEND_URL || 'https://portal-five-lac.vercel.app';
  try {
    await transporter.sendMail({
      from: `"Strefa Pary Młodej" <${process.env.EMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL || 'lukasz.tokarczyk@gmail.com',
      subject: `🎀 Wybór serwetek — ${coupleName || 'Para Młoda'}`,
      html: `
        <div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:0 auto;background:#f8f6f3;padding:32px 24px;border-radius:4px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-family:Georgia,serif;font-size:22px;color:#1c1a17;letter-spacing:2px;">PERŁA PIENIN</div>
            <div style="height:1px;background:linear-gradient(90deg,transparent,#b08a50,transparent);margin:10px auto;width:60%;"></div>
            <div style="font-size:11px;color:#b08a50;letter-spacing:2px;text-transform:uppercase;">Strefa Pary Młodej</div>
          </div>
          <div style="background:#fff;border:1px solid #e4e0da;border-radius:4px;padding:24px;">
            <p style="font-size:13px;color:#9a9590;margin:0 0 6px;letter-spacing:1px;text-transform:uppercase;">Wybór serwetek</p>
            <p style="font-size:18px;font-family:Georgia,serif;color:#1c1a17;margin:0 0 20px;">${coupleName || 'Para Młoda'}</p>
            <div style="background:#f8f6f3;border-left:3px solid #b08a50;padding:16px;border-radius:0 4px 4px 0;margin-bottom:16px;">
              <p style="margin:0 0 8px;font-size:13px;color:#9a9590;">Wybrany kolor:</p>
              <p style="margin:0;font-size:20px;font-family:Georgia,serif;color:#1c1a17;">🎀 ${napkinColor}</p>
              ${napkinLink ? `<p style="margin:8px 0 0;font-size:12px;"><a href="${napkinLink}" style="color:#b08a50;">🔗 Zobacz inspirację →</a></p>` : ''}
              ${napkinNotes ? `<p style="margin:8px 0 0;font-size:12px;color:#9a9590;font-style:italic;">💬 ${napkinNotes}</p>` : ''}
            </div>
            <div style="text-align:center;">
              <a href="${portalUrl}" style="display:inline-block;padding:12px 28px;background:#1c1a17;color:#f0ebe0;text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;border-radius:2px;">
                Otwórz portal →
              </a>
            </div>
          </div>
        </div>
      `,
    });
    console.log('[EMAIL] Wysłano powiadomienie o serwetach');
  } catch (err) {
    console.error('[EMAIL] Błąd wysyłki serwetek:', err.message);
  }
};
