import express from 'express';
import { db } from '../db.js';
import { jobs, applications, users, earnings } from '@shared/schema';
import { eq, and, gte, lte, desc, count, avg, sum } from 'drizzle-orm';
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

    // Calculate average rating from reviews
    let averageRating = null;
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length > 0) {
        averageRating = user[0].rating;
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);  
      averageRating = null;
    }
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

      // Calculate real applications data for this date
      let dayApplicationsCount = 0;
      if (jobIds.length > 0) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        try {
          const dayApplications = await db
            .select({ count: count() })
            .from(applications)
            .where(and(
              applications.jobId.in(jobIds),
              gte(applications.dateApplied, dayStart),
              lte(applications.dateApplied, dayEnd)
            ));
          dayApplicationsCount = dayApplications[0]?.count || 0;
        } catch (error) {
          console.error('Error fetching day applications:', error);
        }
      }
      
      applicationsData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: dayApplicationsCount
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

    // Performance metrics calculation
    let responseRate = 0;
    let hireRate = 0;
    let workerRetention = 0;

    if (jobIds.length > 0) {
      try {
        // Calculate response rate (jobs with applications / total jobs)
        const jobsWithApplications = await db
          .select({ jobId: applications.jobId })
          .from(applications)
          .where(applications.jobId.in(jobIds))
          .groupBy(applications.jobId);
        
        responseRate = totalJobs > 0 ? jobsWithApplications.length / totalJobs : 0;

        // Calculate hire rate (accepted applications / total applications)
        const acceptedApplications = await db
          .select({ count: count() })
          .from(applications)
          .where(and(
            applications.jobId.in(jobIds),
            eq(applications.status, 'accepted')
          ));
        
        const acceptedCount = acceptedApplications[0]?.count || 0;
        hireRate = totalApplications > 0 ? acceptedCount / totalApplications : 0;

        // Worker retention (completion rate for hired workers)
        if (completedJobs.length > 0) {
          workerRetention = acceptedCount > 0 ? completedJobs.length / acceptedCount : 0;
        }
      } catch (error) {
        console.error('Error calculating performance metrics:', error);
      }
    }

    const performance = {
      responseTime: responseRate,
      hireRate: hireRate,
      workerRetention: workerRetention
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
        gte(applications.dateApplied, startDate)
      ));

    // Get accepted applications and their jobs
    const acceptedApplications = userApplications.filter(app => app.status === 'accepted');
    
    // Get worker's real rating
    let workerAverageRating = null;
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length > 0) {
        workerAverageRating = user[0].rating;
      }
    } catch (error) {
      console.error('Error fetching worker rating:', error);  
      workerAverageRating = null;
    }

    // Get real earnings data
    let totalEarnings = 0;
    let completedJobsCount = 0;
    try {
      const workerEarnings = await db
        .select()
        .from(earnings)
        .where(and(
          eq(earnings.workerId, userId),
          gte(earnings.dateEarned, startDate)
        ));
      
      totalEarnings = workerEarnings.reduce((sum, earning) => sum + (earning.netAmount || 0), 0);
      
      // Get completed jobs count
      const acceptedJobIds = acceptedApplications.map(app => app.jobId);
      if (acceptedJobIds.length > 0) {
        const completedJobs = await db
          .select()
          .from(jobs)
          .where(and(
            jobs.id.in(acceptedJobIds),
            eq(jobs.status, 'completed')
          ));
        completedJobsCount = completedJobs.length;
      }
    } catch (error) {
      console.error('Error fetching worker earnings:', error);
    }

    // Calculate performance metrics
    const completionRate = acceptedApplications.length > 0 ? completedJobsCount / acceptedApplications.length : 0;
    const successRate = userApplications.length > 0 ? acceptedApplications.length / userApplications.length : 0;

    // Analytics data for worker
    const analyticsData = {
      overview: {
        totalApplications: userApplications.length,
        acceptedApplications: acceptedApplications.length,
        totalEarnings: totalEarnings,
        averageRating: workerAverageRating,
        completedJobs: completedJobsCount,
        successRate: successRate
      },
      trends: {
        applications: [],
        earnings: [],
        ratings: []
      },
      categories: [], // Will be populated with real job categories
      performance: {
        responseTime: successRate, // Application acceptance rate
        completionRate: completionRate,
        clientSatisfaction: workerAverageRating || 0
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
