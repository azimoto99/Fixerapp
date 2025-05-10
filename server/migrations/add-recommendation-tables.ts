import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration to add job recommendations and learning paths tables
 */
export async function addRecommendationTables() {
  console.log('Adding job_recommendations and learning_paths tables...');

  try {
    // Check if job_recommendations table exists
    const jobRecommendationsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'job_recommendations'
      );
    `);

    if (!jobRecommendationsTableExists.rows[0].exists) {
      console.log('Creating job_recommendations table...');
      await db.execute(sql`
        CREATE TABLE job_recommendations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          job_id INTEGER NOT NULL,
          score DOUBLE PRECISION NOT NULL,
          reason_json TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('job_recommendations table created successfully');
    } else {
      console.log('job_recommendations table already exists');
    }

    // Check if learning_paths table exists
    const learningPathsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'learning_paths'
      );
    `);

    if (!learningPathsTableExists.rows[0].exists) {
      console.log('Creating learning_paths table...');
      await db.execute(sql`
        CREATE TABLE learning_paths (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          skill TEXT NOT NULL,
          current_level TEXT NOT NULL,
          target_level TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          progress_percent INTEGER NOT NULL DEFAULT 0,
          resources_json TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
        );
      `);
      console.log('learning_paths table created successfully');
    } else {
      console.log('learning_paths table already exists');
    }

    return true;
  } catch (error) {
    console.error('Error adding recommendation tables:', error);
    throw error;
  }
}