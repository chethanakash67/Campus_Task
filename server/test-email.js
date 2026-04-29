// server/test-email.js
// Run this to verify database and EmailJS setup.

const path = require('path');
const readline = require('readline');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const { getEmailStatus, sendEmail } = require('./services/emailService');

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function testDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'campustasks',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });

  try {
    const client = await pool.connect();
    console.log('Database connection: OK');

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'teams', 'tasks', 'otp_codes')
      ORDER BY table_name
    `);

    console.log(`Required tables found: ${result.rows.length}/4`);
    result.rows.forEach((row) => console.log(`  - ${row.table_name}`));

    if (result.rows.length < 4) {
      console.log('Some tables are missing. Run server/db/schema.sql to create them.');
    }

    client.release();
    return true;
  } catch (error) {
    console.log('Database connection: FAILED');
    console.log('Error:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function maybeSendTestEmail() {
  const status = getEmailStatus();

  console.log('\nEmailJS configuration:');
  console.log('Provider:', status.provider);
  console.log('Configured:', status.configured ? 'Yes' : 'No');
  console.log('Service ID set:', status.envServiceIdSet ? 'Yes' : 'No');
  console.log('Template ID set:', status.envTemplateIdSet ? 'Yes' : 'No');
  console.log('API/Public key set:', status.envApiKeySet ? 'Yes' : 'No');
  console.log('Private key set:', status.envPrivateKeySet ? 'Yes' : 'No');
  console.log('From name:', status.fromName);

  if (!status.configured) {
    console.log('Missing:', status.missing.join(', '));
    return false;
  }

  const defaultTo = process.env.EMAILJS_TEST_TO || process.env.EMAILJS_REPLY_TO || '';
  const answer = await ask(`Send a test email${defaultTo ? ` to ${defaultTo}` : ''}? Enter email or leave blank to skip: `);
  const to = answer || defaultTo;

  if (!to) {
    console.log('Email test skipped.');
    return true;
  }

  return sendEmail({
    to,
    subject: 'CampusTasks EmailJS Test',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>CampusTasks EmailJS test</h2>
        <p>Your CampusTasks backend is sending mail through EmailJS.</p>
        <p>Example OTP: <strong>123456</strong></p>
      </div>
    `,
    templateParams: {
      email_type: 'test',
      otp: '123456'
    }
  });
}

async function main() {
  console.log('\n========================================');
  console.log('CAMPUSTASKS SETUP DIAGNOSTICS');
  console.log('========================================\n');

  console.log('Environment:');
  console.log('PORT:', process.env.PORT || '5001 (default)');
  console.log('DB_NAME:', process.env.DB_NAME || 'campustasks (default)');
  console.log('DB_USER:', process.env.DB_USER || 'postgres (default)');
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set');

  console.log('\nDatabase test:');
  const dbOk = await testDatabase();
  const emailOk = await maybeSendTestEmail();

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================\n');
  console.log('Database:', dbOk ? 'OK' : 'Needs attention');
  console.log('EmailJS:', emailOk ? 'OK' : 'Needs attention');
  console.log('Google OAuth:', process.env.GOOGLE_CLIENT_ID ? 'Enabled' : 'Disabled');
  console.log('\nNext steps:');
  console.log('1. Start backend: npm run dev');
  console.log('2. Start frontend: cd ../client && npm run dev');
  console.log('3. Open browser: http://localhost:5173');
}

main().catch((error) => {
  console.error('Diagnostics failed:', error.message);
  process.exit(1);
});
