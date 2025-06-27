import express from 'express';
import { db } from '../db.js';
import { jobs, applications, users } from '@shared/schema';
import { eq, and, gte, desc, count, avg, sum } from 'drizzle-orm';
import { requireAuth } from '../auth-helpers.js';

const router = express.Router();

// Get poster analytics
router.get('/poster', requireAuth, async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const userId = req.user.id;
    
    // Calculate date range
    const now = new Date();
    const daysBack = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[range as string] || 30;
    
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get user's jobs
    const userJobs = await db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.posterId, userId),
        gte(jobs.datePosted, startDate)
      ));

    const jobIds = userJobs.map(job => job.id);

    // Overview metrics
    const totalJobs = userJobs.length;
    const totalSpent = userJobs.reduce((sum, job) => sum + (job.paymentAmount || 0), 0);
    const completedJobs = userJobs.filter(job => job.status === 'completed');
    const completionRate = totalJobs > 0 ? completedJobs.length / totalJobs : 0;

    // Get applications for user's jobs
    let totalApplications = 0;
    if (jobIds.length > 0) {
      const applicationsResult = await db
        .select({ count: count() })
        .from(applications)
        .where(applications.jobId.in(jobIds));
      
      totalApplications = applicationsResult[0]?.count || 0;
    }

    // Calculate average rating (mock data for now)
    const averageRating = 4.2;
    const averageTimeToHire = 3; // days

    // Trends data - group by date
    const jobsPosted = [];
    const spending = [];
    const applicationsData = [];

    // Generate trend data for the last 7 periods
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayJobs = userJobs.filter(job => {
        const jobDate = new Date(job.datePosted).toISOString().split('T')[0];
        return jobDate === dateStr;
      });

      jobsPosted.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: dayJobs.length
      });

      spending.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: dayJobs.reduce((sum, job) => sum + (job.paymentAmount || 0), 0)
      });

      // Mock applications data
      applicationsData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Math.floor(Math.random() * 10)
      });
    }

    // Categories data
    const categoryMap = new Map();
    userJobs.forEach(job => {
      const category = job.category || 'Other';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, spending: 0 });
      }
      const data = categoryMap.get(category);
      data.count += 1;
      data.spending += job.paymentAmount || 0;
    });

    const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      spending: data.spending
    }));

    // Performance metrics (mock data)
    const performance = {
      responseTime: 0.85, // 85% response rate
      hireRate: 0.65, // 65% hire rate
      workerRetention: 0.78 // 78% retention
    };

    const analyticsData = {
      overview: {
        totalJobs,
        totalSpent,
        averageRating,
        completionRate,
        totalApplications,
        averageTimeToHire
      },
      trends: {
        jobsPosted,
        spending,
        applications: applicationsData
      },
      categories,
      performance
    };

    res.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

// Get worker analytics
router.get('/worker', requireAuth, async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const userId = req.user.id;
    
    // Calculate date range
    const now = new Date();
    const daysBack = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[range as string] || 30;
    
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get user's applications
    const userApplications = await db
      .select()
      .from(applications)
      .where(and(
        eq(applications.workerId, userId),
        gte(applications.createdAt, startDate)
      ));

    // Get accepted applications and their jobs
    const acceptedApplications = userApplications.filter(app => app.status === 'accepted');
    
    // Mock analytics data for worker
    const analyticsData = {
      overview: {
        totalApplications: userApplications.length,
        acceptedApplications: acceptedApplications.length,
        totalEarnings: acceptedApplications.length * 150, // Mock earnings
        averageRating: 4.5,
        completedJobs: Math.floor(acceptedApplications.length * 0.8),
        successRate: userApplications.length > 0 ? acceptedApplications.length / userApplications.length : 0
      },
      trends: {
        applications: [],
        earnings: [],
        ratings: []
      },
      categories: [
        { name: 'Home Repair', count: 5, earnings: 750 },
        { name: 'Cleaning', count: 3, earnings: 450 },
        { name: 'Moving', count: 2, earnings: 300 }
      ],
      performance: {
        responseTime: 0.92,
        completionRate: 0.88,
        clientSatisfaction: 0.94
      }
    };

    res.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    console.error('Worker analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker analytics data'
    });
  }
});

export default router;
