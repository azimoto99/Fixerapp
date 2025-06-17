import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { jobs } from "./schema";

// This migration is written in TypeScript so Drizzle can compile it.
// It does two things:
//   1. Adds a new `admin_posted` boolean column to `jobs` (default false)
//   2. Creates a new `global_notifications` table so platform-wide alerts can be broadcast.

export async function up(db: any): Promise<void> {
  // 1. admin_posted column ---------------------------------------------------
  await db.execute(sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS admin_posted BOOLEAN DEFAULT FALSE;`);

  // 2. global_notifications table -------------------------------------------
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS global_notifications (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function down(db: any): Promise<void> {
  await db.execute(sql`ALTER TABLE jobs DROP COLUMN IF EXISTS admin_posted;`);
  await db.execute(sql`DROP TABLE IF EXISTS global_notifications;`);
} 