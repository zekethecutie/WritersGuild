import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger, ViteDevServer } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: any) {
  try {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: 3000,
          host: "0.0.0.0"
        }
      },
      appType: "spa",
      configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
    });

    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);

    // Enhanced WebSocket handling
    server.on("upgrade", (request: any, socket: any, head: any) => {
      if (request.url && request.url.includes("vite-hmr")) {
        vite.ws.handleUpgrade(request, socket, head);
      } else {
        socket.destroy();
      }
    });

    log("✅ Vite dev server configured");
  } catch (error) {
    log(`❌ Vite setup failed: ${error}`);
    throw error;
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}