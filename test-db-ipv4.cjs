const { Client } = require('pg');
const dns = require('dns');
require('dotenv').config();

// Force IPv4 resolution
dns.setDefaultResultOrder('ipv4first');

async function testConnection() {
  // Try to resolve the hostname to IPv4
  try {
    const hostname = 'db.qsrxgafiuqdduqapuwzi.supabase.co';
    console.log(`Resolving ${hostname} to IPv4...`);
    
    const addresses = await new Promise((resolve, reject) => {
      dns.lookup(hostname, { family: 4, all: true }, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    
    console.log('IPv4 addresses found:', addresses);
    
    // Use the first IPv4 address
    const ipv4Address = addresses[0].address;
    console.log(`Using IPv4 address: ${ipv4Address}`);
    
    // Create connection string with IPv4 address
    const connectionString = process.env.SUPABASE_DATABASE_URL.replace(hostname, ipv4Address);
    console.log('Modified connection string:', connectionString.replace(/:[^:]+@/, ':****@'));
    
    const client = new Client({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query successful:', result.rows[0]);
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    // Try with direct connection using node options
    console.log('\nTrying alternative connection method...');
    try {
      const client = new Client({
        connectionString: process.env.SUPABASE_DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 30000,
      });
      
      await client.connect();
      console.log('✅ Alternative connection successful!');
      await client.end();
    } catch (altError) {
      console.error('❌ Alternative connection also failed:', altError.message);
    }
  }
}

testConnection();