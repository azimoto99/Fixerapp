import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema';

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

async function runMigration() {
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
        
        const addColumnQuery = `
          ALTER TABLE ${colInfo.table}
          ADD COLUMN IF NOT EXISTS ${colInfo.column} ${colInfo.definition};
          COMMENT ON COLUMN ${colInfo.table}.${colInfo.column} IS '${colInfo.description}';
        `;
        
        await pool.query(addColumnQuery);
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

// Check if this file is being executed directly
if (require.main === module) {
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

export { runMigration };