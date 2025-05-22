import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Migration to add job workflow tracking columns
 * Enhances jobs with status tracking, location verification, and time tracking
 */
export async function runMigration() {
  console.log("Running migration: Add job workflow columns");

  try {
    // Add new columns for job workflow management
    await db.execute(sql`
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS start_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS clock_in_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completion_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS worker_tracking_enabled BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS verify_location_to_start BOOLEAN DEFAULT TRUE
    `);

    console.log("Migration successful: Job workflow columns added");
    return true;
  } catch (error) {
    console.error("Migration failed:", error);
    return false;
  }
}