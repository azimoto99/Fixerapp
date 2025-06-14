-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"permissions" text[] DEFAULT '{""}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon_url" text NOT NULL,
	"category" text NOT NULL,
	"requirements" jsonb,
	"tier" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "contact_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"job_id" integer,
	"amount" double precision NOT NULL,
	"service_fee" double precision DEFAULT 2.5 NOT NULL,
	"platform_fee" double precision DEFAULT 2.5 NOT NULL,
	"net_amount" double precision NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"date_earned" timestamp DEFAULT now(),
	"date_paid" timestamp,
	"transaction_id" text,
	"payment_id" integer,
	"stripe_account_id" text,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer,
	"sender_id" integer NOT NULL,
	"recipient_id" integer NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar(20) DEFAULT 'text',
	"is_read" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"read_at" timestamp,
	"attachment_url" text,
	"attachment_type" text,
	"is_edited" boolean DEFAULT false,
	"edited_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"source_id" integer,
	"source_type" text,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"worker_id" integer,
	"amount" double precision NOT NULL,
	"service_fee" double precision,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"payment_method" text,
	"transaction_id" text,
	"stripe_payment_intent_id" text,
	"stripe_customer_id" text,
	"stripe_connect_account_id" text,
	"stripe_refund_id" text,
	"job_id" integer,
	"description" text,
	"currency" text DEFAULT 'usd',
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "platform_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"total_users" integer DEFAULT 0,
	"new_users" integer DEFAULT 0,
	"active_users" integer DEFAULT 0,
	"total_jobs" integer DEFAULT 0,
	"jobs_posted" integer DEFAULT 0,
	"jobs_completed" integer DEFAULT 0,
	"total_revenue" double precision DEFAULT 0,
	"platform_fees" double precision DEFAULT 0,
	"payouts" double precision DEFAULT 0,
	"completion_rate" double precision DEFAULT 0,
	"average_job_value" double precision DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"reviewee_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"date_reviewed" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"original_amount" double precision NOT NULL,
	"refund_amount" double precision NOT NULL,
	"reason" text,
	"stripe_refund_id" varchar(100),
	"processed_by" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"description" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"completed_by" integer,
	"position" integer NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"due_time" timestamp,
	"estimated_duration" integer,
	"location" text,
	"latitude" double precision,
	"longitude" double precision,
	"bonus_amount" double precision,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"raised_by" integer NOT NULL,
	"against" integer NOT NULL,
	"reason" text NOT NULL,
	"description" text NOT NULL,
	"evidence" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"amount" double precision,
	"resolution" text,
	"resolved_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" text NOT NULL,
	"user_email" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"job_id" integer,
	"assigned_to" integer,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" integer NOT NULL,
	"reported_user_id" integer NOT NULL,
	"job_id" integer,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_to" integer,
	"resolution" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"worker_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"date_applied" timestamp DEFAULT now(),
	"hourly_rate" double precision,
	"expected_duration" text,
	"cover_letter" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_strikes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"admin_id" integer,
	"type" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"job_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"poster_id" integer NOT NULL,
	"worker_id" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"payment_type" text NOT NULL,
	"payment_amount" double precision NOT NULL,
	"service_fee" double precision DEFAULT 2.5 NOT NULL,
	"total_amount" double precision NOT NULL,
	"location" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"date_posted" timestamp DEFAULT now(),
	"date_needed" timestamp NOT NULL,
	"required_skills" text[] DEFAULT '{""}' NOT NULL,
	"equipment_provided" boolean DEFAULT false NOT NULL,
	"auto_accept" boolean DEFAULT false NOT NULL,
	"start_time" timestamp,
	"clock_in_time" timestamp,
	"completion_time" timestamp,
	"completed_at" timestamp,
	"shift_start_time" text,
	"shift_end_time" text,
	"worker_tracking_enabled" boolean DEFAULT true,
	"verify_location_to_start" boolean DEFAULT true,
	"marker_color" text
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "system_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"bio" text,
	"avatar_url" text,
	"account_type" text DEFAULT 'worker' NOT NULL,
	"skills" text[] DEFAULT '{""}' NOT NULL,
	"rating" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"last_active" timestamp DEFAULT now(),
	"latitude" double precision,
	"longitude" double precision,
	"location" text,
	"google_id" text,
	"facebook_id" text,
	"stripe_customer_id" text,
	"stripe_connect_account_id" text,
	"stripe_connect_account_status" text,
	"stripe_terms_accepted" boolean DEFAULT false,
	"stripe_terms_accepted_at" timestamp,
	"stripe_representative_name" text,
	"stripe_representative_title" text,
	"stripe_representative_requirements_complete" boolean DEFAULT false,
	"stripe_banking_details_complete" boolean DEFAULT false,
	"contact_preferences" jsonb DEFAULT '{"sms":false,"push":true,"email":true}'::jsonb,
	"availability" jsonb DEFAULT '{"hourEnd":17,"weekend":[false,false],"weekdays":[true,true,true,true,true],"hourStart":9}'::jsonb,
	"email_verified" boolean DEFAULT false,
	"phone_verified" boolean DEFAULT false,
	"identity_verified" boolean DEFAULT false,
	"verification_token" text,
	"verification_token_expiry" timestamp,
	"phone_verification_code" text,
	"phone_verification_expiry" timestamp,
	"created_at" timestamp DEFAULT now(),
	"date_posted" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_against_users_id_fk" FOREIGN KEY ("against") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_assigned_to_admin_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_strikes" ADD CONSTRAINT "user_strikes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_resolved_by_admin_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action" text_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_admin_id" ON "audit_logs" USING btree ("admin_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "email_accounttype_unique" ON "users" USING btree ("email" text_ops,"account_type" text_ops);
*/