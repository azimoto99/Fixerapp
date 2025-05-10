import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

const url = process.argv[2] || 'https://fixer-app.replit.app';

// Convert URL to Expo format
const expoUrl = url.replace('https://', 'exp://');

// Generate QR code
try {
  const code = await QRCode.toString(expoUrl, { type: 'terminal', small: true });
  
  console.log('\n\x1b[32m=================================\x1b[0m');
  console.log('\x1b[32m       🔧 Fixer App 🔧       \x1b[0m');
  console.log('\x1b[32m=================================\x1b[0m\n');
  console.log('Scan this QR code with the Expo Go app on your phone:\n');
  console.log(code);
  console.log('\nOr manually enter this URL in Expo Go:');
  console.log('\x1b[33m' + expoUrl + '\x1b[0m\n');
  console.log('Make sure you have Expo Go installed:');
  console.log('- Android: https://play.google.com/store/apps/details?id=host.exp.exponent');
  console.log('- iOS: https://apps.apple.com/app/expo-go/id982107779\n');
} catch (err) {
  console.error('Error generating QR code:', err);
}