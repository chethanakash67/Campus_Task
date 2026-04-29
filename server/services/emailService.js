const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';
const DEFAULT_FROM_NAME = 'CampusTasks';
const DEFAULT_MIN_INTERVAL_MS = 1100;

let lastSendAt = 0;
let sendQueue = Promise.resolve();

function getConfig() {
  const minInterval = Number(process.env.EMAILJS_MIN_INTERVAL_MS);

  return {
    serviceId: (process.env.EMAILJS_SERVICE_ID || '').trim(),
    templateId: (process.env.EMAILJS_TEMPLATE_ID || '').trim(),
    publicKey: (
      process.env.EMAILJS_API_KEY ||
      process.env.EMAILJS_PUBLIC_KEY ||
      process.env.EMAILJS_USER_ID ||
      ''
    ).trim(),
    privateKey: (
      process.env.EMAILJS_PRIVATE_KEY ||
      process.env.EMAILJS_ACCESS_TOKEN ||
      ''
    ).trim(),
    fromName: (process.env.EMAILJS_FROM_NAME || DEFAULT_FROM_NAME).trim(),
    replyTo: (process.env.EMAILJS_REPLY_TO || process.env.EMAILJS_FROM_EMAIL || '').trim(),
    minIntervalMs: Number.isFinite(minInterval) && minInterval >= 0
      ? minInterval
      : DEFAULT_MIN_INTERVAL_MS
  };
}

function getMissingConfig(config = getConfig()) {
  const missing = [];

  if (!config.serviceId) missing.push('EMAILJS_SERVICE_ID');
  if (!config.templateId) missing.push('EMAILJS_TEMPLATE_ID');
  if (!config.publicKey) missing.push('EMAILJS_API_KEY or EMAILJS_PUBLIC_KEY');

  return missing;
}

function isEmailConfigured() {
  return getMissingConfig().length === 0;
}

function getEmailStatus() {
  const config = getConfig();
  const missing = getMissingConfig(config);

  return {
    provider: 'EmailJS',
    configured: missing.length === 0,
    endpoint: EMAILJS_SEND_URL,
    missing,
    envServiceIdSet: Boolean(config.serviceId),
    envTemplateIdSet: Boolean(config.templateId),
    envApiKeySet: Boolean(config.publicKey),
    envPrivateKeySet: Boolean(config.privateKey),
    fromName: config.fromName,
    replyToSet: Boolean(config.replyTo),
    minIntervalMs: config.minIntervalMs
  };
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postToEmailJs(payload) {
  if (typeof fetch !== 'function') {
    throw new Error('EmailJS sending requires Node.js 18+ because global fetch is unavailable.');
  }

  const response = await fetch(EMAILJS_SEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`EmailJS ${response.status}: ${responseText}`);
  }

  return responseText;
}

function enqueueEmailJsSend(payload, minIntervalMs) {
  const nextSend = sendQueue.then(async () => {
    const elapsed = Date.now() - lastSendAt;
    const delay = Math.max(0, minIntervalMs - elapsed);

    if (delay > 0) {
      await wait(delay);
    }

    lastSendAt = Date.now();
    return postToEmailJs(payload);
  });

  sendQueue = nextSend.catch(() => {});
  return nextSend;
}

async function sendEmail({ to, toName, subject, html, text, templateParams = {} }) {
  if (!to) {
    console.warn('EmailJS send skipped: missing recipient email.');
    return false;
  }

  const config = getConfig();
  const missing = getMissingConfig(config);

  if (missing.length > 0) {
    console.warn(`EmailJS not configured. Missing: ${missing.join(', ')}`);
    return false;
  }

  const resolvedSubject = subject || 'CampusTasks Notification';
  const htmlMessage = html || text || '';
  const plainMessage = text || stripHtml(htmlMessage);

  const payload = {
    service_id: config.serviceId,
    template_id: config.templateId,
    user_id: config.publicKey,
    template_params: {
      app_name: 'CampusTasks',
      to_email: to,
      email: to,
      user_email: to,
      to: to,
      recipient: to,
      recipient_email: to,
      to_name: toName || to,
      name: toName || to,
      user_name: toName || to,
      from_name: config.fromName,
      reply_to: config.replyTo,
      subject: resolvedSubject,
      message: plainMessage,
      html_message: htmlMessage,
      ...templateParams
    }
  };

  if (config.privateKey) {
    payload.accessToken = config.privateKey;
  }

  try {
    await enqueueEmailJsSend(payload, config.minIntervalMs);
    console.log(`EmailJS email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('EmailJS sending error:', error.message);
    return false;
  }
}

module.exports = {
  getEmailStatus,
  isEmailConfigured,
  sendEmail
};
