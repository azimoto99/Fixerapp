import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema.js';
import { fileURLToPath } from 'url';
import path from 'path';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Get the current file name and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define columns to add if missing
const columnsToAdd = [
  {
    table: 'payments',
    column: 'completed_at',
    definition: 'TIMESTAMP',
    description: 'When the payment was completed'
  },
  {
    table: 'earnings',
    column: 'stripe_account_id',
    definition: 'TEXT',
    description: 'Worker\'s Stripe Connect account ID'
  },
];

// Main migration function
export async function runMigration() {
  console.log('Starting migration to add payment and earnings columns...');
  
  // Create a database connection using the DATABASE_URL environment variable
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });
  
  // For each column we want to add
  for (const colInfo of columnsToAdd) {
    try {
      // Check if the column already exists
      const checkColumnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2;
      `;
      
      const result = await pool.query(checkColumnQuery, [colInfo.table, colInfo.column]);
      
      if (result.rows.length === 0) {
        // Column doesn't exist, add it
        console.log(`Adding missing column: ${colInfo.table}.${colInfo.column}`);
        
        // Split into two queries to avoid syntax errors
        const addColumnQuery = `ALTER TABLE ${colInfo.table} ADD COLUMN IF NOT EXISTS ${colInfo.column} ${colInfo.definition};`;
        
        await pool.query(addColumnQuery);
        
        // Add comment in a separate query
        const commentQuery = `COMMENT ON COLUMN ${colInfo.table}.${colInfo.column} IS '${colInfo.description.replace(/'/g, "''")}';`;
        
        await pool.query(commentQuery);
        console.log(`Successfully added column: ${colInfo.table}.${colInfo.column}`);
      } else {
        console.log(`Column already exists: ${colInfo.table}.${colInfo.column}`);
      }
    } catch (error) {
      console.error(`Error checking/adding column ${colInfo.table}.${colInfo.column}: ${error}`);
    }
  }
  
  console.log('Migration completed successfully!');
  
  // Close the connection pool
  await pool.end();
}