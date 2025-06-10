#!/usr/bin/env tsx

/**
 * Script to run the audit logs table migration
 * This fixes the missing audit_logs table that's causing login errors
 */

import { runMigration } from '../migrations/005_create_audit_logs_table';

async function main() {
  console.log('🔧 Running audit logs table migration...');
  
  try {
    const success = await runMigration();
    
    if (success) {
      console.log('✅ Migration completed successfully!');
      console.log('📋 The audit_logs table has been created.');
      console.log('🔐 Login errors should now be resolved.');
    } else {
      console.error('❌ Migration failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Migration error:', error);
    process.exit(1);
  }
}

main();
