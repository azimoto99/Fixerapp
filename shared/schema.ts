import { pgTable, text, serial, integer, boolean, doublePrecision, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table with account type
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  accountType: text("account_type").notNull().default("worker"), // "worker" or "poster"
  skills: text("skills").array(), // Array of skill names for workers
  rating: doublePrecision("rating"), // Average rating from completed jobs
  isActive: boolean("is_active").notNull().default(true),
  lastActive: timestamp("last_active").defaultNow(),
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

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
