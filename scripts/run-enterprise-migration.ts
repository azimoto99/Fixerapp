import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function runEnterpriseMigration() {
  console.log('Running enterprise migration...');
  
  try {
    // Create enterprise_businesses table
    await db.execute(sql`
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
        verification_status TEXT DEFAULT 'pending' NOT NULL,
        stripe_subscription_id TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('✓ Created enterprise_businesses table');

    // Create hub_pins table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hub_pins (
        id SERIAL PRIMARY KEY,
        enterprise_id INTEGER NOT NULL REFERENCES enterprise_businesses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        pin_size TEXT DEFAULT 'large' NOT NULL,
        pin_color TEXT DEFAULT '#FF6B6B' NOT NULL,
        icon_url TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        priority INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created hub_pins table');

    // Create enterprise_positions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS enterprise_positions (
        id SERIAL PRIMARY KEY,
        enterprise_id INTEGER NOT NULL REFERENCES enterprise_businesses(id) ON DELETE CASCADE,
        hub_pin_id INTEGER REFERENCES hub_pins(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        position_type TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        payment_amount DOUBLE PRECISION NOT NULL,
        payment_frequency TEXT,
        required_skills TEXT[] DEFAULT '{}' NOT NULL,
        benefits TEXT,
        schedule TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        positions_available INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created enterprise_positions table');

    // Create enterprise_applications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS enterprise_applications (
        id SERIAL PRIMARY KEY,
        position_id INTEGER NOT NULL REFERENCES enterprise_positions(id) ON DELETE CASCADE,
        applicant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        enterprise_id INTEGER NOT NULL REFERENCES enterprise_businesses(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' NOT NULL,
        cover_letter TEXT,
        expected_salary DOUBLE PRECISION,
        available_start_date DATE,
        notes TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(position_id, applicant_id)
      )
    `);
    console.log('✓ Created enterprise_applications table');

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_hub_pins_enterprise_id ON hub_pins(enterprise_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_hub_pins_location ON hub_pins(latitude, longitude)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_hub_pins_active ON hub_pins(is_active)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_enterprise_positions_enterprise_id ON enterprise_positions(enterprise_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_enterprise_positions_hub_pin_id ON enterprise_positions(hub_pin_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_enterprise_applications_position_id ON enterprise_applications(position_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_enterprise_applications_applicant_id ON enterprise_applications(applicant_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_enterprise_applications_enterprise_id ON enterprise_applications(enterprise_id)`);
    console.log('✓ Created indexes');

    console.log('✅ Enterprise migration completed successfully!');
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runEnterpriseMigration(); 