import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Import seed script to create initial data
import "./seed";
// Import and run the session table creation script
import createSessionsTable from "./create-sessions-table";
// Import database migrations
import { runAllMigrations } from "./migrations/run-migrations";

const app = express();

// CRITICAL: Root path health check for deployment
// This must be the first middleware to ensure it always responds
// quickly and reliably for deployment health checks
app.get('/', (req, res, next) => {
  // Fast path for health checkers (matching User-Agent)
  if (req.get('User-Agent')?.includes('HealthChecker') || 
      req.get('User-Agent')?.includes('GoogleHC') ||
      req.get('x-health-check') === '1' ||
      req.query.health === '1') {
    return res.status(200).send('OK');
  }
  
  // Also handle any bare request to root with no Accept header
  // This catches Replit Deployments health checks
  if (!req.get('Accept') || req.get('Accept') === '*/*') {
    return res.status(200).send('OK');
  }
  
  // If this is an API health check
  if (req.query.health_check === '1') {
    return res.status(200).send('OK');
  }
  
  // Otherwise continue with normal request handling (HTML, etc.)
  next();
});

// Also add a dedicated health check endpoint
app.get("/health", (_req, res) => {
  // Simple health check that returns 200 OK
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Ensure sessions table exists before setting up routes
  await createSessionsTable();
  
  // Run database migrations
  try {
    await runAllMigrations();
    log('Database migrations completed successfully');
  } catch (error) {
    log('Error running database migrations:', String(error));
    // Continue with server startup even if migrations fail
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error but don't crash the server in production
    console.error(`Server Error: ${message}`, err);
    
    // Send response to client
    res.status(status).json({ message });
    
    // Only rethrow errors in development for better debugging
    if (process.env.NODE_ENV === 'development') {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Health check endpoints are already defined at the top of the file

  const port = process.env.PORT || 5000;
  const host = '0.0.0.0';

  server.listen(5000, '0.0.0.0', () => {
    log(`Server running on ${host}:${port}`);
    log(`Health check endpoint available at /health`);
  });
})();
