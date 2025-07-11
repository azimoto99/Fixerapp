-- Migration to replace Square fields with PayPal equivalents
-- This migration adds PayPal fields, migrates existing Square data, and removes Square fields

-- Step 1: Add PayPal fields to users table (if they don't exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_merchant_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_account_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_terms_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_representative_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_representative_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_representative_requirements_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_banking_details_complete BOOLEAN DEFAULT FALSE;

-- Step 2: Add PayPal fields to other tables
ALTER TABLE earnings ADD COLUMN IF NOT EXISTS paypal_merchant_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paypal_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paypal_customer_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paypal_merchant_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paypal_refund_id TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS paypal_refund_id VARCHAR(100);
ALTER TABLE enterprise_businesses ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;

-- Step 3: Migrate existing Square data to PayPal fields
-- Users table migration
UPDATE users SET paypal_customer_id = square_customer_id WHERE square_customer_id IS NOT NULL AND paypal_customer_id IS NULL;
UPDATE users SET paypal_merchant_id = square_merchant_id WHERE square_merchant_id IS NOT NULL AND paypal_merchant_id IS NULL;
UPDATE users SET paypal_account_status = square_account_status WHERE square_account_status IS NOT NULL AND paypal_account_status IS NULL;
UPDATE users SET paypal_terms_accepted = square_terms_accepted WHERE square_terms_accepted IS NOT NULL AND paypal_terms_accepted = FALSE;
UPDATE users SET paypal_terms_accepted_at = square_terms_accepted_at WHERE square_terms_accepted_at IS NOT NULL AND paypal_terms_accepted_at IS NULL;
UPDATE users SET paypal_representative_name = square_representative_name WHERE square_representative_name IS NOT NULL AND paypal_representative_name IS NULL;
UPDATE users SET paypal_representative_title = square_representative_title WHERE square_representative_title IS NOT NULL AND paypal_representative_title IS NULL;
UPDATE users SET paypal_representative_requirements_complete = square_representative_requirements_complete WHERE square_representative_requirements_complete IS NOT NULL AND paypal_representative_requirements_complete = FALSE;
UPDATE users SET paypal_banking_details_complete = square_banking_details_complete WHERE square_banking_details_complete IS NOT NULL AND paypal_banking_details_complete = FALSE;

-- Payments table migration
UPDATE payments SET paypal_payment_id = square_payment_id WHERE square_payment_id IS NOT NULL AND paypal_payment_id IS NULL;
UPDATE payments SET paypal_customer_id = square_customer_id WHERE square_customer_id IS NOT NULL AND paypal_customer_id IS NULL;
UPDATE payments SET paypal_merchant_id = square_merchant_id WHERE square_merchant_id IS NOT NULL AND paypal_merchant_id IS NULL;
UPDATE payments SET paypal_refund_id = square_refund_id WHERE square_refund_id IS NOT NULL AND paypal_refund_id IS NULL;

-- Earnings table migration
UPDATE earnings SET paypal_merchant_id = square_merchant_id WHERE square_merchant_id IS NOT NULL AND paypal_merchant_id IS NULL;

-- Refunds table migration
UPDATE refunds SET paypal_refund_id = square_refund_id WHERE square_refund_id IS NOT NULL AND paypal_refund_id IS NULL;

-- Enterprise businesses table migration
UPDATE enterprise_businesses SET paypal_subscription_id = square_subscription_id WHERE square_subscription_id IS NOT NULL AND paypal_subscription_id IS NULL;

-- Step 4: Update payment methods to use PayPal
UPDATE payments SET payment_method = 'paypal' WHERE payment_method = 'square';

-- Step 5: Remove Square fields after successful migration
-- Users table - Remove Square fields
ALTER TABLE users DROP COLUMN IF EXISTS square_customer_id;
ALTER TABLE users DROP COLUMN IF EXISTS square_merchant_id;
ALTER TABLE users DROP COLUMN IF EXISTS square_account_status;
ALTER TABLE users DROP COLUMN IF EXISTS square_terms_accepted;
ALTER TABLE users DROP COLUMN IF EXISTS square_terms_accepted_at;
ALTER TABLE users DROP COLUMN IF EXISTS square_representative_name;
ALTER TABLE users DROP COLUMN IF EXISTS square_representative_title;
ALTER TABLE users DROP COLUMN IF EXISTS square_representative_requirements_complete;
ALTER TABLE users DROP COLUMN IF EXISTS square_banking_details_complete;

-- Payments table - Remove Square fields
ALTER TABLE payments DROP COLUMN IF EXISTS square_payment_id;
ALTER TABLE payments DROP COLUMN IF EXISTS square_customer_id;
ALTER TABLE payments DROP COLUMN IF EXISTS square_merchant_id;
ALTER TABLE payments DROP COLUMN IF EXISTS square_refund_id;

-- Earnings table - Remove Square fields
ALTER TABLE earnings DROP COLUMN IF EXISTS square_merchant_id;

-- Refunds table - Remove Square fields
ALTER TABLE refunds DROP COLUMN IF EXISTS square_refund_id;

-- Enterprise businesses table - Remove Square fields
ALTER TABLE enterprise_businesses DROP COLUMN IF EXISTS square_subscription_id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_paypal_customer_id ON users(paypal_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_paypal_merchant_id ON users(paypal_merchant_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_payment_id ON payments(paypal_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_customer_id ON payments(paypal_customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_merchant_id ON payments(paypal_merchant_id);

-- Step 6: Log the migration completion
INSERT INTO audit_logs (action, resource_type, resource_id, details, success)
VALUES (
  'square_to_paypal_migration',
  'database',
  'payment_fields',
  '{"message": "Successfully migrated all Square payment fields to PayPal equivalents and removed Square fields"}',
  true
);

-- Add comments to track this migration
COMMENT ON TABLE users IS 'Updated for PayPal integration - migration from Square completed';
COMMENT ON TABLE payments IS 'Updated for PayPal integration - migration from Square completed';
COMMENT ON TABLE earnings IS 'Updated for PayPal integration - migration from Square completed';