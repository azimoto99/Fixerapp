import { storage } from './storage';
import { auditService } from './audit-service';

interface ContentModerationRule {
  id: string;
  type: 'keyword' | 'pattern' | 'length' | 'frequency';
  rule: string | RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'flag' | 'reject' | 'auto_approve' | 'review';
  description: string;
}

interface ModerationResult {
  passed: boolean;
  flags: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'approve' | 'flag' | 'reject' | 'review';
  details: string[];
}

class ContentModerationService {
  private moderationRules: ContentModerationRule[] = [
    // Prohibited keywords
    {
      id: 'inappropriate_language',
      type: 'keyword',
      rule: /\b(explicit|inappropriate|offensive)\b/i,
      severity: 'high',
      action: 'flag',
      description: 'Contains inappropriate language'
    },
    // Suspicious patterns
    {
      id: 'contact_info_sharing',
      type: 'pattern',
      rule: /\b(\d{3}[-.]?\d{3}[-.]?\d{4}|\w+@\w+\.\w+)\b/,
      severity: 'medium',
      action: 'review',
      description: 'Contains potential contact information'
    },
    // Minimum content requirements
    {
      id: 'minimum_description_length',
      type: 'length',
      rule: '20',
      severity: 'low',
      action: 'flag',
      description: 'Description too short (minimum 20 characters)'
    },
    // Suspicious pricing
    {
      id: 'suspicious_pricing',
      type: 'pattern',
      rule: /\$0\.0[0-9]|\$0\b/,
      severity: 'medium',
      action: 'review',
      description: 'Suspiciously low pricing detected'
    },
    // Spam detection
    {
      id: 'repeated_characters',
      type: 'pattern',
      rule: /(.)\1{4,}/,
      severity: 'medium',
      action: 'flag',
      description: 'Contains repeated characters (possible spam)'
    }
  ];

  async moderateJobContent(jobData: any): Promise<ModerationResult> {
    const flags: string[] = [];
    const details: string[] = [];
    let highestSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let recommendedAction: 'approve' | 'flag' | 'reject' | 'review' = 'approve';

    const contentToCheck = [
      jobData.title || '',
      jobData.description || '',
      jobData.location || ''
    ].join(' ');

    for (const rule of this.moderationRules) {
      const violation = this.checkRule(rule, contentToCheck, jobData);
      
      if (violation) {
        flags.push(rule.id);
        details.push(rule.description);
        
        // Update severity and action based on highest priority violation
        if (this.getSeverityLevel(rule.severity) > this.getSeverityLevel(highestSeverity)) {
          highestSeverity = rule.severity;
          recommendedAction = rule.action as any;
        }
      }
    }

    return {
      passed: flags.length === 0,
      flags,
      severity: highestSeverity,
      action: recommendedAction,
      details
    };
  }

  private checkRule(rule: ContentModerationRule, content: string, jobData: any): boolean {
    switch (rule.type) {
      case 'keyword':
      case 'pattern':
        const regex = rule.rule instanceof RegExp ? rule.rule : new RegExp(rule.rule, 'i');
        return regex.test(content);
      
      case 'length':
        const minLength = parseInt(rule.rule as string);
        return (jobData.description || '').length < minLength;
      
      case 'frequency':
        // Check for repeated submissions by same user
        return false; // Would need database check
      
      default:
        return false;
    }
  }

  private getSeverityLevel(severity: string): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity] || 1;
  }

  async flagJobForReview(jobId: number, reason: string, flaggedBy: number) {
    try {
      // Create moderation record
      const moderationRecord = {
        jobId,
        flaggedBy,
        reason,
        status: 'pending',
        flaggedAt: new Date()
      };

      // Store in database (would need moderation table)
      console.log('Job flagged for review:', moderationRecord);

      // Update job status
      await storage.updateJob(jobId, { 
        status: 'under_review',
        moderationStatus: 'flagged'
      });

      // Log audit trail
      await auditService.logAdminAction({
        adminId: flaggedBy,
        action: 'flag_job_for_review',
        resourceType: 'job',
        resourceId: jobId.toString(),
        details: { reason },
        success: true
      });

      return { success: true, message: 'Job flagged for review' };
    } catch (error) {
      console.error('Error flagging job:', error);
      throw error;
    }
  }

  async approveJob(jobId: number, approvedBy: number, notes?: string) {
    try {
      await storage.updateJob(jobId, {
        status: 'open',
        moderationStatus: 'approved',
        approvedBy,
        approvedAt: new Date(),
        moderationNotes: notes
      });

      await auditService.logAdminAction({
        adminId: approvedBy,
        action: 'approve_job',
        resourceType: 'job',
        resourceId: jobId.toString(),
        details: { notes },
        success: true
      });

      return { success: true, message: 'Job approved successfully' };
    } catch (error) {
      console.error('Error approving job:', error);
      throw error;
    }
  }

  async rejectJob(jobId: number, rejectedBy: number, reason: string) {
    try {
      await storage.updateJob(jobId, {
        status: 'rejected',
        moderationStatus: 'rejected',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason
      });

      await auditService.logAdminAction({
        adminId: rejectedBy,
        action: 'reject_job',
        resourceType: 'job',
        resourceId: jobId.toString(),
        details: { reason },
        success: true
      });

      return { success: true, message: 'Job rejected successfully' };
    } catch (error) {
      console.error('Error rejecting job:', error);
      throw error;
    }
  }

  async bulkJobAction(jobIds: number[], action: 'approve' | 'reject' | 'flag', adminId: number, reason?: string) {
    try {
      const results = [];
      
      for (const jobId of jobIds) {
        let result;
        
        switch (action) {
          case 'approve':
            result = await this.approveJob(jobId, adminId, reason);
            break;
          case 'reject':
            result = await this.rejectJob(jobId, adminId, reason || 'Bulk rejection');
            break;
          case 'flag':
            result = await this.flagJobForReview(jobId, reason || 'Bulk flagging', adminId);
            break;
          default:
            result = { success: false, message: 'Invalid action' };
        }
        
        results.push({ jobId, ...result });
      }

      return {
        success: true,
        results,
        processed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('Error in bulk job action:', error);
      throw error;
    }
  }

  async getJobAnalytics(startDate?: Date, endDate?: Date) {
    try {
      const jobs = await storage.getAllJobs();
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const filteredJobs = jobs.filter(job => {
        const createdAt = job.createdAt || new Date();
        return createdAt >= start && createdAt <= end;
      });

      const analytics = {
        totalJobs: filteredJobs.length,
        approvedJobs: filteredJobs.filter(j => j.status === 'open' || j.status === 'completed').length,
        rejectedJobs: filteredJobs.filter(j => j.status === 'rejected').length,
        pendingJobs: filteredJobs.filter(j => j.status === 'under_review').length,
        flaggedJobs: filteredJobs.filter(j => j.moderationStatus === 'flagged').length,
        
        jobsByCategory: this.groupByField(filteredJobs, 'category'),
        jobsByStatus: this.groupByField(filteredJobs, 'status'),
        jobsByLocation: this.groupByField(filteredJobs, 'location'),
        
        averageJobValue: filteredJobs.length > 0 
          ? filteredJobs.reduce((sum, j) => sum + (j.paymentAmount || 0), 0) / filteredJobs.length 
          : 0,
        
        moderationMetrics: {
          autoApproved: filteredJobs.filter(j => j.moderationStatus === 'auto_approved').length,
          manualReview: filteredJobs.filter(j => j.moderationStatus === 'flagged').length,
          rejectionRate: filteredJobs.length > 0 
            ? (filteredJobs.filter(j => j.status === 'rejected').length / filteredJobs.length) * 100 
            : 0
        }
      };

      return analytics;
    } catch (error) {
      console.error('Error getting job analytics:', error);
      throw error;
    }
  }

  private groupByField(jobs: any[], field: string) {
    return jobs.reduce((acc, job) => {
      const value = job[field] || 'Unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  async getModerationQueue(filters?: {
    status?: string;
    severity?: string;
    flaggedBy?: number;
    limit?: number;
  }) {
    try {
      const jobs = await storage.getAllJobs();
      
      // Filter jobs that need moderation
      let moderationQueue = jobs.filter(job => 
        job.status === 'under_review' || 
        job.moderationStatus === 'flagged' ||
        job.moderationStatus === 'pending'
      );

      // Apply additional filters
      if (filters?.status) {
        moderationQueue = moderationQueue.filter(job => job.status === filters.status);
      }

      if (filters?.limit) {
        moderationQueue = moderationQueue.slice(0, filters.limit);
      }

      // Sort by flagged date (most recent first)
      moderationQueue.sort((a, b) => {
        const dateA = a.flaggedAt || a.createdAt || new Date(0);
        const dateB = b.flaggedAt || b.createdAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      return {
        queue: moderationQueue,
        total: moderationQueue.length,
        pending: moderationQueue.filter(j => j.moderationStatus === 'pending').length,
        flagged: moderationQueue.filter(j => j.moderationStatus === 'flagged').length,
        underReview: moderationQueue.filter(j => j.status === 'under_review').length
      };
    } catch (error) {
      console.error('Error getting moderation queue:', error);
      throw error;
    }
  }
}

export const contentModerationService = new ContentModerationService();