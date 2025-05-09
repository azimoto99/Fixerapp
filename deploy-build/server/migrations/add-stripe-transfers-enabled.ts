import { pool } from '../db';

async function addStripeTransfersEnabledColumn() {
  console.log('Adding stripe_transfers_enabled column to users table...');
  
  try {
    // Check if the stripe_transfers_enabled column already exists to avoid errors
    const checkTransfersEnabledSql = `
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'stripe_transfers_enabled';
    `;
    
    const transfersEnabledResult = await pool.query(checkTransfersEnabledSql);
    
    if (transfersEnabledResult.rowCount === 0) {
      // Column doesn't exist, so add it
      const addTransfersEnabledSql = `
        ALTER TABLE users
        ADD COLUMN stripe_transfers_enabled BOOLEAN DEFAULT false;
      `;
      
      await pool.query(addTransfersEnabledSql);
      console.log('Added stripe_transfers_enabled column successfully');
    } else {
      console.log('stripe_transfers_enabled column already exists');
    }
    
    // Check if the stripe_account_updated_at column exists
    const checkAccountUpdatedAtSql = `
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'stripe_account_updated_at';
    `;
    
    const accountUpdatedAtResult = await pool.query(checkAccountUpdatedAtSql);
    
    if (accountUpdatedAtResult.rowCount === 0) {
      // Column doesn't exist, so add it
      const addAccountUpdatedAtSql = `
        ALTER TABLE users
        ADD COLUMN stripe_account_updated_at TIMESTAMP;
      `;
      
      await pool.query(addAccountUpdatedAtSql);
      console.log('Added stripe_account_updated_at column successfully');
    } else {
      console.log('stripe_account_updated_at column already exists');
    }
  } catch (error) {
    console.error('Error adding columns to users table:', error);
    throw error;
  }
}

// In ES modules, we can use import.meta.url to check if this is the main module
// This is a workaround since require.main === module doesn't work in ES modules
const isMainModule = import.meta.url.endsWith(process.argv[1]);

if (isMainModule) {
  addStripeTransfersEnabledColumn()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { addStripeTransfersEnabledColumn };