import { randomBytes } from 'crypto';
import { Express, Request, Response } from 'express';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { storage } from './storage';
import { z } from 'zod';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { hashPassword } from './auth';

// Define a schema for password reset tokens
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  used: text('used').default('false').notNull(),
});

// Token generation function
function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

// Schema for request validation
const requestResetSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const validateResetSchema = z.object({
  token: z.string().min(10, 'Invalid token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Setup password reset endpoints
export function setupPasswordReset(app: Express) {
  // Request password reset endpoint
  app.post('/api/password-reset/request', async (req: Request, res: Response) => {
    try {
      const { email } = requestResetSchema.parse(req.body);
      
      // Find user with this email
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        // Always return success to prevent email enumeration
        return res.status(200).json({ 
          message: 'If an account with that email exists, a password reset link has been sent.' 
        });
      }
      
      // Check if there's an existing valid token and delete it
      await db.delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, user.id));
      
      // Create expiration time (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Generate and store token
      const token = generateResetToken();
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
        used: 'false'
      });
      
      // In a real implementation, we would send an email here
      // For development, we'll log the reset link
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
      console.log(`Password reset link for ${user.username} (${user.email}): ${resetLink}`);
      
      res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Validate token endpoint - used to check if a token is valid before showing the reset form
  app.get('/api/password-reset/validate/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Find the token
      const [resetToken] = await db.select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));
      
      if (!resetToken) {
        return res.status(400).json({ valid: false, message: 'Invalid or expired token' });
      }
      
      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ valid: false, message: 'Token has expired' });
      }
      
      // Check if token has been used
      if (resetToken.used === 'true') {
        return res.status(400).json({ valid: false, message: 'Token has already been used' });
      }
      
      // Token is valid
      res.status(200).json({ valid: true });
    } catch (error) {
      console.error('Error validating reset token:', error);
      res.status(400).json({ valid: false, message: (error as Error).message });
    }
  });
  
  // Reset password endpoint
  app.post('/api/password-reset/reset', async (req: Request, res: Response) => {
    try {
      const { token, password } = validateResetSchema.parse(req.body);
      
      // Find the token
      const [resetToken] = await db.select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));
      
      if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
      
      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: 'Token has expired' });
      }
      
      // Check if token has been used
      if (resetToken.used === 'true') {
        return res.status(400).json({ message: 'Token has already been used' });
      }
      
      // Get the user
      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(password);
      
      // Update user's password
      await storage.updateUser(user.id, {
        password: hashedPassword
      });
      
      // Mark token as used
      await db.update(passwordResetTokens)
        .set({ used: 'true' })
        .where(eq(passwordResetTokens.id, resetToken.id));
      
      res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
}