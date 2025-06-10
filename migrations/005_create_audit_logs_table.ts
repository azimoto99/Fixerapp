/**
 * Migration to create the audit_logs table
 * This table is needed for the audit service to log admin actions
 */
import '../server/env'; // Load environment variables
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

export async function runMigration() {
  console.log("Running migration: Create audit_logs table");

  try {
    // Get database connection
    if (!process.env.SUPABASE_DATABASE_URL) {
      throw new Error('SUPABASE_DATABASE_URL must be set');
    }

    const connection = postgres(process.env.SUPABASE_DATABASE_URL, {
      ssl: 'require',
      max: 1
    });
    const db = drizzle(connection);

    // Create audit_logs table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        details JSONB DEFAULT '{}',
        success BOOLEAN NOT NULL DEFAULT true,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index for better query performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)
    `);

    console.log("Migration successful: audit_logs table created");

    // Close the connection
    await connection.end();
    return true;
  } catch (error) {
    console.error("Migration failed:", error);
    return false;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then((success) => {
      console.log(success ? "Migration completed successfully" : "Migration failed");
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Migration error:", error);
      process.exit(1);
    });
}
