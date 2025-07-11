const dns = require('dns');
const { promisify } = require('util');

// Force IPv4 resolution
dns.setDefaultResultOrder('ipv4first');

const lookup = promisify(dns.lookup);

async function resolveToIPv4(hostname) {
  try {
    const { address } = await lookup(hostname, { family: 4 });
    return address;
  } catch (error) {
    console.error(`Failed to resolve ${hostname} to IPv4:`, error.message);
    throw error;
  }
}

async function updateEnvWithIPv4() {
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const hostname = 'db.qsrxgafiuqdduqapuwzi.supabase.co';
  console.log(`Resolving ${hostname} to IPv4...`);
  
  try {
    const ipv4Address = await resolveToIPv4(hostname);
    console.log(`Resolved to IPv4: ${ipv4Address}`);
    
    // Replace the hostname with IPv4 in the database URL
    const updatedContent = envContent.replace(
      new RegExp(hostname, 'g'),
      ipv4Address
    );
    
    // Write to a temporary env file
    const tempEnvPath = path.join(__dirname, '.env.ipv4');
    fs.writeFileSync(tempEnvPath, updatedContent);
    
    console.log(`Created ${tempEnvPath} with IPv4 address`);
    console.log('You can now run: cp .env.ipv4 .env && npm run db:push');
    
  } catch (error) {
    console.error('Failed to resolve hostname:', error.message);
    
    // Try using public DNS
    console.log('Trying with public DNS (8.8.8.8)...');
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    
    try {
      const ipv4Address = await resolveToIPv4(hostname);
      console.log(`Resolved with public DNS to IPv4: ${ipv4Address}`);
      
      const updatedContent = envContent.replace(
        new RegExp(hostname, 'g'),
        ipv4Address
      );
      
      const tempEnvPath = path.join(__dirname, '.env.ipv4');
      fs.writeFileSync(tempEnvPath, updatedContent);
      
      console.log(`Created ${tempEnvPath} with IPv4 address`);
      console.log('You can now run: cp .env.ipv4 .env && npm run db:push');
      
    } catch (publicDnsError) {
      console.error('Public DNS also failed:', publicDnsError.message);
    }
  }
}

updateEnvWithIPv4();