/**
 * Migration to add marker color column for jobs
 * Adds persistent color field for map markers
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

export async function runMigration() {
  console.log('Running migration: add marker color column');
  
  // Using neon serverless client
  const queryClient = neon(process.env.DATABASE_URL!);
  const db = drizzle(queryClient);
  
  try {
    // Add marker_color column to jobs table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS marker_color TEXT
    `);
    
    // Assign random colors to existing jobs
    // We'll use a set of predefined vibrant colors for consistency
    const colors = [
      "#FF5733", // Coral red
      "#33FF57", // Bright green
      "#3357FF", // Bright blue
      "#F033FF", // Bright magenta
      "#FF3393", // Hot pink
      "#33FFF0", // Turquoise
      "#FFC833", // Amber
      "#8A33FF", // Purple
      "#FF8A33", // Orange
      "#33B8FF"  // Sky blue
    ];
    
    // Update existing jobs with random colors
    await db.execute(sql`
      UPDATE jobs
      SET marker_color = (
        CASE 
          WHEN marker_color IS NULL THEN 
            (SELECT unnest(ARRAY[${sql.join(colors, sql`, `)}]) ORDER BY random() LIMIT 1)
          ELSE marker_color
        END
      )
    `);
    
    console.log('Successfully added and populated marker_color column');
    return { success: true };
  } catch (error) {
    console.error('Error adding marker_color column:', error);
    return { success: false, error };
  }
}