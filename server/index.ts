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

const app = express();

// Basic middleware setup
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Simplified logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
  }
  next();
});

async function startServer() {
  const httpServer = await registerRoutes(app);

  // Simple error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Server error" });
  });

  const port = parseInt(process.env.PORT || '5000', 10);
  
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  httpServer.listen(port, "0.0.0.0", () => {
    log(`✅ Server running on port ${port}`);
  });
}

startServer().catch(err => {
  log(`❌ Server startup failed: ${err.message}`);
  process.exit(1);
});
