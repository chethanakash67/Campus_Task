// server/quick-email-test.js
// Quick test to verify EmailJS sending works.

const { getEmailStatus, sendEmail } = require('./services/emailService');

async function main() {
  const status = getEmailStatus();
  const to = process.argv[2] || process.env.EMAILJS_TEST_TO || process.env.EMAILJS_REPLY_TO;

  console.log('\nTesting EmailJS configuration...\n');
  console.log('Provider:', status.provider);
  console.log('Configured:', status.configured ? 'Yes' : 'No');
  console.log('Service ID set:', status.envServiceIdSet ? 'Yes' : 'No');
  console.log('Template ID set:', status.envTemplateIdSet ? 'Yes' : 'No');
  console.log('API/Public key set:', status.envApiKeySet ? 'Yes' : 'No');
  console.log('Private key set:', status.envPrivateKeySet ? 'Yes' : 'No');
  console.log('From name:', status.fromName);

  if (!status.configured) {
    console.log('\nMissing:', status.missing.join(', '));
    process.exit(1);
  }

  if (!to) {
    console.log('\nProvide a test recipient:');
    console.log('  node quick-email-test.js you@example.com');
    console.log('or set EMAILJS_TEST_TO in server/.env');
    process.exit(1);
  }

  const sent = await sendEmail({
    to,
    subject: 'CampusTasks EmailJS Test',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>CampusTasks EmailJS test</h2>
        <p>Your backend is sending mail through EmailJS.</p>
        <p>Example OTP: <strong>123456</strong></p>
      </div>
    `,
    templateParams: {
      email_type: 'test',
      otp: '123456'
    }
  });

  process.exit(sent ? 0 : 1);
}

main().catch((error) => {
  console.error('EmailJS test failed:', error.message);
  process.exit(1);
});
