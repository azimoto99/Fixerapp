import './env';  // This must be the first import

// Force IPv4 DNS resolution
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { healthCheckMiddleware } from './middleware/health-check';
import { sessionActivityMiddleware } from './middleware/session-activity';
import { sessionRecoveryMiddleware } from './middleware/session-recovery';
import { systemMonitor } from './system-monitor';
import { DatabaseResilience } from './utils/database-resilience';
import { storage } from './storage';
// Import seed script to create initial data
import "./seed";

// Log environment variables (excluding sensitive ones)
log('Environment check:');
log(`NODE_ENV: ${process.env.NODE_ENV}`);
log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'Not set'}`);
log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set'}`);
log(`SUPABASE_DATABASE_URL: ${process.env.SUPABASE_DATABASE_URL ? 'Set' : 'Not set'}`);
log(`VITE_STRIPE_PUBLIC_KEY: ${process.env.VITE_STRIPE_PUBLIC_KEY ? 'Set' : 'Not set'}`);
log(`VITE_MAPBOX_ACCESS_TOKEN: ${process.env.VITE_MAPBOX_ACCESS_TOKEN ? 'Set' : 'Not set'}`);

// Verify required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_DATABASE_URL',
  'VITE_STRIPE_PUBLIC_KEY',
  'VITE_MAPBOX_ACCESS_TOKEN'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  log('Missing required environment variables:');
  missingEnvVars.forEach(varName => log(`- ${varName}`));
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Import pool directly from db
import { pool } from './db';
import passport from 'passport';
import session from 'express-session';
import { setupAuth } from './auth';

// Initialize database resilience
const dbResilience = new DatabaseResilience(pool, {
  maxRetries: 5,
  retryDelay: 5000,
  maxConnections: 20
});

dbResilience.on('reconnected', () => {
  console.log('Database connection restored');
  systemMonitor.recordEvent('database_reconnected');
});

dbResilience.on('reconnection_failed', (error) => {
  console.error('Database reconnection failed:', error);
  systemMonitor.recordEvent('database_reconnection_failed');
});

// Configure session middleware
app.use(session({
  store: storage.sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Initialize authentication first
setupAuth(app);

// Then add resilience middleware
app.use(healthCheckMiddleware);
app.use(sessionActivityMiddleware);
app.use(sessionRecoveryMiddleware);

// Add authentication error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'AuthenticationError' || err.message?.includes('authentication')) {
    console.error('Authentication error:', err);
    return res.status(401).json({ 
      message: "Authentication failed",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next(err);
});

// Add error monitoring
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  systemMonitor.recordRequest(true);
  
  // Don't expose internal errors to clients
  res.status(500).json({
    message: "An unexpected error occurred",
    status: "error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Add CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://api.mapbox.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.stripe.com https://api.mapbox.com; " +
    "frame-src 'self' https://js.stripe.com;"
  );
  next();
});

// Serve uploaded avatars statically
app.use('/avatars', express.static('public/avatars'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  
  server.listen({
    port,
    host
  }, () => {
    log(`serving on ${host}:${port}`);
  });
})();
