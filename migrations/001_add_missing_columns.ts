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
    column: 'service_fee',
    definition: 'DOUBLE PRECISION DEFAULT 2.5',
    description: 'Service fee for payment processing'
  },
  {
    table: 'earnings',
    column: 'payment_id',
    definition: 'INTEGER',
    description: 'References the associated payment record'
  },
  {
    table: 'applications',
    column: 'hourly_rate',
    definition: 'DOUBLE PRECISION',
    description: 'Proposed hourly rate for hourly jobs'
  },
  {
    table: 'applications',
    column: 'expected_duration',
    definition: 'TEXT',
    description: 'Worker\'s estimate of job duration'
  },
  {
    table: 'applications',
    column: 'cover_letter',
    definition: 'TEXT',
    description: 'Detailed message about worker\'s approach to the job'
  }
];

export async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  console.log('Starting migration to add missing columns...');

  for (const colInfo of columnsToAdd) {
    // Check if column exists
    const checkQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = '${colInfo.table}'
      AND column_name = '${colInfo.column}';
    `;

    try {
      const result = await pool.query(checkQuery);
      
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
      console.error(`Error checking/adding column ${colInfo.table}.${colInfo.column}:`, error);
    }
  }

  console.log('Migration completed successfully!');
  await pool.end();
}

// Run migration if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}