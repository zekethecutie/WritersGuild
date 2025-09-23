import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
  }
}

// Server initialization
console.log('Starting server...');

const app = express();

// Trust proxy for proper WebSocket handling
app.set('trust proxy', 1);

// Session will be configured in routes.ts
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Enhanced middleware with better error handling
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
      if (capturedJsonResponse && res.statusCode >= 400) {
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

async function startServer() {
  try {
    const httpServer = await registerRoutes(app);

    // Enhanced error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`Error: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    const requestedPort = parseInt(process.env.PORT || '5000', 10);
    
    // Setup Vite with better error handling
    if (app.get("env") === "development") {
      await setupVite(app, httpServer);
    } else {
      serveStatic(app);
    }

    // Start server with better error handling
    httpServer.listen(requestedPort, "0.0.0.0", () => {
      log(`✅ Server running on port ${requestedPort}`);
    }).on('error', (err: any) => {
      log(`❌ Server failed to start: ${err.message}`);
      process.exit(1);
    });

  } catch (error) {
    log(`❌ Failed to initialize server: ${error}`);
    process.exit(1);
  }
}

startServer();
