// Sends one email through Brevo's HTTP API (https://developers.brevo.com). It needs no extra package:
// Node already has fetch. The key and the sender address come from the environment and are never printed.
//   BREVO_API_KEY  the API key created in the Brevo dashboard (a secret: set it only on the host)
//   MAIL_FROM      a sender address verified in Brevo
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// Pasted values often carry a stray space or newline, so both are trimmed before use.
const readSetting = (name) => (process.env[name] || '').trim();

// TEMPORARY diagnostic for "Email is not configured". Says only whether each setting is present and how long it
// is, never the value. It also lists any environment variable whose NAME looks like a mail setting, with the
// name in quotes, so a typo or a hidden space in a name becomes visible. Remove once email works.
function describeMailSettings(env = process.env) {
  const expected = ['BREVO_API_KEY', 'MAIL_FROM'];
  const report = {};

  for (const name of expected) {
    const value = env[name];
    report[name] = { present: typeof value === 'string' && value.trim().length > 0, length: typeof value === 'string' ? value.length : 0 };
  }

  report.similarNames = Object.keys(env)
    .filter((name) => /brevo|mail|sender/i.test(name))
    .map((name) => JSON.stringify(name));

  return report;
}

// Returns true when Brevo accepted the message, false otherwise. It never throws, so a mail problem
// cannot break the request that asked for it.
async function sendMail({ to, subject, text, html }, fetchImpl = fetch) {
  const apiKey = readSetting('BREVO_API_KEY');
  const from = readSetting('MAIL_FROM');

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

module.exports = { sendMail, describeMailSettings };
