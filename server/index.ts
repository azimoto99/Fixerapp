import './env';  // This must be the first import

// Force IPv4 DNS resolution
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from "./vite";
import { healthCheckMiddleware } from './middleware/health-check';
import { sessionActivityMiddleware } from './middleware/session-activity';
import { sessionRecoveryMiddleware } from './middleware/session-recovery';
import { systemMonitor } from './system-monitor';
import { DatabaseResilience } from './utils/database-resilience';
import { storage } from './storage';
import { errorHandler } from './middleware/error-handler';
// Seeding removed - run manually if needed with: node server/seed.ts
import userRoutes from './routes/user';
import helmet from 'helmet';
import { securityConfig } from './security-config';
import { WebSocketServer as WSServer } from 'ws';

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

// Initialize database resilience only if pool is available
let dbResilience: DatabaseResilience | undefined = undefined;
if (pool) {
  dbResilience = new DatabaseResilience(pool, {
    maxRetries: 5,
    retryDelay: 5000,
    maxConnections: 20
  });

  dbResilience.on('reconnected', () => {
    console.log('Database connection restored');
    systemMonitor.recordRequest(false); // Record as successful request
  });

  dbResilience.on('reconnection_failed', (error) => {
    console.error('Database reconnection failed:', error);
    systemMonitor.recordRequest(true); // Record as error
  });
} else {
  console.warn('Database pool not initialized - resilience features disabled');
}

// Initialize authentication first
setupAuth(app);

// Import RLS middleware
import { setRLSContext } from './middleware/rls-context';

// Apply RLS context middleware to all API routes
app.use('/api', setRLSContext);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://api.mapbox.com", "https://basil.stripe.com", "blob:"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://api.mapbox.com", "https://basil.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.mapbox.com", "https://events.mapbox.com", "wss:", "ws:", "https://basil.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com", "https://connect.stripe.com"],
      childSrc: ["'self'", "blob:", "https://js.stripe.com"],
      workerSrc: ["'self'", "blob:", "https://js.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Apply security configuration
app.use('/api/auth', securityConfig.rateLimits.auth);
app.use('/api/jobs', securityConfig.rateLimits.jobPosting);
app.use('/api/stripe', securityConfig.rateLimits.payment);
app.use('/api/admin', securityConfig.rateLimits.admin);
app.use('/api', securityConfig.rateLimits.api);

// Temporarily disable aggressive health check middleware to resolve database overload
// app.use(healthCheckMiddleware);

// Enable trust proxy for proper IP detection behind reverse proxy
app.set('trust proxy', 1);

// Then add resilience middleware
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

// CSP is now handled by Helmet configuration above

app.use(express.static('public'));

// Remove the specific static route for avatars as they are now served from S3
// app.use('/avatars', express.static('public/avatars'));

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

// Register user routes BEFORE main routes to prevent interception
app.use('/api/user', userRoutes);

// Register images proxy route
import imagesRoutes from './routes/images';
app.use('/api/images', imagesRoutes);

// Register sitemap and robots.txt routes
import sitemapRoutes from './sitemap';
app.use('/', sitemapRoutes);

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error for debugging
    console.error(`Error handler caught: ${status} - ${message}`, err);
    
    // Send error response to client
    res.status(status).json({ message });
    
    // Don't throw the error after sending response
    // This prevents unhandled promise rejections
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

// WebSocket server setup with rate limiting
const wss = new WSServer({ noServer: true });

// Rate limiting for WebSocket connections
const wsConnections = new Map<string, { count: number, lastReset: number }>();
const WS_RATE_LIMIT = {
  MAX_CONNECTIONS_PER_IP: 5,
  MAX_MESSAGES_PER_MINUTE: 60,
  RESET_INTERVAL: 60000, // 1 minute
};

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('WebSocket connection established');
  
  // Apply rate limiting by IP
  const ip = req.socket.remoteAddress || 'unknown';
  
  // Initialize or update connection count for this IP
  if (!wsConnections.has(ip)) {
    wsConnections.set(ip, { count: 1, lastReset: Date.now() });
  } else {
    const ipData = wsConnections.get(ip)!;
    
    // Reset count if it's been more than the reset interval
    if (Date.now() - ipData.lastReset > WS_RATE_LIMIT.RESET_INTERVAL) {
      ipData.count = 1;
      ipData.lastReset = Date.now();
    } else {
      ipData.count++;
    }
    
    // Check if connection limit exceeded
    if (ipData.count > WS_RATE_LIMIT.MAX_CONNECTIONS_PER_IP) {
      console.warn(`WebSocket connection limit exceeded for IP: ${ip}`);
      ws.close(1008, 'Too many connections');
      return;
    }
  }
  
  // Message rate limiting
  let messageCount = 0;
  let lastMessageReset = Date.now();
  
  // Set up message handler
  ws.on('message', (message) => {
    try {
      // Apply message rate limiting
      const now = Date.now();
      if (now - lastMessageReset > WS_RATE_LIMIT.RESET_INTERVAL) {
        messageCount = 1;
        lastMessageReset = now;
      } else {
        messageCount++;
        
        if (messageCount > WS_RATE_LIMIT.MAX_MESSAGES_PER_MINUTE) {
          console.warn(`WebSocket message rate limit exceeded for IP: ${ip}`);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Message rate limit exceeded. Please slow down.'
          }));
          return;
        }
      }
      
      const data = JSON.parse(message.toString());
      console.log('WebSocket message received:', data.type);
      
      // Handle different message types
      switch (data.type) {
        case 'authenticate':
          // Handle authentication
          ws.send(JSON.stringify({
            type: 'authenticated',
            connectionId: crypto.randomUUID(),
            userId: data.userId,
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'heartbeat':
          // Respond to heartbeat
          ws.send(JSON.stringify({
            type: 'heartbeat_ack',
            timestamp: new Date().toISOString(),
            serverTime: Date.now()
          }));
          break;
          
        case 'join_room':
          // Handle room joining
          if (data.jobId) {
            console.log(`User ${data.userId} joined room for job ${data.jobId}`);
            // Add to room in connection manager
          }
          break;
          
        case 'leave_room':
          // Handle room leaving
          if (data.jobId) {
            console.log(`User ${data.userId} left room for job ${data.jobId}`);
            // Remove from room in connection manager
          }
          break;
          
        case 'send_message':
          // Handle message sending
          console.log(`Message from user ${data.userId} to ${data.recipientId}`);
          // Process and store message, then broadcast to recipient
          break;
          
        default:
          console.log(`Unhandled message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  // Handle connection close
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    
    // Update connection count for this IP
    const ipData = wsConnections.get(ip);
    if (ipData && ipData.count > 0) {
      ipData.count--;
    }
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});
