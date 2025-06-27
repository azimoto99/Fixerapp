import express, { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, optionalAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Helpers ------------------------------------------------
function sanitizeUser(user: any) {
  if (!user) return null;
  const { password, verificationToken, verificationTokenExpiry, phoneVerificationCode, phoneVerificationExpiry, ...rest } = user;
  return rest;
}

// --------------------------------------------------------
// GET /api/users/profile  (requires auth)
// --------------------------------------------------------
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const user = await storage.getUser(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(sanitizeUser(user));
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// --------------------------------------------------------
// PUT /api/users/profile (update)  (requires auth)
// --------------------------------------------------------
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  const schema = z.object({
    fullName: z.string().min(1).optional(),
    bio: z.string().max(500).optional(),
    phone: z.string().optional(),
    skills: z.array(z.string()).optional(),
    location: z.string().optional(),
  }).strict();

  try {
    const data = schema.parse(req.body);
    const updated = await storage.updateUser(req.user.id, data);
    if (!updated) return res.status(500).json({ message: 'Failed to update profile' });
    res.json({ message: 'Profile updated', user: sanitizeUser(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: err.errors });
    }
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// --------------------------------------------------------
// GET /api/users/:id  (public profile)
// --------------------------------------------------------
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });
  try {
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(sanitizeUser(user));
  } catch (err) {
    console.error('Public profile error:', err);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// --------------------------------------------------------
// GET /api/admin/stats  (admin only)
// --------------------------------------------------------
router.get('/admin/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await storage.getAdminStats();
    res.json({
      total_users: stats.totalUsers,
      active_jobs: stats.activeJobs,
      total_revenue: stats.totalRevenue,
      pending_disputes: stats.pendingDisputes,
      daily_signups: stats.todaySignups,
      daily_jobs: stats.todayJobs,
      completed_jobs: stats.completedJobs,
      platform_health: stats.platformHealth,
      avg_response_time: stats.avgResponseTime,
      active_sessions: stats.activeSessions
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
});

// --------------------------------------------------------
// GET /api/users/:id/reviews  (public)
router.get('/:id/reviews', optionalAuth, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });
  try {
    const reviews = await storage.getReviewsForUser(userId);
    res.json(reviews);
  } catch (err) {
    console.error('User reviews error:', err);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

export default router; 
