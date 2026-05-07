/**
 * LiveLock — Server Entry Point
 *
 * Security hardening applied:
 *  - Helmet: security headers (CSP, HSTS, X-Frame-Options, etc.)
 *  - Rate limiting: per-IP limits on API and auth endpoints
 *  - CORS: locked to livelock.io only (not wildcard)
 *  - JWT_SECRET guard: crashes at startup if secret is missing
 *  - Structured startup validation
 */
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { attachSocketServer } from "./socketServer";
import { ENV } from "./_core/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Startup validation ────────────────────────────────────────────────────────
// Crash immediately if critical secrets are missing rather than running insecurely

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET environment variable is missing or too short (min 32 chars). Refusing to start.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL environment variable is missing. Refusing to start.");
  process.exit(1);
}

// ── Allowed origins ───────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://livelock.io",
  "https://www.livelock.io",
  // Allow local dev
  "http://localhost:3000",
  "http://localhost:5173",
];

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust the reverse proxy (Cloudflare/Manus) so req.ip is the real client IP
  app.set("trust proxy", 1);

  // ── Security headers (Helmet) ─────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // inline scripts needed for React hydration
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss://livelock.io", "https://livelock.io", "https://*.metered.live"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // required for WebRTC
      hsts: {
        maxAge: 31536000,   // 1 year
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // ── CORS — locked to livelock.io only ────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ── Rate limiting ─────────────────────────────────────────────────────────

  // General API: 100 requests per minute per IP
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please slow down." },
  });

  // Auth endpoints: 10 attempts per 15 minutes per IP (brute force protection)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts. Please wait 15 minutes." },
    skipSuccessfulRequests: true, // only count failed attempts
  });

  // Session initiation: 20 per minute per IP (prevents session spam)
  const sessionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many session requests. Please slow down." },
  });

  // Apply rate limits to specific paths
  app.use("/api/trpc/webauthn.registrationOptions", authLimiter);
  app.use("/api/trpc/webauthn.verifyRegistration", authLimiter);
  app.use("/api/trpc/webauthn.authenticationOptions", authLimiter);
  app.use("/api/trpc/webauthn.verifyAuthentication", authLimiter);
  app.use("/api/trpc/sessions.initiate", sessionLimiter);
  app.use("/api/trpc", apiLimiter);

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  // ── tRPC API ──────────────────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ── Static files ──────────────────────────────────────────────────────────
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath, {
    // Security: don't expose directory listings
    index: "index.html",
  }));

  // Client-side routing — serve index.html for all non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // ── Socket.io ─────────────────────────────────────────────────────────────
  attachSocketServer(server);

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`[LiveLock] Server running on port ${port} (${process.env.NODE_ENV ?? "development"})`);
  });
}

startServer().catch((err) => {
  console.error("[LiveLock] Fatal startup error:", err);
  process.exit(1);
});
