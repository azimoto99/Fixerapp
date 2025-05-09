/**
 * This script creates a simpler approach to connecting to Expo
 * which should work better with the Replit environment
 */

import { createServer } from 'http';
import fs from 'fs';

// Create a simple HTTP server that serves the Expo Go redirector
const server = createServer((req, res) => {
  console.log(`Request received: ${req.url}`);
  
  // Get the current Replit URL
  const replit_url = process.env.REPL_SLUG 
    ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` 
    : 'f687e0af-8a85-452c-998d-fcf012f2440c-00-qm9vd9fy3b2t.riker.replit.dev';
  
  // Create a simple HTML page that redirects to the Expo app
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Connect to Expo Go</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          h1 {
            color: #333;
            margin-top: 0;
          }
          .icon {
            font-size: 64px;
            margin-bottom: 16px;
          }
          .url {
            background: #f0f0f0;
            padding: 12px;
            border-radius: 6px;
            font-family: monospace;
            margin: 16px 0;
            word-break: break-all;
          }
          .button {
            background: #4285f4;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 16px;
            text-decoration: none;
            display: inline-block;
          }
          .button:hover {
            background: #3367d6;
          }
          .info {
            color: #666;
            font-size: 14px;
            margin-top: 24px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🔧</div>
          <h1>Connect to Fixer App</h1>
          <p>Use this URL in the Expo Go app:</p>
          <div class="url">exp://${replit_url}</div>
          
          <p>For iOS and Android:</p>
          <a href="exp://${replit_url}" class="button">Open in Expo Go</a>
          
          <div class="info">
            <p>If the button doesn't work, open the Expo Go app and enter the URL manually.</p>
            <p>Make sure you have Expo Go installed from your app store.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  // Set response headers
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-cache'
  });
  
  // Log the Expo URL
  console.log('\n🚀 Ready to connect to Expo Go!');
  console.log(`\nExpo URL: exp://${replit_url}`);
  
  // Send the HTML response
  res.end(html);
});

// Start the server on an available port
const port = 8081;
server.listen(port, () => {
  console.log(`
=================================
       🔧 Fixer App 🔧       
=================================

Expo connector is running!

1. Open this URL in your browser:
   http://localhost:${port}

2. From there, you can click the "Open in Expo Go" button
   or manually enter the URL in the Expo Go app:
   exp://${process.env.REPL_SLUG 
     ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` 
     : 'f687e0af-8a85-452c-998d-fcf012f2440c-00-qm9vd9fy3b2t.riker.replit.dev'}

This server will keep running until you press Ctrl+C to stop it.
  `);
});