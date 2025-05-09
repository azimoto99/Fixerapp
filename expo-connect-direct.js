// This script provides multiple connection URL formats for Expo Go
// Run with: node expo-connect-direct.js

import QRCode from 'qrcode';

// Get the current Replit URL
const getReplitUrl = () => {
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  
  // Fallback URL if environment variables aren't available
  return 'https://f687e0af-8a85-452c-998d-fcf012f2440c-00-qm9vd9fy3b2t.riker.replit.dev';
};

const currentUrl = getReplitUrl();

// Create multiple URL formats for different Expo versions
const urlFormats = [
  {
    name: "Standard format",
    url: `exp://${currentUrl.replace('https://', '')}`
  },
  {
    name: "With port 80 (for older Expo)",
    url: `exp://${currentUrl.replace('https://', '')}:80`
  },
  {
    name: "Dev client format",
    url: `exp+fixer://${currentUrl.replace('https://', '')}`
  },
  {
    name: "Alternative format",
    url: `${currentUrl}/--/`
  }
];

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

// Print header
console.log(`\n${colors.green}==================================${colors.reset}`);
console.log(`${colors.green}       🔧 Fixer App 🔧        ${colors.reset}`);
console.log(`${colors.green}==================================${colors.reset}\n`);
console.log(`${colors.blue}Direct connection options for Expo Go${colors.reset}\n`);

// Print original web URL
console.log(`${colors.yellow}Web URL:${colors.reset} ${currentUrl}\n`);

// Generate and print QR codes for each format
const generateAllQRs = async () => {
  try {
    for (let i = 0; i < urlFormats.length; i++) {
      const format = urlFormats[i];
      console.log(`${colors.green}Option ${i+1}: ${format.name}${colors.reset}`);
      console.log(`URL: ${colors.yellow}${format.url}${colors.reset}\n`);
      
      const qrCode = await QRCode.toString(format.url, { 
        type: 'terminal', 
        small: true,
        scale: 1
      });
      
      console.log(qrCode);
      console.log('\n');
    }
    
    // Print troubleshooting tips
    console.log(`${colors.green}Troubleshooting Tips:${colors.reset}`);
    console.log(`1. Try each option one by one in Expo Go app`);
    console.log(`2. Make sure your phone and computer are on the same network`);
    console.log(`3. For Android, toggle between "LAN" and "Tunnel" in Expo settings`);
    console.log(`4. Restart the Expo Go app between attempts`);
    console.log(`5. If all else fails, try manually typing the URL in Expo Go\n`);
    
  } catch (err) {
    console.error('Error generating QR codes:', err);
  }
};

// Run the function
generateAllQRs();