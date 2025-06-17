import { pgTable, foreignKey, serial, integer, text, boolean, timestamp, jsonb, doublePrecision, varchar, date, index, json, unique, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const adminUsers = pgTable("admin_users", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	role: text().default('admin').notNull(),
	permissions: text().array().default([""]).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	createdBy: integer("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "admin_users_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "admin_users_user_id_users_id_fk"
		}),
]);

export const badges = pgTable("badges", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	iconUrl: text("icon_url").notNull(),
	category: text().notNull(),
	requirements: jsonb(),
	tier: integer().default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const contacts = pgTable("contacts", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	contactId: integer("contact_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	status: text().default('active').notNull(),
	notes: text(),
});

export const contactRequests = pgTable("contact_requests", {
	id: serial().primaryKey().notNull(),
	senderId: integer("sender_id").notNull(),
	receiverId: integer("receiver_id").notNull(),
	status: text().default('pending').notNull(),
	message: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.receiverId],
			foreignColumns: [users.id],
			name: "contact_requests_receiver_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "contact_requests_sender_id_users_id_fk"
		}),
]);

export const earnings = pgTable("earnings", {
	id: serial().primaryKey().notNull(),
	workerId: integer("worker_id").notNull(),
	userId: integer("user_id").notNull(),
	jobId: integer("job_id"),
	amount: doublePrecision().notNull(),
	serviceFee: doublePrecision("service_fee").default(2.5).notNull(),
	platformFee: doublePrecision("platform_fee").default(2.5).notNull(),
	netAmount: doublePrecision("net_amount").notNull(),
	status: text().default('pending').notNull(),
	dateEarned: timestamp("date_earned", { mode: 'string' }).defaultNow(),
	datePaid: timestamp("date_paid", { mode: 'string' }),
	transactionId: text("transaction_id"),
	paymentId: integer("payment_id"),
	stripeAccountId: text("stripe_account_id"),
	description: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	jobId: integer("job_id"),
	senderId: integer("sender_id").notNull(),
	recipientId: integer("recipient_id").notNull(),
	content: text().notNull(),
	messageType: varchar("message_type", { length: 20 }).default('text'),
	isRead: boolean("is_read").default(false).notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }).defaultNow(),
	readAt: timestamp("read_at", { mode: 'string' }),
	attachmentUrl: text("attachment_url"),
	attachmentType: text("attachment_type"),
	isEdited: boolean("is_edited").default(false),
	editedAt: timestamp("edited_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "messages_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [users.id],
			name: "messages_recipient_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "messages_sender_id_users_id_fk"
		}),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	title: text().notNull(),
	message: text().notNull(),
	type: text().notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	sourceId: integer("source_id"),
	sourceType: text("source_type"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	metadata: jsonb(),
});

export const payments = pgTable("payments", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	workerId: integer("worker_id"),
	amount: doublePrecision().notNull(),
	serviceFee: doublePrecision("service_fee"),
	type: text().notNull(),
	status: text().notNull(),
	paymentMethod: text("payment_method"),
	transactionId: text("transaction_id"),
	stripePaymentIntentId: text("stripe_payment_intent_id"),
	stripeCustomerId: text("stripe_customer_id"),
	stripeConnectAccountId: text("stripe_connect_account_id"),
	stripeRefundId: text("stripe_refund_id"),
	jobId: integer("job_id"),
	description: text(),
	currency: text().default('usd'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	metadata: jsonb(),
});

export const platformAnalytics = pgTable("platform_analytics", {
	id: serial().primaryKey().notNull(),
	date: date().notNull(),
	totalUsers: integer("total_users").default(0),
	newUsers: integer("new_users").default(0),
	activeUsers: integer("active_users").default(0),
	totalJobs: integer("total_jobs").default(0),
	jobsPosted: integer("jobs_posted").default(0),
	jobsCompleted: integer("jobs_completed").default(0),
	totalRevenue: doublePrecision("total_revenue").default(0),
	platformFees: doublePrecision("platform_fees").default(0),
	payouts: doublePrecision().default(0),
	completionRate: doublePrecision("completion_rate").default(0),
	averageJobValue: doublePrecision("average_job_value").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const reviews = pgTable("reviews", {
	id: serial().primaryKey().notNull(),
	jobId: integer("job_id").notNull(),
	reviewerId: integer("reviewer_id").notNull(),
	revieweeId: integer("reviewee_id").notNull(),
	rating: integer().notNull(),
	comment: text(),
	dateReviewed: timestamp("date_reviewed", { mode: 'string' }).defaultNow(),
});

export const refunds = pgTable("refunds", {
	id: serial().primaryKey().notNull(),
	jobId: integer("job_id").notNull(),
	userId: integer("user_id").notNull(),
	originalAmount: doublePrecision("original_amount").notNull(),
	refundAmount: doublePrecision("refund_amount").notNull(),
	reason: text(),
	stripeRefundId: varchar("stripe_refund_id", { length: 100 }),
	processedBy: integer("processed_by"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	processedAt: timestamp("processed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "refunds_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "refunds_user_id_users_id_fk"
		}),
]);

export const tasks = pgTable("tasks", {
	id: serial().primaryKey().notNull(),
	jobId: integer("job_id").notNull(),
	description: text().notNull(),
	isCompleted: boolean("is_completed").default(false).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	completedBy: integer("completed_by"),
	position: integer().notNull(),
	isOptional: boolean("is_optional").default(false).notNull(),
	dueTime: timestamp("due_time", { mode: 'string' }),
	estimatedDuration: integer("estimated_duration"),
	location: text(),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
	bonusAmount: doublePrecision("bonus_amount"),
	notes: text(),
});

export const userBadges = pgTable("user_badges", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	badgeId: integer("badge_id").notNull(),
	earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow(),
	metadata: jsonb(),
});

export const disputes = pgTable("disputes", {
	id: serial().primaryKey().notNull(),
	jobId: integer("job_id").notNull(),
	raisedBy: integer("raised_by").notNull(),
	against: integer().notNull(),
	reason: text().notNull(),
	description: text().notNull(),
	evidence: jsonb(),
	status: text().default('open').notNull(),
	amount: doublePrecision(),
	resolution: text(),
	resolvedBy: integer("resolved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.against],
			foreignColumns: [users.id],
			name: "disputes_against_users_id_fk"
		}),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "disputes_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.raisedBy],
			foreignColumns: [users.id],
			name: "disputes_raised_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [users.id],
			name: "disputes_resolved_by_users_id_fk"
		}),
]);

export const supportMessages = pgTable("support_messages", {
	id: serial().primaryKey().notNull(),
	ticketId: integer("ticket_id").notNull(),
	senderId: integer("sender_id").notNull(),
	message: text().notNull(),
	isInternal: boolean("is_internal").default(false).notNull(),
	attachmentUrl: text("attachment_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "support_messages_sender_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [supportTickets.id],
			name: "support_messages_ticket_id_support_tickets_id_fk"
		}),
]);

export const supportTickets = pgTable("support_tickets", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	userName: text("user_name").notNull(),
	userEmail: text("user_email").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	category: text().notNull(),
	priority: text().default('medium').notNull(),
	status: text().default('open').notNull(),
	jobId: integer("job_id"),
	assignedTo: integer("assigned_to"),
	resolution: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "support_tickets_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "support_tickets_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "support_tickets_user_id_users_id_fk"
		}),
]);

export const userReports = pgTable("user_reports", {
	id: serial().primaryKey().notNull(),
	reporterId: integer("reporter_id").notNull(),
	reportedUserId: integer("reported_user_id").notNull(),
	jobId: integer("job_id"),
	category: text().notNull(),
	description: text().notNull(),
	priority: text().default('medium').notNull(),
	status: text().default('pending').notNull(),
	assignedTo: integer("assigned_to"),
	resolution: text(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [adminUsers.id],
			name: "user_reports_assigned_to_admin_users_id_fk"
		}),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "user_reports_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.reportedUserId],
			foreignColumns: [users.id],
			name: "user_reports_reported_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [users.id],
			name: "user_reports_reporter_id_users_id_fk"
		}),
]);

export const applications = pgTable("applications", {
	id: serial().primaryKey().notNull(),
	jobId: integer("job_id").notNull(),
	workerId: integer("worker_id").notNull(),
	status: text().default('pending').notNull(),
	message: text(),
	dateApplied: timestamp("date_applied", { mode: 'string' }).defaultNow(),
	hourlyRate: doublePrecision("hourly_rate"),
	expectedDuration: text("expected_duration"),
	coverLetter: text("cover_letter"),
});

export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const userStrikes = pgTable("user_strikes", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	adminId: integer("admin_id"),
	type: text().notNull(),
	reason: text().notNull(),
	details: text(),
	jobId: integer("job_id"),
	isActive: boolean("is_active").default(true).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [adminUsers.id],
			name: "user_strikes_admin_id_admin_users_id_fk"
		}),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "user_strikes_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_strikes_user_id_users_id_fk"
		}),
]);

export const adminAuditLog = pgTable("admin_audit_log", {
	id: serial().primaryKey().notNull(),
	adminId: integer("admin_id").notNull(),
	action: text().notNull(),
	targetType: text("target_type").notNull(),
	targetId: integer("target_id"),
	details: jsonb().default({}),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [adminUsers.id],
			name: "admin_audit_log_admin_id_admin_users_id_fk"
		}),
]);

export const jobs = pgTable("jobs", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	category: text().notNull(),
	posterId: integer("poster_id").notNull(),
	workerId: integer("worker_id"),
	status: text().default('open').notNull(),
	paymentType: text("payment_type").notNull(),
	paymentAmount: doublePrecision("payment_amount").notNull(),
	serviceFee: doublePrecision("service_fee").default(2.5).notNull(),
	totalAmount: doublePrecision("total_amount").notNull(),
	location: text().notNull(),
	latitude: doublePrecision().notNull(),
	longitude: doublePrecision().notNull(),
	datePosted: timestamp("date_posted", { mode: 'string' }).defaultNow(),
	dateNeeded: timestamp("date_needed", { mode: 'string' }).notNull(),
	requiredSkills: text("required_skills").array().default([""]).notNull(),
	equipmentProvided: boolean("equipment_provided").default(false).notNull(),
	autoAccept: boolean("auto_accept").default(false).notNull(),
	startTime: timestamp("start_time", { mode: 'string' }),
	clockInTime: timestamp("clock_in_time", { mode: 'string' }),
	completionTime: timestamp("completion_time", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	shiftStartTime: text("shift_start_time"),
	shiftEndTime: text("shift_end_time"),
	workerTrackingEnabled: boolean("worker_tracking_enabled").default(true),
	verifyLocationToStart: boolean("verify_location_to_start").default(true),
	markerColor: text("marker_color"),
	adminPosted: boolean('admin_posted').default(false).notNull(),
});

export const platformSettings = pgTable("platform_settings", {
	id: serial().primaryKey().notNull(),
	key: text().notNull(),
	value: jsonb().notNull(),
	description: text(),
	category: text().default('general').notNull(),
	updatedBy: integer("updated_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [adminUsers.id],
			name: "platform_settings_updated_by_admin_users_id_fk"
		}),
	unique("platform_settings_key_unique").on(table.key),
]);

export const systemAlerts = pgTable("system_alerts", {
	id: serial().primaryKey().notNull(),
	type: text().notNull(),
	severity: text().default('medium').notNull(),
	title: text().notNull(),
	description: text().notNull(),
	details: jsonb().default({}),
	isResolved: boolean("is_resolved").default(false).notNull(),
	resolvedBy: integer("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [adminUsers.id],
			name: "system_alerts_resolved_by_admin_users_id_fk"
		}),
]);

export const auditLogs = pgTable("audit_logs", {
	id: serial().primaryKey().notNull(),
	adminId: integer("admin_id"),
	action: text().notNull(),
	resourceType: text("resource_type").notNull(),
	resourceId: text("resource_id"),
	details: jsonb().default({}),
	success: boolean().default(true).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_audit_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_audit_logs_admin_id").using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
	index("idx_audit_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	fullName: text("full_name").notNull(),
	email: text().notNull(),
	phone: text(),
	bio: text(),
	avatarUrl: text("avatar_url"),
	accountType: text("account_type").default('worker').notNull(),
	skills: text().array().default([""]).notNull(),
	rating: doublePrecision(),
	isActive: boolean("is_active").default(true).notNull(),
	isAdmin: boolean("is_admin").default(false).notNull(),
	lastActive: timestamp("last_active", { mode: 'string' }).defaultNow(),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
	location: text(),
	googleId: text("google_id"),
	facebookId: text("facebook_id"),
	stripeCustomerId: text("stripe_customer_id"),
	stripeConnectAccountId: text("stripe_connect_account_id"),
	stripeConnectAccountStatus: text("stripe_connect_account_status"),
	stripeTermsAccepted: boolean("stripe_terms_accepted").default(false),
	stripeTermsAcceptedAt: timestamp("stripe_terms_accepted_at", { mode: 'string' }),
	stripeRepresentativeName: text("stripe_representative_name"),
	stripeRepresentativeTitle: text("stripe_representative_title"),
	stripeRepresentativeRequirementsComplete: boolean("stripe_representative_requirements_complete").default(false),
	stripeBankingDetailsComplete: boolean("stripe_banking_details_complete").default(false),
	contactPreferences: jsonb("contact_preferences").default({"sms":false,"push":true,"email":true}),
	availability: jsonb().default({"hourEnd":17,"weekend":[false,false],"weekdays":[true,true,true,true,true],"hourStart":9}),
	emailVerified: boolean("email_verified").default(false),
	phoneVerified: boolean("phone_verified").default(false),
	identityVerified: boolean("identity_verified").default(false),
	verificationToken: text("verification_token"),
	verificationTokenExpiry: timestamp("verification_token_expiry", { mode: 'string' }),
	phoneVerificationCode: text("phone_verification_code"),
	phoneVerificationExpiry: timestamp("phone_verification_expiry", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	datePosted: timestamp("date_posted", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("email_accounttype_unique").using("btree", table.email.asc().nullsLast().op("text_ops"), table.accountType.asc().nullsLast().op("text_ops")),
	unique("users_username_unique").on(table.username),
]);

export const globalNotifications = pgTable("global_notifications", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	body: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});
