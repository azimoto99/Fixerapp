/**
 * Migration to add shift time columns for hourly jobs
 * Adds shift start and end time fields to the jobs table
 */
import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";

export async function runMigration() {
  console.log("Running migration: Add shift time columns");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  // Check if columns already exist
  const checkShiftStartColumn = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'shift_start_time'
  `;

  const checkShiftEndColumn = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'shift_end_time'
  `;

  // Add columns if they don't exist
  if (checkShiftStartColumn.length === 0) {
    console.log("Adding shift_start_time column");
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS shift_start_time TEXT`;
  } else {
    console.log("shift_start_time column already exists");
  }

  if (checkShiftEndColumn.length === 0) {
    console.log("Adding shift_end_time column");
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS shift_end_time TEXT`;
  } else {
    console.log("shift_end_time column already exists");
  }

  console.log("Migration completed successfully");
  return { success: true };
}