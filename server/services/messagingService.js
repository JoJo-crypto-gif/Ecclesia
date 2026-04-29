const DEFAULT_PROVIDER = 'ARKESEL';
const ARKESEL_API_URL = process.env.ARKESEL_SMS_URL || 'https://sms.arkesel.com/api/v2/sms/send';
const FROG_API_URL = process.env.FROG_SMS_URL || 'https://frogapi.wigal.com.gh/api/v3/sms/send';
const isProduction = process.env.NODE_ENV === 'production';

const normalizeRecipients = (recipients = []) =>
  (Array.isArray(recipients) ? recipients : [recipients])
    .filter((recipient) => typeof recipient === 'string')
    .map((recipient) => recipient.trim())
    .filter((recipient) => recipient.length > 0);

const parseResponseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const generateMsgId = (index) => `ECL-${Date.now()}-${index + 1}`;

const sendViaArkesel = async (message, recipients) => {
  const apiKey = process.env.ARKESEL_SMS_API_KEY;
  const senderId = process.env.ARKESEL_SENDER_ID || 'ECCLESIA';

  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.log(`[Arkesel Mock] Sending to ${recipients.length} recipients: ${message}`);
    return { success: true, mocked: true, provider: 'ARKESEL' };
  }

  try {
    const payload = {
      sender: senderId,
      message,
      recipients
    };

    if (!isProduction) {
      console.log('[Arkesel] Sending request...');
      console.log('[Arkesel] Sender ID:', senderId);
      console.log('[Arkesel] Recipient count:', recipients.length);
    }

    const response = await fetch(ARKESEL_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await parseResponseBody(response);
    if (!isProduction) {
      console.log('[Arkesel] HTTP Status:', response.status);
      console.log('[Arkesel] Response Body:', JSON.stringify(data, null, 2));
    }

    return { success: response.ok, data, provider: 'ARKESEL' };
  } catch (error) {
    console.error('[Arkesel] Request failed:', error.message);
    return { success: false, error: error.message, provider: 'ARKESEL' };
  }
};

const sendViaFrog = async (message, recipients) => {
  const apiKey = process.env.FROG_API_KEY;
  const username = process.env.FROG_USERNAME;
  const senderId = process.env.FROG_SENDER_ID || 'ECCLESIA';

  if (!apiKey || !username) {
    console.log(`[FROG Mock] Sending to ${recipients.length} recipients: ${message}`);
    return { success: true, mocked: true, provider: 'FROG' };
  }

  try {
    const payload = {
      senderid: senderId,
      destinations: recipients.map((destination, index) => ({
        destination,
        msgid: generateMsgId(index)
      })),
      message,
      smstype: 'text'
    };

    if (!isProduction) {
      console.log('[FROG] Sending request...');
      console.log('[FROG] Sender ID:', senderId);
      console.log('[FROG] Recipient count:', recipients.length);
    }

    const response = await fetch(FROG_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': apiKey,
        USERNAME: username
      },
      body: JSON.stringify(payload)
    });

    const data = await parseResponseBody(response);
    const accepted = typeof data?.status === 'string' && data.status.toUpperCase() === 'ACCEPTD';
    if (!isProduction) {
      console.log('[FROG] HTTP Status:', response.status);
      console.log('[FROG] Response Body:', JSON.stringify(data, null, 2));
    }

    return { success: response.ok && accepted, data, provider: 'FROG' };
  } catch (error) {
    console.error('[FROG] Request failed:', error.message);
    return { success: false, error: error.message, provider: 'FROG' };
  }
};

export const sendSms = async (message, recipients) => {
  const validRecipients = normalizeRecipients(recipients);
  if (validRecipients.length === 0) {
    return { success: true, mocked: false, message: 'No valid recipients' };
  }

  const provider = (process.env.SMS_PROVIDER || DEFAULT_PROVIDER).trim().toUpperCase();

  if (provider === 'FROG') {
    return sendViaFrog(message, validRecipients);
  }

  if (provider !== 'ARKESEL') {
    console.warn(`[SMS] Unknown SMS_PROVIDER "${provider}", falling back to ARKESEL`);
  }

  return sendViaArkesel(message, validRecipients);
};
