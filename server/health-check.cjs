/**
 * Dedicated health check server (CommonJS version) - Ultra-reliable fallback for health checks
 * This is important for autoscaling and deployment health verification
 */

const http = require('http');
const express = require('express');

// Create Express app
const app = express();

// Set up proper signal handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Add request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`HEALTH: ${req.method} ${req.url} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    server: 'health-check-fallback-cjs'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Start the server on the same port as the main application
const port = process.env.PORT || 5000;
const host = '0.0.0.0';

// Create HTTP server explicitly to have more control
const server = http.createServer(app);

// Start server with error handling
server.listen(port, host, () => {
  console.log(`Health check server (CJS) running on ${host}:${port}`);
  console.log(`Health check server process ID: ${process.pid}`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${port} already in use, main server is likely running`);
    // In this case we can exit cleanly, as the main server is running
    process.exit(0);
  } else {
    console.error('Health check server error:', error);
  }
});

// Function to handle graceful shutdown
function gracefulShutdown() {
  console.log('Health check server shutting down gracefully...');
  server.close(() => {
    console.log('Health check server closed');
    process.exit(0);
  });
  
  // Force exit after timeout
  setTimeout(() => {
    console.error('Health check server forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}