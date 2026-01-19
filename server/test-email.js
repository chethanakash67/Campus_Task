// server/test-setup.js
// Run this to verify your setup
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
require('dotenv').config();

console.log('\n========================================');
console.log('🔍 CAMPUSTASKS SETUP DIAGNOSTICS');
console.log('========================================\n');

// 1. Check Environment Variables
console.log('📋 ENVIRONMENT VARIABLES:');
console.log('-------------------------');
console.log('PORT:', process.env.PORT || '5001 (default)');
console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD 
  ? `✅ SET (${process.env.EMAIL_PASSWORD.length} characters)` 
  : '❌ NOT SET');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ SET' : '⚠️  NOT SET (Google OAuth disabled)');
console.log('DB_NAME:', process.env.DB_NAME || 'campustasks (default)');
console.log('DB_USER:', process.env.DB_USER || 'postgres (default)');

// 2. Check Email Password Format
console.log('\n📧 EMAIL CONFIGURATION CHECK:');
console.log('-----------------------------');
if (process.env.EMAIL_PASSWORD) {
  if (process.env.EMAIL_PASSWORD.includes(' ')) {
    console.log('❌ ERROR: EMAIL_PASSWORD contains spaces!');
    console.log('   Remove all spaces from your Gmail App Password');
    console.log('   Example: "abcd efgh ijkl mnop" → "abcdefghijklmnop"');
  } else if (process.env.EMAIL_PASSWORD.length !== 16) {
    console.log('⚠️  WARNING: Gmail App Password is usually 16 characters');
    console.log('   Current length:', process.env.EMAIL_PASSWORD.length);
  } else {
    console.log('✅ Email password format looks correct');
  }
} else {
  console.log('⚠️  Email not configured - will run in DEV MODE');
  console.log('   OTP will be shown in console/screen instead of email');
}

// 3. Test Database Connection
console.log('\n💾 DATABASE CONNECTION TEST:');
console.log('---------------------------');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'campustasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

pool.connect()
  .then(client => {
    console.log('✅ Database connection successful');
    
    // Check if required tables exist
    return client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('users', 'teams', 'tasks', 'otp_codes')
      ORDER BY table_name
    `).then(result => {
      console.log('✅ Required tables found:', result.rows.length + '/4');
      result.rows.forEach(row => {
        console.log('   -', row.table_name);
      });
      
      if (result.rows.length < 4) {
        console.log('\n⚠️  WARNING: Some tables are missing!');
        console.log('   Run the schema.sql file to create tables');
      }
      
      client.release();
    });
  })
  .catch(err => {
    console.log('❌ Database connection failed:', err.message);
    console.log('\n   Troubleshooting:');
    console.log('   1. Make sure PostgreSQL is running');
    console.log('   2. Check DB credentials in .env');
    console.log('   3. Create database: CREATE DATABASE campustasks;');
  })
  .finally(() => {
    // 4. Test Email Configuration
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      console.log('\n📮 EMAIL SERVER TEST:');
      console.log('--------------------');
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      transporter.verify((error, success) => {
        if (error) {
          console.log('❌ Email server connection FAILED');
          console.log('   Error:', error.message);
          console.log('\n   Troubleshooting:');
          console.log('   1. Enable 2FA on Gmail: https://myaccount.google.com/security');
          console.log('   2. Generate App Password: https://myaccount.google.com/apppasswords');
          console.log('   3. Update EMAIL_PASSWORD in .env (no spaces!)');
          console.log('   4. Make sure you\'re using App Password, not your regular password');
        } else {
          console.log('✅ Email server connection successful');
          console.log('   Ready to send OTP emails!');
          
          // Ask if user wants to send test email
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          readline.question('\nSend test email to ' + process.env.EMAIL_USER + '? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
              console.log('📧 Sending test email...');
              transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER,
                subject: 'CampusTasks - Email Test Successful ✅',
                html: `
                  <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>🎉 Congratulations!</h2>
                    <p>Your CampusTasks email configuration is working perfectly!</p>
                    <p>Your OTP emails will look like this:</p>
                    <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                      <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px;">
                        123456
                      </div>
                    </div>
                    <p>You're all set! 🚀</p>
                  </div>
                `
              }, (err, info) => {
                if (err) {
                  console.log('❌ Failed to send:', err.message);
                } else {
                  console.log('✅ Test email sent! Check your inbox.');
                }
                readline.close();
                printSummary();
              });
            } else {
              readline.close();
              printSummary();
            }
          });
        }
      });
    } else {
      printSummary();
    }
  });

function printSummary() {
  console.log('\n========================================');
  console.log('📊 SUMMARY');
  console.log('========================================\n');
  
  const dbOk = '✅';
  const emailOk = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD ? '✅' : '⚠️  (Dev Mode)';
  const googleOk = process.env.GOOGLE_CLIENT_ID ? '✅' : '⚠️  (Disabled)';
  
  console.log('Database:', dbOk);
  console.log('Email:', emailOk);
  console.log('Google OAuth:', googleOk);
  
  console.log('\n📝 NEXT STEPS:');
  console.log('-------------');
  console.log('1. Start backend: npm run dev');
  console.log('2. Start frontend: cd ../client && npm run dev');
  console.log('3. Open browser: http://localhost:5173');
  console.log('4. Try signing up!');
  
  if (emailOk !== '✅') {
    console.log('\n💡 TIP: Configure email to receive real OTPs');
    console.log('   See server/.env for instructions');
  }
  
  console.log('\n========================================\n');
  process.exit(0);
}