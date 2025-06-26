import express, { Request, Response } from 'express';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { z } from 'zod';
import { storage } from '../storage';

// Utils --------------------------------------------------
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

// Router -------------------------------------------------
const router = express.Router();

/**
 * NOTE: Existing authentication logic lives in setupAuth (server/auth.ts) where
 * endpoints /api/register, /api/login, and /api/logout are defined directly on
 * the Express app.  For backward-compatibility we simply proxy those endpoints
 * so clients can use the new /api/auth/* paths required by the spec.
 */
router.post('/register', (req, res) => {
  // Preserve body & method, forward with 307
  return res.redirect(307, '/api/register');
});

router.post('/login', (req, res) => {
  return res.redirect(307, '/api/login');
});

router.post('/logout', (req, res) => {
  return res.redirect(307, '/api/logout');
});

// -------------------------------------------------------
// POST /api/auth/forgot-password
// -------------------------------------------------------
router.post('/forgot-password', async (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email() });

  try {
    const { email } = schema.parse(req.body);

    // Generic success response to avoid account enumeration
    const genericSuccess = () =>
      res.json({ message: 'If an account with that e-mail exists, reset instructions have been sent.' });

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return genericSuccess();
    }

    // Generate a one-time token valid for 1 hour
    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await storage.updateUser(user.id, {
      verificationToken: token,
      verificationTokenExpiry: expiry,
    });

    // Build reset URL & e-mail body
    const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${token}`;

    // Fire-and-forget e-mail
    (async () => {
      try {
        const { sendEmail } = await import('../utils/email.js');
        const html = `
          <p>Hi ${user.fullName ?? user.username},</p>
          <p>You requested to reset your Fixer password. Click the link below to choose a new password:</p>
          <p><a href="${resetUrl}">Reset password</a></p>
          <p>If you didn't request this, you can safely ignore this e-mail.</p>
          <p>This link will expire in 60 minutes.</p>
        `;
        await sendEmail(email, 'Reset your Fixer password', html);
      } catch (err) {
        console.error('Failed to send reset-password e-mail:', err);
      }
    })();

    return genericSuccess();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request', errors: err.errors });
    }
    console.error('Forgot-password error:', err);
    return res.status(500).json({ message: 'Failed to process request' });
  }
});

// -------------------------------------------------------
// POST /api/auth/reset-password
// -------------------------------------------------------
router.post('/reset-password', async (req: Request, res: Response) => {
  const schema = z.object({
    token: z.string(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  });

  try {
    const { token, newPassword } = schema.parse(req.body);

    // Find user with matching (non-expired) token
    const users = await storage.getAllUsers();
    const now = new Date();
    const user = users.find(
      (u) =>
        u.verificationToken === token &&
        u.verificationTokenExpiry &&
        new Date(u.verificationTokenExpiry) > now,
    );

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const hashed = await hashPassword(newPassword);

    await storage.updateUser(user.id, {
      password: hashed,
      verificationToken: null,
      verificationTokenExpiry: null,
    });

    return res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request', errors: err.errors });
    }
    console.error('Reset-password error:', err);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
});

export default router; 