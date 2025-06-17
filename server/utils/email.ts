import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to) throw new Error('Missing recipient');

  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@fixer.com',
    to,
    subject,
    html,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('Email sent:', info.messageId);
  }

  return info;
} 