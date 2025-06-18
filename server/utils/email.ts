import nodemailer from 'nodemailer';

/**
 * Build a transporter.  In dev, if no SMTP credentials are set, we fall back to
 * an Ethereal test account so `sendEmail` never hard-fails.
 */
async function getTransport(): Promise<nodemailer.Transporter> {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }

  // Dev fallback – Ethereal
  const testAcc = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAcc.user,
      pass: testAcc.pass,
    },
  });
}

let cached: nodemailer.Transporter | null = null;

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to) throw new Error('Missing recipient');

  if (!cached) cached = await getTransport();

  try {
    const info = await cached.sendMail({
      from: process.env.EMAIL_FROM || 'support@fixer.gg',
      to,
      subject,
      html,
    });

    console.log('📧 Email sent attempt:', { to, subject, messageId: info.messageId });
    // Ethereal preview URL
    // @ts-ignore – types missing for helper
    if (nodemailer.getTestMessageUrl) {
      // eslint-disable-next-line no-console
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error('Error sending email:', error, { to, subject });
    throw error;
  }
} 