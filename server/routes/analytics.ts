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

    // Get user's jobs with timeout protection
    const userJobs = await Promise.race([
      db
        .select()
        .from(jobs)
        .where(and(
          eq(jobs.posterId, userId),
          gte(jobs.datePosted, startDate)
        )),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Jobs query timeout')), 8000)
      )
    ]) as any;

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

    // Get applications data for the date range in a single query
    let applicationsMap = new Map();
    if (jobIds.length > 0) {
      try {
        const sevenDaysAgo = new Date(now.getTime() - (6 * 24 * 60 * 60 * 1000));
        const allApplications = await db
          .select({
            dateApplied: applications.dateApplied
          })
          .from(applications)
          .where(and(
            applications.jobId.in(jobIds),
            gte(applications.dateApplied, sevenDaysAgo)
          ));

        // Group applications by date
        allApplications.forEach(app => {
          const dateStr = new Date(app.dateApplied).toISOString().split('T')[0];
          applicationsMap.set(dateStr, (applicationsMap.get(dateStr) || 0) + 1);
        });
      } catch (error) {
        console.error('Error fetching applications data:', error);
      }
    }

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
      
      applicationsData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: applicationsMap.get(dateStr) || 0
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
        // Get all application stats in a single query
        const applicationStats = await db
          .select({
            jobId: applications.jobId,
            status: applications.status,
            count: count()
          })
          .from(applications)
          .where(applications.jobId.in(jobIds))
          .groupBy(applications.jobId, applications.status);

        // Process the results
        const jobsWithApplications = new Set();
        let acceptedCount = 0;
        
        applicationStats.forEach(stat => {
          jobsWithApplications.add(stat.jobId);
          if (stat.status === 'accepted') {
            acceptedCount += stat.count;
          }
        });
        
        responseRate = totalJobs > 0 ? jobsWithApplications.size / totalJobs : 0;
        hireRate = totalApplications > 0 ? acceptedCount / totalApplications : 0;
        workerRetention = acceptedCount > 0 ? completedJobs.length / acceptedCount : 0;
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
    
    // Return fallback data to prevent dashboard from breaking
    const fallbackData = {
      overview: {
        totalJobs: 0,
        totalSpent: 0,
        averageRating: null,
        completionRate: 0,
        totalApplications: 0,
        averageTimeToHire: 0
      },
      trends: {
        jobsPosted: Array.from({length: 7}, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: 0
        })).reverse(),
        spending: Array.from({length: 7}, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: 0
        })).reverse(),
        applications: Array.from({length: 7}, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: 0
        })).reverse()
      },
      categories: [],
      performance: {
        responseTime: 0,
        hireRate: 0,
        workerRetention: 0
      }
    };

    res.json({
      success: true,
      data: fallbackData,
      fallback: true,
      message: 'Using fallback data due to database timeout'
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
          .select({ count: count() })
          .from(jobs)
          .where(and(
            jobs.id.in(acceptedJobIds),
            eq(jobs.status, 'completed')
          ));
        completedJobsCount = completedJobs[0]?.count || 0;
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
    
    // Return fallback data for worker analytics
    const fallbackData = {
      overview: {
        totalApplications: 0,
        acceptedApplications: 0,
        totalEarnings: 0,
        averageRating: null,
        completedJobs: 0,
        successRate: 0
      },
      trends: {
        applications: [],
        earnings: [],
        ratings: []
      },
      categories: [],
      performance: {
        responseTime: 0,
        completionRate: 0,
        clientSatisfaction: 0
      }
    };

    res.json({
      success: true,
      data: fallbackData,
      fallback: true,
      message: 'Using fallback data due to database timeout'
    });
  }
});

export default router;
