/**
 * Wysyłka emaili przez Resend API (bez SMTP — działa na Render free tier)
 * Docs: https://resend.com/docs
 */

async function sendMail(subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL || 'lukasz.tokarczyk@gmail.com';

  if (!apiKey) {
    console.error('[EMAIL] Brak RESEND_API_KEY — ustaw na Render!');
    return;
  }

  console.log(`[EMAIL] Wysyłam do: ${to} | temat: ${subject}`);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Strefa Pary Młodej <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log('[EMAIL] Wysłano ✓ id:', data.id);
    } else {
      console.error('[EMAIL] Błąd Resend:', JSON.stringify(data));
    }
  } catch (err) {
    console.error('[EMAIL] Fetch error:', err.message);
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
