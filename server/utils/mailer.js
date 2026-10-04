// Sends one email through Brevo's HTTP API (https://developers.brevo.com). It needs no extra package:
// Node already has fetch. The key and the sender address come from the environment and are never printed.
//   BREVO_API_KEY  the API key created in the Brevo dashboard (a secret: set it only on the host)
//   MAIL_FROM      a sender address verified in Brevo
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// Returns true when Brevo accepted the message, false otherwise. It never throws, so a mail problem
// cannot break the request that asked for it.
async function sendMail({ to, subject, text, html }, fetchImpl = fetch) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    console.error('Email is not configured: set BREVO_API_KEY and MAIL_FROM.');
    return false;
  }

  try {
    const response = await fetchImpl(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Trackly', email: from },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Email service answered with status ${response.status}.`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return false;
  }
}

module.exports = { sendMail };
