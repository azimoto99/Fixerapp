-- Create enterprise_businesses table for businesses that can create hub pins
CREATE TABLE IF NOT EXISTS enterprise_businesses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_description TEXT,
  business_logo TEXT,
  business_type TEXT DEFAULT 'company' NOT NULL,
  business_website TEXT,
  business_phone TEXT,
  business_email TEXT,
  verification_status TEXT DEFAULT 'pending' NOT NULL, -- pending, verified, rejected
  stripe_subscription_id TEXT, -- For premium features
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create hub_pins table for business locations on the map
CREATE TABLE IF NOT EXISTS hub_pins (
  id SERIAL PRIMARY KEY,
  enterprise_id INTEGER NOT NULL REFERENCES enterprise_businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  pin_size TEXT DEFAULT 'large' NOT NULL, -- large, xlarge
  pin_color TEXT DEFAULT '#FF6B6B' NOT NULL,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  priority INTEGER DEFAULT 1 NOT NULL, -- Higher priority pins show on top
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create enterprise_positions table for job positions within a business
CREATE TABLE IF NOT EXISTS enterprise_positions (
  id SERIAL PRIMARY KEY,
  enterprise_id INTEGER NOT NULL REFERENCES enterprise_businesses(id) ON DELETE CASCADE,
  hub_pin_id INTEGER REFERENCES hub_pins(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  position_type TEXT NOT NULL, -- full-time, part-time, contract, temporary
  payment_type TEXT NOT NULL, -- hourly, salary, project
  payment_amount DOUBLE PRECISION NOT NULL,
  payment_frequency TEXT, -- weekly, bi-weekly, monthly
  required_skills TEXT[] DEFAULT '{}' NOT NULL,
  benefits TEXT,
  schedule TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  positions_available INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create enterprise_applications table for applications to enterprise positions
CREATE TABLE IF NOT EXISTS enterprise_applications (
  id SERIAL PRIMARY KEY,
  position_id INTEGER NOT NULL REFERENCES enterprise_positions(id) ON DELETE CASCADE,
  applicant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enterprise_id INTEGER NOT NULL REFERENCES enterprise_businesses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, reviewing, accepted, rejected, withdrawn
  cover_letter TEXT,
  expected_salary DOUBLE PRECISION,
  available_start_date DATE,
  notes TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(position_id, applicant_id)
);

-- Add indexes for performance
CREATE INDEX idx_hub_pins_enterprise_id ON hub_pins(enterprise_id);
CREATE INDEX idx_hub_pins_location ON hub_pins(latitude, longitude);
CREATE INDEX idx_hub_pins_active ON hub_pins(is_active);
CREATE INDEX idx_enterprise_positions_enterprise_id ON enterprise_positions(enterprise_id);
CREATE INDEX idx_enterprise_positions_hub_pin_id ON enterprise_positions(hub_pin_id);
CREATE INDEX idx_enterprise_applications_position_id ON enterprise_applications(position_id);
CREATE INDEX idx_enterprise_applications_applicant_id ON enterprise_applications(applicant_id);
CREATE INDEX idx_enterprise_applications_enterprise_id ON enterprise_applications(enterprise_id);

-- Add enterprise account type to users if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'enterprise' 
        AND enumtypid = (
            SELECT pg_type.oid 
            FROM pg_type 
            JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace 
            WHERE pg_type.typname = 'account_type' 
            AND pg_namespace.nspname = 'public'
        )
    ) THEN
        ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'enterprise';
    END IF;
END $$; 