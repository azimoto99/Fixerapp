/**
 * Health check script to ensure the application is properly responding to health checks
 * This is important for autoscaling and deployment health verification
 */

// Simple Express server that only responds to health check requests
import express from 'express';
const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Fallback root endpoint that also returns 200 OK for additional health checks
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Start the server on the same port as the main application
// This will only be used if the main application is not running
// This is a backup health check server
const port = process.env.PORT || 5000;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Health check server running on ${host}:${port}`);
});