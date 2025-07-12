import { User } from '../shared/schema';

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password: string;
      fullName?: string | null;
      email: string;
      phone?: string | null;
      bio?: string | null;
      skills?: string[] | null;
      profileImage?: string | null;
      location?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      rating?: number | null;
      completedJobs?: number | null;      accountType: string;
      isVerified?: boolean | null;
      paypalEmail?: string | undefined;
      paypalAccountStatus?: string | undefined;
      paypalTermsAccepted?: boolean | undefined;
      paypalTermsAcceptedAt?: Date | undefined;
      pushNotificationToken?: string | null;
      notificationPreferences?: unknown | null;
      isOnline?: boolean | null;
      lastActiveAt?: Date | null;
      verificationDocuments?: unknown | null;
      verificationStatus?: string | null;
      verificationSubmittedAt?: Date | null;
      verificationNotes?: string | null;
      phoneVerificationCode?: string | null;
      phoneVerificationExpiry?: Date | null;
      avatarUrl?: string | null;
      isActive?: boolean;
    }
  }
}

export {};
