ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
DROP INDEX "idx_audit_logs_action";--> statement-breakpoint
DROP INDEX "idx_audit_logs_admin_id";--> statement-breakpoint
DROP INDEX "idx_audit_logs_created_at";--> statement-breakpoint
DROP INDEX "email_accounttype_unique";--> statement-breakpoint
ALTER TABLE "admin_users" ALTER COLUMN "permissions" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "required_skills" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "skills" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "contact_preferences" SET DEFAULT '{"email":true,"sms":false,"push":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "availability" SET DEFAULT '{"weekdays":[true,true,true,true,true],"weekend":[false,false],"hourStart":9,"hourEnd":17}'::jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "email_accounttype_unique" ON "users" USING btree ("email","account_type");