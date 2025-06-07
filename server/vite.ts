import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

export const log = console.log;

export async function setupVite(app: Express, server: Server) {
  const vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: {
        server,
        protocol: 'ws',
        host: 'localhost',
        port: 5000,
        clientPort: 5000
      }
    },
    appType: 'custom',
    root: path.resolve(process.cwd(), "client"),
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'client/src'),
        '@shared': path.resolve(process.cwd(), 'shared'),
        '@assets': path.resolve(process.cwd(), 'attached_assets'),
      }
    }
  });

  // Use Vite's middleware first
  app.use(vite.middlewares);

  // Then handle any remaining requests (but skip API routes)
  app.use("*", async (req, res, next) => {
    // Skip if the request has already been handled by Vite
    if (res.headersSent) {
      return next();
    }

    // Skip API routes - let them be handled by the API router
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }

    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files
  app.use(express.static(distPath));

  // Handle any remaining requests (but skip API routes)
  app.use("*", (req, res, next) => {
    // Skip if the request has already been handled
    if (res.headersSent) {
      return next();
    }
    
    // Skip API routes - let them be handled by the API router
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}