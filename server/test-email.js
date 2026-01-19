// server/test-email.js - Test your email configuration
// Run: node test-email.js

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🧪 Testing Email Configuration...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || '❌ NOT SET'}`);
console.log(`   EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✅ SET (hidden)' : '❌ NOT SET'}`);
console.log('');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error('❌ ERROR: EMAIL_USER or EMAIL_PASSWORD not set in .env file\n');
  console.log('📝 Add these to your .env file:');
  console.log('   EMAIL_USER=your-email@gmail.com');
  console.log('   EMAIL_PASSWORD=your-16-char-app-password\n');
  console.log('ℹ️  Get App Password: https://myaccount.google.com/apppasswords');
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Test connection
console.log('🔌 Testing connection to Gmail...');

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error.message);
    console.log('\n💡 Common issues:');
    console.log('   1. Wrong email or password in .env');
    console.log('   2. App Password has spaces (remove them!)');
    console.log('   3. 2-Step Verification not enabled');
    console.log('   4. App Password not generated yet\n');
    console.log('📚 Setup guide: https://myaccount.google.com/apppasswords');
    process.exit(1);
  } else {
    console.log('✅ Connection successful!\n');
    
    // Send test email
    console.log('📧 Sending test OTP email...');
    
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'CampusTasks - Test OTP Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>✅ Email Configuration Test Successful!</h2>
          <p>Your CampusTasks email is working correctly.</p>
          <p>Test OTP Code:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${testOTP}
          </div>
          <p>You can now use OTP authentication in your application!</p>
          <br>
          <p>Best regards,<br>The CampusTasks Team</p>
        </div>
      `
    };
    
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('❌ Failed to send test email:', err.message);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Test OTP: ${testOTP}\n`);
        console.log('📬 Check your inbox:', process.env.EMAIL_USER);
        console.log('   (Also check spam folder if not in inbox)\n');
        console.log('🎉 Your email is configured correctly!');
        console.log('   You can now start your server: npm run dev\n');
        process.exit(0);
      }
    });
  }
});