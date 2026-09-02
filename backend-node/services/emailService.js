// Sends a welcome email on registration. If EMAIL_USER/EMAIL_PASS aren't
// configured in .env, it safely falls back to logging the email to the
// console instead — so registration always works, with or without a
// real email account connected.
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

async function sendWelcomeEmail(user) {
  const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  if (!nodemailer || !hasCredentials) {
    console.log('--- [Email not configured — logging instead] ---');
    console.log(`To: ${user.email}`);
    console.log(`Subject: Welcome to Brain Byte, ${user.name}!`);
    console.log(`Body: Your account has been created. Start learning at http://localhost:3000`);
    console.log('---------------------------------------------------');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    from: `"Brain Byte" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Welcome to Brain Byte!',
    text: `Hi ${user.name},\n\nYour Brain Byte account has been created. Start learning at http://localhost:3000\n\n— The Brain Byte Team`,
  });
  console.log(`Welcome email sent to ${user.email}`);
}

module.exports = { sendWelcomeEmail };