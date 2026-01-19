// server/quick-email-test.js
// Quick test to verify email is working
const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('\n🔍 Testing Email Configuration...\n');

// Show what we're using
console.log('Email User:', process.env.EMAIL_USER);
console.log('Password Length:', process.env.EMAIL_PASSWORD?.length || 0, 'characters');
console.log('Password has spaces?', process.env.EMAIL_PASSWORD?.includes(' ') ? '❌ YES (REMOVE THEM!)' : '✅ No');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Test connection
console.log('\n📮 Testing connection to Gmail...\n');

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ FAILED:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure 2FA is enabled on your Gmail');
    console.log('   2. Generate App Password: https://myaccount.google.com/apppasswords');
    console.log('   3. Copy the 16-character password (remove spaces!)');
    console.log('   4. Update EMAIL_PASSWORD in .env file');
    console.log('   5. Restart this test\n');
  } else {
    console.log('✅ SUCCESS! Email is configured correctly!\n');
    console.log('📧 Sending test email to', process.env.EMAIL_USER);
    
    // Send test email
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: '✅ CampusTasks Email Working!',
      html: `
        <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #646cff;">🎉 Success!</h2>
            <p>Your CampusTasks email configuration is working perfectly!</p>
            <p>Your OTP emails will look like this:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #646cff;">
                123456
              </div>
            </div>
            <p style="color: #666;">You can now sign up and login with OTP!</p>
          </div>
        </div>
      `
    }, (err, info) => {
      if (err) {
        console.log('❌ Failed to send:', err.message);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('\n📬 Check your inbox:', process.env.EMAIL_USER);
        console.log('\n🚀 You can now:');
        console.log('   1. Start backend: npm run dev');
        console.log('   2. Try signing up at: http://localhost:5173/signup\n');
      }
      process.exit(0);
    });
  }
});