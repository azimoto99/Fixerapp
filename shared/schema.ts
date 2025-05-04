import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, varchar, jsonb, uniqueIndex, date } from "drizzle-orm/pg-core";
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
  skills: text("skills").array(), // Array of skill names for workers
  rating: doublePrecision("rating"), // Average rating from completed jobs
  isActive: boolean("is_active").notNull().default(true),
  lastActive: timestamp("last_active").defaultNow(),
  // Social login fields
  googleId: text("google_id"), // Google OAuth ID
  facebookId: text("facebook_id") // Facebook OAuth ID
  // Note: The requiresProfileCompletion field doesn't exist in the DB yet
  // We'll handle this in code until we can properly migrate the database
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
  status: text("status").notNull().default("open"), // "open", "assigned", "completed", "canceled"
  paymentType: text("payment_type").notNull(), // "hourly" or "fixed"
  paymentAmount: doublePrecision("payment_amount").notNull(),
  serviceFee: doublePrecision("service_fee").notNull().default(2.5), // Service fee of $2.50
  totalAmount: doublePrecision("total_amount").notNull(), // Total amount including service fee
  location: text("location").notNull(), // Address description
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  datePosted: timestamp("date_posted").defaultNow(),
  dateNeeded: timestamp("date_needed").notNull(),
  requiredSkills: text("required_skills").array(), // Skills needed for the job
  equipmentProvided: boolean("equipment_provided").notNull().default(false),
});

// Applications for jobs
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(), // References jobs.id
  workerId: integer("worker_id").notNull(), // References users.id
  status: text("status").notNull().default("pending"), // "pending", "accepted", "rejected"
  message: text("message"),
  dateApplied: timestamp("date_applied").defaultNow(),
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
});

// Earnings table to track worker earnings
export const earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull(), // References users.id
  jobId: integer("job_id").notNull(), // References jobs.id
  amount: doublePrecision("amount").notNull(), // Amount earned for this job
  serviceFee: doublePrecision("service_fee").notNull().default(2.5), // Service fee amount
  netAmount: doublePrecision("net_amount").notNull(), // Net amount after service fee
  status: text("status").notNull().default("pending"), // "pending", "paid", "cancelled"
  dateEarned: timestamp("date_earned").defaultNow(), // When the job was completed
  datePaid: timestamp("date_paid"), // When the worker was paid
});

// Payments table to track payment transactions
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // References users.id (can be worker or poster)
  amount: doublePrecision("amount").notNull(), // Amount of the payment
  type: text("type").notNull(), // "payout" (to worker) or "charge" (from poster)
  status: text("status").notNull(), // "pending", "completed", "failed"
  paymentMethod: text("payment_method"), // e.g., "bank_transfer", "credit_card"
  transactionId: text("transaction_id"), // External payment processor ID
  jobId: integer("job_id"), // Optional reference to the related job
  description: text("description"), // Description of the payment
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"), // Additional payment data
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  rating: true,
  lastActive: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  datePosted: true,
  workerId: true,
  serviceFee: true,
  totalAmount: true,
}).extend({
  paymentAmount: z.number().min(10, "Minimum payment amount is $10"),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  dateApplied: true,
  status: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  dateReviewed: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  isCompleted: true,
  completedAt: true,
  completedBy: true,
});

export const insertEarningSchema = createInsertSchema(earnings).omit({
  id: true,
  dateEarned: true,
  datePaid: true,
  status: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect & {
  requiresProfileCompletion?: boolean; // Adding this field to the type even though it's not in the DB yet
};
export type InsertUser = z.infer<typeof insertUserSchema> & {
  requiresProfileCompletion?: boolean; // Adding this field to the type even though it's not in the DB
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
