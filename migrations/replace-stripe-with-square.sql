-- Migration to replace Stripe with Square payment integration
-- This updates all payment-related fields and tables

-- Update users table - Replace Stripe fields with Square fields
ALTER TABLE users RENAME COLUMN stripe_customer_id TO square_customer_id;
ALTER TABLE users RENAME COLUMN stripe_connect_account_id TO square_merchant_id;
ALTER TABLE users RENAME COLUMN stripe_connect_account_status TO square_account_status;
ALTER TABLE users RENAME COLUMN stripe_terms_accepted TO square_terms_accepted;
ALTER TABLE users RENAME COLUMN stripe_terms_accepted_at TO square_terms_accepted_at;
ALTER TABLE users RENAME COLUMN stripe_representative_name TO square_representative_name;
ALTER TABLE users RENAME COLUMN stripe_representative_title TO square_representative_title;
ALTER TABLE users RENAME COLUMN stripe_representative_requirements_complete TO square_representative_requirements_complete;
ALTER TABLE users RENAME COLUMN stripe_banking_details_complete TO square_banking_details_complete;

-- Update payments table - Replace Stripe fields with Square fields
ALTER TABLE payments RENAME COLUMN stripe_payment_intent_id TO square_payment_id;
ALTER TABLE payments RENAME COLUMN stripe_customer_id TO square_customer_id;
ALTER TABLE payments RENAME COLUMN stripe_connect_account_id TO square_merchant_id;
ALTER TABLE payments RENAME COLUMN stripe_refund_id TO square_refund_id;

-- Update earnings table - Replace Stripe fields with Square fields
ALTER TABLE earnings RENAME COLUMN stripe_account_id TO square_merchant_id;

-- Update refunds table - Replace Stripe fields with Square fields
ALTER TABLE refunds RENAME COLUMN stripe_refund_id TO square_refund_id;

-- Update enterprise_businesses table if it has Stripe fields
ALTER TABLE enterprise_businesses RENAME COLUMN stripe_subscription_id TO square_subscription_id;

-- Log the migration
INSERT INTO audit_logs (action, resource_type, resource_id, details, success)
VALUES (
  'stripe_to_square_migration',
  'database',
  'payment_fields',
  '{"message": "Migrated all Stripe payment fields to Square equivalents"}',
  true
);