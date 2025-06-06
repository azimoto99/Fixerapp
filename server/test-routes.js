/**
 * Simple test script to verify route registration
 * Run with: node test-routes.js
 */

const express = require('express');
const app = express();

// Import the modified routes file
const { registerRoutes } = require('./routes');

// Set up a mock HTTP server
const mockServer = {
  listen: () => {},
  on: () => {}
};

// Register the routes we want to test
registerRoutes(app).then(() => {
  // Get all registered routes
  const routes = [];
  
  // Extract routes from Express app
  const stack = app._router.stack;

  console.log('=== REGISTERED ROUTES ===');
  
  stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      const path = middleware.route.path;
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      routes.push(`${methods} ${path}`);
    } else if (middleware.name === 'router') {
      // Routes registered on a router
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
          routes.push(`${methods} ${path} (via router)`);
        }
      });
    }
  });
  
  // Display all routes
  routes.forEach((route) => {
    console.log(route);
  });
  
  // Specifically check for our payment-first endpoint
  const paymentFirstRoute = routes.find(r => r.includes('/api/jobs/payment-first'));
  
  if (paymentFirstRoute) {
    console.log('\n✅ Payment-first job posting route registered successfully!');
  } else {
    console.log('\n❌ Payment-first job posting route not found!');
  }
});
