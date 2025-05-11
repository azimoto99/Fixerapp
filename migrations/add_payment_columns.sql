-- Add missing columns to the payments table
DO $$
BEGIN
    -- Check if columns exist and add them if they don't
    
    -- Add worker_id column to payments if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'payments' AND column_name = 'worker_id') THEN
        ALTER TABLE payments ADD COLUMN worker_id INTEGER;
    END IF;
    
    -- Add transaction_id column to earnings if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'earnings' AND column_name = 'transaction_id') THEN
        ALTER TABLE earnings ADD COLUMN transaction_id TEXT;
    END IF;
    
    -- Add stripe_payment_intent_id to payments if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'payments' AND column_name = 'stripe_payment_intent_id') THEN
        ALTER TABLE payments ADD COLUMN stripe_payment_intent_id TEXT;
    END IF;
    
    -- Add stripe_customer_id to payments if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'payments' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE payments ADD COLUMN stripe_customer_id TEXT;
    END IF;
    
    -- Add stripe_connect_account_id to payments if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'payments' AND column_name = 'stripe_connect_account_id') THEN
        ALTER TABLE payments ADD COLUMN stripe_connect_account_id TEXT;
    END IF;
    
    -- Add metadata to payments if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'payments' AND column_name = 'metadata') THEN
        ALTER TABLE payments ADD COLUMN metadata JSONB;
    END IF;
END $$;