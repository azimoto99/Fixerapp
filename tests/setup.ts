// @ts-nocheck
import { newDb } from 'pg-mem';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../migrations/schema';

// Create in-memory Postgres database for tests
const dbMem = newDb({ autoCreateForeignKeyIndices: true });
const adapter = dbMem.adapters.createPgPromise();

// Apply the generated SQL schema
for (const table of Object.values(schema)) {
  // Only apply tables (pgTable instances have .createSQL)
  if (table && typeof (table as any).createSQL === 'function') {
    dbMem.public.none((table as any).createSQL({ ifNotExists: true }));
  }
}

export const testDb = drizzle(adapter, { schema });

// Make the test database globally accessible in tests
(global as any).testDb = testDb; 