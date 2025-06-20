import { storage } from '../storage';
import { encryptSensitiveData, decryptSensitiveData, sanitizeForLogging } from './encryption';

export interface PrivacySettings {
  userId: number;
  showLocationToAll: boolean;
  showLocationToJobPosters: boolean;
  showLocationRadius: number; // in meters
  showPhoneToAll: boolean;
  showPhoneToJobPosters: boolean;
  showEmailToAll: boolean;
  showEmailToJobPosters: boolean;
  showFullNameToAll: boolean;
  showFullNameToJobPosters: boolean;
  showProfilePictureToAll: boolean;
  showRatingsToAll: boolean;
  showJobHistoryToAll: boolean;
  allowMessagesFromAll: boolean;
  allowMessagesFromJobPostersOnly: boolean;
  allowJobRecommendations: boolean;
  allowMarketingEmails: boolean;
  allowPushNotifications: boolean;
  dataRetentionPeriod: number; // in days, 0 = indefinite
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDataVisibility {
  canSeeLocation: boolean;
  canSeePhone: boolean;
  canSeeEmail: boolean;
  canSeeFullName: boolean;
  canSeeProfilePicture: boolean;
  canSeeRatings: boolean;
  canSeeJobHistory: boolean;
  canSendMessages: boolean;
  locationAccuracy: 'exact' | 'approximate' | 'hidden';
}

class PrivacyControlsService {
  
  /**
   * Get default privacy settings for new users
   */
  getDefaultPrivacySettings(userId: number): PrivacySettings {
    return {
      userId,
      showLocationToAll: false,
      showLocationToJobPosters: true,
      showLocationRadius: 1000, // 1km radius by default
      showPhoneToAll: false,
      showPhoneToJobPosters: true,
      showEmailToAll: false,
      showEmailToJobPosters: false,
      showFullNameToAll: false,
      showFullNameToJobPosters: true,
      showProfilePictureToAll: true,
      showRatingsToAll: true,
      showJobHistoryToAll: false,
      allowMessagesFromAll: false,
      allowMessagesFromJobPostersOnly: true,
      allowJobRecommendations: true,
      allowMarketingEmails: false,
      allowPushNotifications: true,
      dataRetentionPeriod: 0, // Keep indefinitely by default
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get user's privacy settings
   */
  async getUserPrivacySettings(userId: number): Promise<PrivacySettings> {
    try {
      // Try to get existing settings from database
      const settings = await storage.getUserPrivacySettings?.(userId);
      
      if (settings) {
        return settings;
      }
      
      // Return default settings if none exist
      return this.getDefaultPrivacySettings(userId);
    } catch (error) {
      console.error('Error getting privacy settings:', sanitizeForLogging(error));
      return this.getDefaultPrivacySettings(userId);
    }
  }

  /**
   * Update user's privacy settings
   */
  async updateUserPrivacySettings(userId: number, updates: Partial<PrivacySettings>): Promise<PrivacySettings> {
    try {
      const currentSettings = await this.getUserPrivacySettings(userId);
      
      const updatedSettings: PrivacySettings = {
        ...currentSettings,
        ...updates,
        userId,
        updatedAt: new Date()
      };

      // Save to database
      await storage.updateUserPrivacySettings?.(userId, updatedSettings);
      
      console.log(`Privacy settings updated for user ${userId}`);
      return updatedSettings;
    } catch (error) {
      console.error('Error updating privacy settings:', sanitizeForLogging(error));
      throw new Error('Failed to update privacy settings');
    }
  }

  /**
   * Check what data viewer can see about target user
   */
  async checkDataVisibility(
    viewerUserId: number, 
    targetUserId: number, 
    context: 'public' | 'job_application' | 'job_posting' | 'messaging' = 'public'
  ): Promise<UserDataVisibility> {
    try {
      // Get target user's privacy settings
      const privacySettings = await this.getUserPrivacySettings(targetUserId);
      
      // Check if viewer is the same as target (can see everything)
      if (viewerUserId === targetUserId) {
        return {
          canSeeLocation: true,
          canSeePhone: true,
          canSeeEmail: true,
          canSeeFullName: true,
          canSeeProfilePicture: true,
          canSeeRatings: true,
          canSeeJobHistory: true,
          canSendMessages: true,
          locationAccuracy: 'exact'
        };
      }

      // Check if viewer is in a job-related context
      const isJobContext = context === 'job_application' || context === 'job_posting';
      
      return {
        canSeeLocation: isJobContext 
          ? privacySettings.showLocationToJobPosters 
          : privacySettings.showLocationToAll,
        canSeePhone: isJobContext 
          ? privacySettings.showPhoneToJobPosters 
          : privacySettings.showPhoneToAll,
        canSeeEmail: isJobContext 
          ? privacySettings.showEmailToJobPosters 
          : privacySettings.showEmailToAll,
        canSeeFullName: isJobContext 
          ? privacySettings.showFullNameToJobPosters 
          : privacySettings.showFullNameToAll,
        canSeeProfilePicture: privacySettings.showProfilePictureToAll,
        canSeeRatings: privacySettings.showRatingsToAll,
        canSeeJobHistory: privacySettings.showJobHistoryToAll,
        canSendMessages: privacySettings.allowMessagesFromAll || 
          (isJobContext && privacySettings.allowMessagesFromJobPostersOnly),
        locationAccuracy: this.getLocationAccuracy(privacySettings, isJobContext)
      };
    } catch (error) {
      console.error('Error checking data visibility:', sanitizeForLogging(error));
      
      // Return restrictive defaults on error
      return {
        canSeeLocation: false,
        canSeePhone: false,
        canSeeEmail: false,
        canSeeFullName: false,
        canSeeProfilePicture: true,
        canSeeRatings: true,
        canSeeJobHistory: false,
        canSendMessages: false,
        locationAccuracy: 'hidden'
      };
    }
  }

  /**
   * Filter user data based on privacy settings
   */
  async filterUserData(
    user: any, 
    viewerUserId: number, 
    context: 'public' | 'job_application' | 'job_posting' | 'messaging' = 'public'
  ): Promise<any> {
    const visibility = await this.checkDataVisibility(viewerUserId, user.id, context);
    
    const filteredUser = { ...user };
    
    // Filter based on visibility settings
    if (!visibility.canSeePhone) {
      delete filteredUser.phone;
    }
    
    if (!visibility.canSeeEmail) {
      delete filteredUser.email;
    }
    
    if (!visibility.canSeeFullName) {
      filteredUser.fullName = filteredUser.username || 'User';
    }
    
    if (!visibility.canSeeProfilePicture) {
      delete filteredUser.profilePicture;
      delete filteredUser.avatarUrl;
    }
    
    if (!visibility.canSeeLocation) {
      delete filteredUser.latitude;
      delete filteredUser.longitude;
      delete filteredUser.address;
      delete filteredUser.city;
      delete filteredUser.state;
      delete filteredUser.zipCode;
    } else if (visibility.locationAccuracy === 'approximate') {
      // Approximate location by adding random offset
      if (filteredUser.latitude && filteredUser.longitude) {
        const offset = 0.01; // ~1km offset
        filteredUser.latitude += (Math.random() - 0.5) * offset;
        filteredUser.longitude += (Math.random() - 0.5) * offset;
        delete filteredUser.address; // Don't show exact address
      }
    }
    
    if (!visibility.canSeeRatings) {
      delete filteredUser.averageRating;
      delete filteredUser.totalRatings;
    }
    
    if (!visibility.canSeeJobHistory) {
      delete filteredUser.completedJobs;
      delete filteredUser.jobHistory;
    }
    
    return filteredUser;
  }

  /**
   * Get location accuracy level
   */
  private getLocationAccuracy(settings: PrivacySettings, isJobContext: boolean): 'exact' | 'approximate' | 'hidden' {
    const canSeeLocation = isJobContext 
      ? settings.showLocationToJobPosters 
      : settings.showLocationToAll;
    
    if (!canSeeLocation) {
      return 'hidden';
    }
    
    // If radius is large (>5km), show approximate location
    if (settings.showLocationRadius > 5000) {
      return 'approximate';
    }
    
    return 'exact';
  }

  /**
   * Check if user can send messages to another user
   */
  async canSendMessage(senderUserId: number, recipientUserId: number, jobContext?: boolean): Promise<boolean> {
    const visibility = await this.checkDataVisibility(
      senderUserId, 
      recipientUserId, 
      jobContext ? 'job_application' : 'messaging'
    );
    
    return visibility.canSendMessages;
  }

  /**
   * Anonymize user data for public display
   */
  anonymizeUserData(user: any): any {
    return {
      id: user.id,
      username: user.username || 'Anonymous',
      profilePicture: user.profilePicture,
      averageRating: user.averageRating,
      totalRatings: user.totalRatings,
      isVerified: user.isVerified || false,
      accountType: user.accountType,
      joinedAt: user.createdAt
    };
  }

  /**
   * Log privacy-related actions for audit
   */
  async logPrivacyAction(
    userId: number, 
    action: string, 
    details: any, 
    ipAddress?: string
  ): Promise<void> {
    try {
      const logEntry = {
        userId,
        action,
        details: sanitizeForLogging(details),
        ipAddress,
        timestamp: new Date()
      };
      
      // Store in audit log
      await storage.createAuditLog?.({
        userId,
        action: `privacy_${action}`,
        details: JSON.stringify(logEntry),
        ipAddress,
        timestamp: new Date()
      });
      
      console.log(`Privacy action logged: ${action} for user ${userId}`);
    } catch (error) {
      console.error('Error logging privacy action:', error);
    }
  }

  /**
   * Get data retention policy for user
   */
  async getDataRetentionPolicy(userId: number): Promise<{
    retentionPeriod: number;
    canDelete: boolean;
    scheduledDeletion?: Date;
  }> {
    const settings = await this.getUserPrivacySettings(userId);
    
    return {
      retentionPeriod: settings.dataRetentionPeriod,
      canDelete: settings.dataRetentionPeriod > 0,
      scheduledDeletion: settings.dataRetentionPeriod > 0 
        ? new Date(Date.now() + settings.dataRetentionPeriod * 24 * 60 * 60 * 1000)
        : undefined
    };
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(userId: number): Promise<any> {
    try {
      const user = await storage.getUser(userId);
      const privacySettings = await this.getUserPrivacySettings(userId);
      
      // Get all user-related data
      const userData = {
        profile: user,
        privacySettings,
        jobs: await storage.getJobsByUserId?.(userId) || [],
        applications: await storage.getApplicationsByUserId?.(userId) || [],
        payments: await storage.getPaymentsByUserId?.(userId) || [],
        messages: await storage.getMessagesByUserId?.(userId) || [],
        ratings: await storage.getRatingsByUserId?.(userId) || []
      };
      
      await this.logPrivacyAction(userId, 'data_export', { 
        exportedAt: new Date(),
        dataTypes: Object.keys(userData)
      });
      
      return userData;
    } catch (error) {
      console.error('Error exporting user data:', sanitizeForLogging(error));
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete user data (Right to be forgotten)
   */
  async deleteUserData(userId: number, reason: string): Promise<void> {
    try {
      await this.logPrivacyAction(userId, 'data_deletion_requested', { 
        reason,
        requestedAt: new Date()
      });
      
      // Mark user for deletion (don't immediately delete to maintain referential integrity)
      await storage.updateUser(userId, {
        isActive: false,
        deletionScheduled: true,
        deletionReason: reason,
        deletionRequestedAt: new Date()
      });
      
      console.log(`User ${userId} marked for data deletion: ${reason}`);
    } catch (error) {
      console.error('Error scheduling user data deletion:', sanitizeForLogging(error));
      throw new Error('Failed to schedule data deletion');
    }
  }
}

export const privacyControls = new PrivacyControlsService();
export default privacyControls; 