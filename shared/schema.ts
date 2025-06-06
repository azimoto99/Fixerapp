import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, varchar, jsonb, uniqueIndex, date } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table with account type
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  accountType: text("account_type").notNull().default("worker"), // "worker", "poster", or "pending"
  skills: text("skills").array().notNull().default(sql`'{}'::text[]`), // Array of skill names for workers
  rating: doublePrecision("rating"), // Average rating from completed jobs
  isActive: boolean("is_active").notNull().default(true),
  isAdmin: boolean("is_admin").notNull().default(false), // Admin privileges
  lastActive: timestamp("last_active").defaultNow(),
  // Location data
  latitude: doublePrecision("latitude"), // Latitude coordinate for user's location
  longitude: doublePrecision("longitude"), // Longitude coordinate for user's location
  location: text("location"), // Human-readable location (address, city, etc.)
  // Social login fields
  googleId: text("google_id"), // Google OAuth ID
  facebookId: text("facebook_id"), // Facebook OAuth ID
  // Payment integration fields
  stripeCustomerId: text("stripe_customer_id"), // Stripe Customer ID for payments
  stripeConnectAccountId: text("stripe_connect_account_id"), // Stripe Connect account for receiving payments
  stripeConnectAccountStatus: text("stripe_connect_account_status"), // Status of Connect account
  // Terms acceptance fields
  stripeTermsAccepted: boolean("stripe_terms_accepted").default(false), // Whether user has accepted Stripe's TOS
  stripeTermsAcceptedAt: timestamp("stripe_terms_accepted_at"), // When the user accepted Stripe's TOS
  stripeRepresentativeName: text("stripe_representative_name"), // Name of the representative for Stripe verification
  stripeRepresentativeTitle: text("stripe_representative_title"), // Title of the representative for Stripe
  stripeRepresentativeRequirementsComplete: boolean("stripe_representative_requirements_complete").default(false), // Whether all representative details have been provided
  stripeBankingDetailsComplete: boolean("stripe_banking_details_complete").default(false), // Whether banking details have been provided
  // Contact preferences 
  contactPreferences: jsonb("contact_preferences").default({
    email: true,
    sms: false,
    push: true
  }), // User's preferences for notifications
  // Availability settings
  availability: jsonb("availability").default({
    weekdays: [true, true, true, true, true],
    weekend: [false, false],
    hourStart: 9,
    hourEnd: 17
  }), // User's weekly availability schedule
  // Verification status
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  identityVerified: boolean("identity_verified").default(false),
  verificationToken: text("verification_token"), // Token for email verification
  verificationTokenExpiry: timestamp("verification_token_expiry"), // Expiry for the verification token
  phoneVerificationCode: text("phone_verification_code"), // SMS verification code
  phoneVerificationExpiry: timestamp("phone_verification_expiry"), // Expiry for SMS verification code
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  datePosted: timestamp("date_posted").defaultNow(),
}, (table) => {
  // Create a unique constraint on the combination of email and accountType
  // This allows the same email to have multiple accounts with different types
  return {
    emailAccountTypeUnique: uniqueIndex("email_accounttype_unique").on(table.email, table.accountType)
  }
});

// Job postings table
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // e.g. "Home Maintenance", "Delivery", etc.
  posterId: integer("poster_id").notNull(), // References users.id
  workerId: integer("worker_id"), // References users.id (if assigned)
  status: text("status").notNull().default("open"), // "open", "assigned", "in_progress", "completed", "canceled"
  paymentType: text("payment_type").notNull(), // "hourly" or "fixed"
  paymentAmount: doublePrecision("payment_amount").notNull(),
  serviceFee: doublePrecision("service_fee").notNull().default(2.5), // Service fee of $2.50
  totalAmount: doublePrecision("total_amount").notNull(), // Total amount including service fee
  location: text("location").notNull(), // Address description
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  datePosted: timestamp("date_posted").defaultNow(),
  dateNeeded: timestamp("date_needed").notNull(),
  requiredSkills: text("required_skills").array().notNull().default(sql`'{}'::text[]`), // Skills needed for the job
  equipmentProvided: boolean("equipment_provided").notNull().default(false),
  autoAccept: boolean("auto_accept").notNull().default(false), // Auto accept applications
  startTime: timestamp("start_time"), // When work actually began
  clockInTime: timestamp("clock_in_time"), // When worker clocked in
  completionTime: timestamp("completion_time"), // When job was completed
  completedAt: timestamp("completed_at"), // When job was marked as completed
  shiftStartTime: text("shift_start_time"), // For hourly jobs: when the shift is scheduled to start (HH:MM format)
  shiftEndTime: text("shift_end_time"), // For hourly jobs: when the shift is scheduled to end (HH:MM format)
  workerTrackingEnabled: boolean("worker_tracking_enabled").default(true), // Whether to track worker location 
  verifyLocationToStart: boolean("verify_location_to_start").default(true), // Require worker to be at job location to start
  markerColor: text("marker_color"), // Color code for the job marker on the map
});

// Applications for jobs
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(), // References jobs.id
  workerId: integer("worker_id").notNull(), // References users.id
  status: text("status").notNull().default("pending"), // "pending", "accepted", "rejected"
  message: text("message"),
  dateApplied: timestamp("date_applied").defaultNow(),
  hourlyRate: doublePrecision("hourly_rate"), // Proposed hourly rate for hourly jobs
  expectedDuration: text("expected_duration"), // Worker's estimate of job duration
  coverLetter: text("cover_letter"), // Detailed message about worker's approach to the job
});

// Reviews for completed jobs
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(), // References jobs.id
  reviewerId: integer("reviewer_id").notNull(), // References users.id (poster or worker)
  revieweeId: integer("reviewee_id").notNull(), // References users.id (poster or worker)
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  dateReviewed: timestamp("date_reviewed").defaultNow(),
});

// Tasks for jobs
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(), // References jobs.id
  description: text("description").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by"), // References users.id (worker who completed the task)
  position: integer("position").notNull(), // Order position in the task list
  isOptional: boolean("is_optional").notNull().default(false), // Whether the task is optional (bonus)
  dueTime: timestamp("due_time"), // When the task is due
  estimatedDuration: integer("estimated_duration"), // Estimated time to complete in minutes
  location: text("location"), // Specific location for this task, if different from the job location
  latitude: doublePrecision("latitude"), // Task-specific latitude
  longitude: doublePrecision("longitude"), // Task-specific longitude
  bonusAmount: doublePrecision("bonus_amount"), // Additional payment for optional tasks
  notes: text("notes"), // Additional notes or instructions for the task
});

// Earnings table to track worker earnings
export const earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(), // References users.id
  userId: integer("user_id").notNull(), // References users.id (same as workerId for compatibility)
  jobId: integer("job_id"), // References jobs.id (optional for non-job earnings)
  amount: doublePrecision("amount").notNull(), // Total amount earned before fees
  serviceFee: doublePrecision("service_fee").notNull().default(2.5), // Service fee amount
  platformFee: doublePrecision("platform_fee").notNull().default(2.5), // Platform fee amount (alias for serviceFee)
  netAmount: doublePrecision("net_amount").notNull(), // Net amount after service fee
  status: text("status").notNull().default("pending"), // "pending", "paid", "cancelled"
  dateEarned: timestamp("date_earned").defaultNow(), // When the job was completed
  datePaid: timestamp("date_paid"), // When the worker was paid
  transactionId: text("transaction_id"), // Stripe transfer ID or other payment processor ID
  paymentId: integer("payment_id"), // References the associated payment record
  stripeAccountId: text("stripe_account_id"), // Worker's Stripe Connect account ID
  description: text("description"), // Description of the earnings
  metadata: jsonb("metadata"), // Additional data about the earnings
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments table to track payment transactions
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // References users.id (payer - usually job poster)
  workerId: integer("worker_id"), // References users.id (payee - usually worker)
  amount: doublePrecision("amount").notNull(), // Amount of the payment
  serviceFee: doublePrecision("service_fee"), // Platform fee amount
  type: text("type").notNull(), // "payment", "transfer", "refund", "payout"
  status: text("status").notNull(), // "pending", "processing", "completed", "failed", "refunded"
  paymentMethod: text("payment_method"), // "card", "bank_account", "stripe", etc.
  transactionId: text("transaction_id"), // External payment processor ID (Stripe payment/transfer ID)
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe Payment Intent ID
  stripeCustomerId: text("stripe_customer_id"), // Customer ID for the payer
  stripeConnectAccountId: text("stripe_connect_account_id"), // Connect account ID for the worker
  stripeRefundId: text("stripe_refund_id"), // Stripe Refund ID for refunds
  jobId: integer("job_id"), // Optional reference to the related job
  description: text("description"), // Description of the payment
  currency: text("currency").default("usd"), // Currency code
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"), // When the payment was completed
  metadata: jsonb("metadata"), // Additional payment data
});

// Badges and achievements table
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconUrl: text("icon_url").notNull(),
  category: text("category").notNull(), // "skill", "milestone", "reputation", etc.
  requirements: jsonb("requirements"), // Requirements to earn this badge
  tier: integer("tier").default(1), // 1, 2, 3, etc. for bronze, silver, gold
  createdAt: timestamp("created_at").defaultNow(),
});

// User badges junction table
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // References users.id
  badgeId: integer("badge_id").notNull(), // References badges.id
  earnedAt: timestamp("earned_at").defaultNow(),
  metadata: jsonb("metadata"), // Additional data about how the badge was earned
});

// Notifications table for system and job notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // References users.id (recipient)
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // "job_posted", "application_received", etc.
  isRead: boolean("is_read").notNull().default(false),
  sourceId: integer("source_id"), // Optional ID of related entity (job, application, etc.)
  sourceType: text("source_type"), // "job", "application", etc.
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"), // Additional data specific to notification type
});

// Contacts/Friends table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // References users.id (user who added the contact)
  contactId: integer("contact_id").notNull(), // References users.id (user who was added as contact)
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default("active"), // "active", "blocked", "pending"
  notes: text("notes"), // Optional notes about the contact
});

// Contact requests table for messaging system
export const contactRequests = pgTable("contact_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "rejected"
  message: text("message"), // Optional message with the request
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Messages table for job-specific real-time chat
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id), // Optional job context for messages
  senderId: integer("sender_id").notNull().references(() => users.id), // References users.id (sender)
  recipientId: integer("recipient_id").notNull().references(() => users.id), // References users.id (recipient)
  content: text("content").notNull(), // Message content
  messageType: varchar("message_type", { length: 20 }).default("text"), // "text", "image", "file"
  isRead: boolean("is_read").notNull().default(false), // Whether the message has been read
  sentAt: timestamp("sent_at").defaultNow(), // When the message was sent
  readAt: timestamp("read_at"), // When the message was read
  attachmentUrl: text("attachment_url"), // Optional URL for attachments
  attachmentType: text("attachment_type"), // Type of attachment: "image", "document", etc.
  isEdited: boolean("is_edited").default(false), // Whether the message was edited
  editedAt: timestamp("edited_at"), // When the message was last edited
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  phone: true,
  bio: true,
  avatarUrl: true,
  accountType: true,
  skills: true,
  isActive: true,
  isAdmin: true,
  latitude: true,
  longitude: true,
  location: true,
  googleId: true,
  facebookId: true,
  stripeCustomerId: true,
  stripeConnectAccountId: true,
  stripeConnectAccountStatus: true,
  stripeTermsAccepted: true,
  stripeTermsAcceptedAt: true,
  stripeRepresentativeName: true,
  stripeRepresentativeTitle: true,
  stripeRepresentativeRequirementsComplete: true,
  stripeBankingDetailsComplete: true,
  contactPreferences: true,
  availability: true,
  emailVerified: true,
  phoneVerified: true,
  identityVerified: true,
  verificationToken: true,
  verificationTokenExpiry: true,
  phoneVerificationCode: true,
  phoneVerificationExpiry: true,
});

export const insertJobSchema = createInsertSchema(jobs).pick({
  title: true,
  description: true,
  category: true,
  posterId: true,
  status: true,
  paymentType: true,
  paymentAmount: true,
  location: true,
  latitude: true,
  longitude: true,
  dateNeeded: true,
  requiredSkills: true,
  equipmentProvided: true,
  autoAccept: true,
  startTime: true,
  clockInTime: true,
  completionTime: true,
  shiftStartTime: true,
  shiftEndTime: true,
  workerTrackingEnabled: true,
  verifyLocationToStart: true,
  markerColor: true,
});

export const insertApplicationSchema = createInsertSchema(applications).pick({
  jobId: true,
  workerId: true,
  status: true,
  message: true,
  hourlyRate: true,
  expectedDuration: true,
  coverLetter: true,
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  jobId: true,
  reviewerId: true,
  revieweeId: true,
  rating: true,
  comment: true,
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  jobId: true,
  description: true,
  position: true,
  isOptional: true,
  dueTime: true,
  estimatedDuration: true,
  location: true,
  latitude: true,
  longitude: true,
  bonusAmount: true,
  notes: true,
});

export const insertEarningSchema = createInsertSchema(earnings).pick({
  workerId: true,
  userId: true,
  jobId: true,
  amount: true,
  serviceFee: true,
  platformFee: true,
  netAmount: true,
  status: true,
  description: true,
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  userId: true,
  workerId: true,
  amount: true,
  serviceFee: true,
  type: true,
  status: true,
  paymentMethod: true,
  transactionId: true,
  stripePaymentIntentId: true,
  stripeCustomerId: true,
  stripeConnectAccountId: true,
  stripeRefundId: true,
  jobId: true,
  description: true,
  currency: true,
  metadata: true,
});

export const insertBadgeSchema = createInsertSchema(badges).pick({
  name: true,
  description: true,
  iconUrl: true,
  category: true,
  requirements: true,
  tier: true,
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).pick({
  userId: true,
  badgeId: true,
  earnedAt: true,
  metadata: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  message: true,
  type: true,
  sourceId: true,
  sourceType: true,
  metadata: true,
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  userId: true,
  contactId: true,
  status: true,
  notes: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  jobId: true,
  senderId: true,
  recipientId: true,
  content: true,
  messageType: true,
  isRead: true,
  sentAt: true,
  readAt: true,
  attachmentUrl: true,
  attachmentType: true,
  isEdited: true,
  editedAt: true,
});

export const insertContactRequestSchema = createInsertSchema(contactRequests).pick({
  senderId: true,
  receiverId: true,
  status: true,
  message: true,
});

// Types
export type DbUser = typeof users.$inferSelect & {
  requiresProfileCompletion?: boolean | null;
  needsAccountType?: boolean | null;
  skillsVerified?: Record<string, boolean>;
  completedJobs?: number;
  successRate?: number;
  responseTime?: number;
  badgeIds?: string[];
  requiresStripeTerms?: boolean;
  requiresStripeRepresentative?: boolean;
  requiresStripeBankingDetails?: boolean;
  profileCompletionPercentage?: number;
  stripeConnectId?: string;
};

export type ContactPreferences = {
  email: boolean;
  sms: boolean;
  push: boolean;
};

export type Availability = {
  weekdays: boolean[];
  weekend: boolean[];
  hourStart: number;
  hourEnd: number;
};

export type InsertUser = z.infer<typeof insertUserSchema> & {
  requiresProfileCompletion?: boolean | null;
  needsAccountType?: boolean | null;
  skillsVerified?: Record<string, boolean>;
  requiresStripeTerms?: boolean;
  requiresStripeRepresentative?: boolean;
  requiresStripeBankingDetails?: boolean;
  contactPreferences?: ContactPreferences;
  availability?: Availability;
};

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Earning = typeof earnings.$inferSelect;
export type InsertEarning = z.infer<typeof insertEarningSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Add missing Contact types
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type ContactRequest = typeof contactRequests.$inferSelect;
export type InsertContactRequest = z.infer<typeof insertContactRequestSchema>;

// Support tickets table
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "technical", "billing", "general", "dispute"
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high", "urgent"
  status: text("status").notNull().default("open"), // "open", "in_progress", "resolved", "closed"
  jobId: integer("job_id").references(() => jobs.id), // Optional job reference
  assignedTo: integer("assigned_to").references(() => users.id), // Admin user assigned to ticket
  resolution: text("resolution"), // Final resolution description
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"), // When the ticket was resolved
});

// Support ticket messages
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").notNull().default(false), // Admin-only messages
  attachmentUrl: text("attachment_url"), // Optional file attachment
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Disputes table for payment/job disputes
export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  raisedBy: integer("raised_by").notNull().references(() => users.id),
  against: integer("against").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  evidence: jsonb("evidence"), // Files, screenshots, etc.
  status: text("status").notNull().default("open"), // "open", "investigating", "resolved", "closed"
  amount: doublePrecision("amount"), // Disputed amount if applicable
  resolution: text("resolution"), // Final resolution
  resolvedBy: integer("resolved_by").references(() => users.id), // Admin who resolved
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets);
export const insertSupportMessageSchema = createInsertSchema(supportMessages);
export const insertDisputeSchema = createInsertSchema(disputes);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;

export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;

// Refunds tracking
export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  originalAmount: doublePrecision("original_amount").notNull(),
  refundAmount: doublePrecision("refund_amount").notNull(),
  reason: text("reason"),
  stripeRefundId: varchar("stripe_refund_id", { length: 100 }),
  processedBy: integer("processed_by"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
});

// Categories enum for job types
export const JOB_CATEGORIES = [
  "Home Maintenance",
  "Cleaning",
  "Delivery",
  "Event Help",
  "Moving",
  "Tech Support",
  "Shopping",
  "Pet Care",
  "Tutoring",
  "Other"
] as const;

// Skills list
export const SKILLS = [
  "Cleaning",
  "Organization",
  "Decoration",
  "Heavy Lifting",
  "Driving",
  "Computer Repair",
  "Gardening",
  "Cooking",
  "Pet Care",
  "Child Care",
  "Electrical",
  "Plumbing",
  "Painting",
  "Assembly",
  "Tutoring",
  "Photography",
  "Design",
  "Writing"
] as const;

// Badge categories
export const BADGE_CATEGORIES = [
  "Skill Mastery",
  "Milestone",
  "Job Completion",
  "Reputation",
  "Customer Satisfaction",
  "Speed",
  "Reliability",
  "Special Achievement"
] as const;

// Notification types
export const NOTIFICATION_TYPES = [
  "job_posted",
  "job_assigned",
  "job_completed",
  "application_received",
  "application_accepted",
  "application_rejected",
  "payment_received",
  "payment_sent",
  "review_received",
  "system_message"
] as const;

// ============================================
// ADMIN SYSTEM TABLES
// ============================================

// Admin users table for secure admin access
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(), // Link to regular user
  role: text("role").notNull().default("admin"), // "super_admin", "admin", "moderator", "support"
  permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`), // Array of permission strings
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id), // Who created this admin
});

// Admin action audit log for security tracking
export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => adminUsers.id).notNull(),
  action: text("action").notNull(), // "user_ban", "job_edit", "financial_review", etc.
  targetType: text("target_type").notNull(), // "user", "job", "transaction", etc.
  targetId: integer("target_id"), // ID of the affected record
  details: jsonb("details").default({}), // Additional action details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Platform analytics data for dashboard
export const platformAnalytics = pgTable("platform_analytics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(), // Date for daily analytics
  totalUsers: integer("total_users").default(0),
  newUsers: integer("new_users").default(0),
  activeUsers: integer("active_users").default(0),
  totalJobs: integer("total_jobs").default(0),
  jobsPosted: integer("jobs_posted").default(0),
  jobsCompleted: integer("jobs_completed").default(0),
  totalRevenue: doublePrecision("total_revenue").default(0),
  platformFees: doublePrecision("platform_fees").default(0),
  payouts: doublePrecision("payouts").default(0),
  completionRate: doublePrecision("completion_rate").default(0),
  averageJobValue: doublePrecision("average_job_value").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User strikes and moderation actions
export const userStrikes = pgTable("user_strikes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  adminId: integer("admin_id").references(() => adminUsers.id),
  type: text("type").notNull(), // "warning", "strike", "suspension", "ban"
  reason: text("reason").notNull(),
  details: text("details"),
  jobId: integer("job_id").references(() => jobs.id), // Related job if applicable
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"), // For temporary suspensions
  createdAt: timestamp("created_at").defaultNow(),
});

// User reports for moderation queue
export const userReports = pgTable("user_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").references(() => users.id).notNull(),
  reportedUserId: integer("reported_user_id").references(() => users.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id), // Related job if applicable
  category: text("category").notNull(), // "inappropriate_behavior", "fraud", "no_show", etc.
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high", "critical"
  status: text("status").notNull().default("pending"), // "pending", "reviewed", "resolved", "dismissed"
  assignedTo: integer("assigned_to").references(() => adminUsers.id),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System alerts and notifications for admins
export const systemAlerts = pgTable("system_alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "payment_failure", "system_error", "security_breach", etc.
  severity: text("severity").notNull().default("medium"), // "low", "medium", "high", "critical"
  title: text("title").notNull(),
  description: text("description").notNull(),
  details: jsonb("details").default({}),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedBy: integer("resolved_by").references(() => adminUsers.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Platform configuration settings
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"), // "general", "payment", "moderation", etc.
  updatedBy: integer("updated_by").references(() => adminUsers.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers).pick({
  userId: true,
  role: true,
  permissions: true,
  isActive: true,
  lastLogin: true,
  createdBy: true
});

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLog).pick({
  adminId: true,
  action: true,
  targetType: true,
  targetId: true,
  details: true,
  ipAddress: true,
  userAgent: true,
});

export const insertPlatformAnalyticsSchema = createInsertSchema(platformAnalytics).pick({
  date: true,
  totalUsers: true,
  newUsers: true,
  activeUsers: true,
  totalJobs: true,
  jobsPosted: true,
  jobsCompleted: true,
  totalRevenue: true,
  platformFees: true,
  payouts: true,
  completionRate: true,
  averageJobValue: true,
});

export const insertUserStrikeSchema = createInsertSchema(userStrikes).pick({
  userId: true,
  adminId: true,
  type: true,
  reason: true,
  details: true,
  jobId: true,
  isActive: true,
  expiresAt: true,
});

export const insertUserReportSchema = createInsertSchema(userReports).pick({
  reporterId: true,
  reportedUserId: true,
  jobId: true,
  category: true,
  description: true,
  priority: true,
  status: true,
  assignedTo: true,
  resolution: true,
  resolvedAt: true,
});

export const insertSystemAlertSchema = createInsertSchema(systemAlerts).pick({
  type: true,
  severity: true,
  title: true,
  description: true,
  details: true,
  isResolved: true,
  resolvedBy: true,
  resolvedAt: true,
});

export const insertPlatformSettingsSchema = createInsertSchema(platformSettings).pick({
  key: true,
  value: true,
  description: true,
  category: true,
  updatedBy: true,
});

// Admin types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;

export type PlatformAnalytics = typeof platformAnalytics.$inferSelect;
export type InsertPlatformAnalytics = z.infer<typeof insertPlatformAnalyticsSchema>;

export type UserStrike = typeof userStrikes.$inferSelect;
export type InsertUserStrike = z.infer<typeof insertUserStrikeSchema>;

export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;

export type SystemAlert = typeof systemAlerts.$inferSelect;
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertPlatformSettings = z.infer<typeof insertPlatformSettingsSchema>;

// Admin permission constants
export const ADMIN_ROLES = [
  "super_admin",
  "admin", 
  "moderator",
  "support"
] as const;

export const ADMIN_PERMISSIONS = [
  "users_view",
  "users_edit", 
  "users_ban",
  "jobs_view",
  "jobs_edit",
  "jobs_moderate",
  "financial_view",
  "financial_edit",
  "analytics_view",
  "system_config",
  "admin_manage"
] as const;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  stripeCustomerId: z.string().optional(),
});

export const walletSchema = z.object({
  id: z.string(),
  userId: z.string(),
  balance: z.number(),
  pendingBalance: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const transactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  amount: z.number(),
  type: z.enum(['CREDIT', 'DEBIT']),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RawUser = z.infer<typeof userSchema>;


