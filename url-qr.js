import QRCode from 'qrcode';

// Get the URL of the current app
const currentUrl = process.env.REPL_SLUG ? 
  `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
  'https://f687e0af-8a85-452c-998d-fcf012f2440c-00-qm9vd9fy3b2t.riker.replit.dev';

// Convert URL to Expo format with port 80 explicitly for better compatibility
const expoUrl = currentUrl.replace('https://', 'exp://') + ':80';

// Also create a direct Expo dev client URL as an alternative
const expoDevClientUrl = `exp+fixer://${currentUrl.replace('https://', '')}`;

// Generate the QR code
const generateQR = async () => {
  try {
    // Generate QR code
    const code = await QRCode.toString(expoUrl, { type: 'terminal', small: true });
    
    // Print instructions
    console.log('\n\x1b[32m=================================\x1b[0m');
    console.log('\x1b[32m       🔧 Fixer App 🔧       \x1b[0m');
    console.log('\x1b[32m=================================\x1b[0m\n');
    console.log('Scan this QR code with the Expo Go app on your phone:\n');
    console.log(code);
    console.log('\nOr enter one of these URLs in Expo Go:');
    console.log('1. Regular Expo format: \x1b[33m' + expoUrl + '\x1b[0m');
    console.log('2. Dev client format: \x1b[33m' + expoDevClientUrl + '\x1b[0m');
    
    // Create alternative QR code for the Dev Client URL
    const devClientQR = await QRCode.toString(expoDevClientUrl, { type: 'terminal', small: true });
    console.log('\nAlternative QR code (if first one doesn\'t work):\n');
    console.log(devClientQR);
    
    console.log('\nCurrent web URL:');
    console.log('\x1b[36m' + currentUrl + '\x1b[0m\n');
    console.log('Make sure you have Expo Go installed:');
    console.log('- Android: https://play.google.com/store/apps/details?id=host.exp.exponent');
    console.log('- iOS: https://apps.apple.com/app/expo-go/id982107779\n');
    
    console.log('\x1b[32mTroubleshooting tips:\x1b[0m');
    console.log('- Try both URL formats in Expo Go');
    console.log('- Ensure your phone and development device are on the same network');
    console.log('- For Android, toggle "LAN" to "Tunnel" in Expo settings');
    
  } catch (err) {
    console.error('Error generating QR code:', err);
  }
};

generateQR();