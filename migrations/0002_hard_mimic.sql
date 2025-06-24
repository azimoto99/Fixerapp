CREATE TABLE "conversation_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp,
	"last_read_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer,
	"type" varchar(20) DEFAULT 'direct' NOT NULL,
	"title" varchar(255),
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_message_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message_read_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_privacy_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"show_location_to_all" boolean DEFAULT false NOT NULL,
	"show_location_to_job_posters" boolean DEFAULT true NOT NULL,
	"show_location_radius" integer DEFAULT 1000 NOT NULL,
	"show_phone_to_all" boolean DEFAULT false NOT NULL,
	"show_phone_to_job_posters" boolean DEFAULT true NOT NULL,
	"show_email_to_all" boolean DEFAULT false NOT NULL,
	"show_email_to_job_posters" boolean DEFAULT false NOT NULL,
	"show_full_name_to_all" boolean DEFAULT false NOT NULL,
	"show_full_name_to_job_posters" boolean DEFAULT true NOT NULL,
	"show_profile_picture_to_all" boolean DEFAULT true NOT NULL,
	"show_ratings_to_all" boolean DEFAULT true NOT NULL,
	"show_job_history_to_all" boolean DEFAULT false NOT NULL,
	"allow_messages_from_all" boolean DEFAULT false NOT NULL,
	"allow_messages_from_job_posters_only" boolean DEFAULT true NOT NULL,
	"allow_job_recommendations" boolean DEFAULT true NOT NULL,
	"allow_marketing_emails" boolean DEFAULT false NOT NULL,
	"allow_push_notifications" boolean DEFAULT true NOT NULL,
	"data_retention_period" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_privacy_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "recipient_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "location_encrypted" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "conversation_id" integer;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_privacy_settings" ADD CONSTRAINT "user_privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;