// Sends account emails. If EMAIL_USER/EMAIL_PASS aren't configured, or
// if the real send fails for any reason (network issues, blocked SMTP
// ports, wrong credentials), this safely falls back to logging the
// code/message to the console instead — so you're never locked out.
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

function logVerificationFallback(user, code) {
  console.log('--- [Verification code — check here if email did not arrive] ---');
  console.log(`To: ${user.email}`);
  console.log(`Code: ${code}`);
  console.log('------------------------------------------------------------------');
}

function logWelcomeFallback(user) {
  console.log('--- [Email not sent — logging instead] ---');
  console.log(`To: ${user.email}`);
  console.log(`Subject: Welcome to Brain Byte, ${user.name}!`);
  console.log('--------------------------------------------');
}

async function sendVerificationEmail(user, code) {
  const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  if (!nodemailer || !hasCredentials) {
    logVerificationFallback(user, code);
    return;
  }

  try {
    await getTransporter().sendMail({
      from: `"Brain Byte" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Verify your Brain Byte account',
      text: `Hi ${user.name},\n\nYour verification code is: ${code}\n\nThis code expires in 15 minutes.\n\n— The Brain Byte Team`,
    });
    console.log(`Verification email sent to ${user.email}`);
  } catch (err) {
    console.error('Real email send failed, showing code in terminal instead:', err.message);
    logVerificationFallback(user, code);
  }
}

async function sendWelcomeEmail(user) {
  const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  if (!nodemailer || !hasCredentials) {
    logWelcomeFallback(user);
    return;
  }

  try {
    await getTransporter().sendMail({
      from: `"Brain Byte" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Welcome to Brain Byte!',
      text: `Hi ${user.name},\n\nYour email is verified and your Brain Byte account is ready. Start learning at http://localhost:3000\n\n— The Brain Byte Team`,
    });
    console.log(`Welcome email sent to ${user.email}`);
  } catch (err) {
    console.error('Real email send failed:', err.message);
    logWelcomeFallback(user);
  }
}
async function sendPasswordResetEmail(user, code) {
  const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  if (!nodemailer || !hasCredentials) {
    console.log('--- [Password reset code — check here if email did not arrive] ---');
    console.log(`To: ${user.email}`);
    console.log(`Code: ${code}`);
    console.log('-------------------------------------------------------------------');
    return;
  }

  try {
    await getTransporter().sendMail({
      from: `"Brain Byte" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Reset your Brain Byte password',
      text: `Hi ${user.name},\n\nYour password reset code is: ${code}\n\nThis code expires in 15 minutes. If you didn't request this, you can safely ignore this email.\n\n— The Brain Byte Team`,
    });
    console.log(`Password reset email sent to ${user.email}`);
  } catch (err) {
    console.error('Real email send failed:', err.message);
    console.log('--- [Password reset code — check here if email did not arrive] ---');
    console.log(`To: ${user.email}`);
    console.log(`Code: ${code}`);
    console.log('-------------------------------------------------------------------');
  }
}

module.exports = { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail };