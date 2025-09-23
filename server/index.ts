
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
  }
}

async function startServer() {
  const app = express();
  
  // Basic middleware
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Register all routes and create HTTP server
  const httpServer = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Internal server error" });
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Setup Vite or static serving
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // Start server
  httpServer.listen(port, "0.0.0.0", () => {
    log(`✅ Writers Guild server running on port ${port}`);
    log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });
}

// Start the server
startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
