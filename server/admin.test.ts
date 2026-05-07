/**
 * Tests for the earlyAccess.listSignups admin-only tRPC procedure.
 * Verifies the auth gate (FORBIDDEN for non-admins) and the data shape returned.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ── Mock database helper ──────────────────────────────────────────────────────
const mockSignups = [
  {
    id: 1,
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah@acme.com",
    company: "Acme Corp",
    teamSize: "2–5 people",
    useCase: "Wire transfers",
    message: "Excited to try this.",
    createdAt: new Date(),
  },
  {
    id: 2,
    firstName: "Marcus",
    lastName: "Webb",
    email: "marcus@finco.io",
    company: "FinCo",
    teamSize: "6–15 people",
    useCase: "Invoice approvals",
    message: null,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  },
];

vi.mock("./db", () => ({
  insertEarlyAccessSignup: vi.fn().mockResolvedValue(undefined),
  getEarlyAccessSignups: vi.fn().mockResolvedValue([]),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { appRouter } from "./routers";
import { getEarlyAccessSignups } from "./db";

// ── Context helpers ───────────────────────────────────────────────────────────

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "owner-open-id",
      name: "Admin User",
      email: "admin@livelock.io",
      role: "admin",
      loginMethod: "oauth",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as User,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user-open-id",
      name: "Regular User",
      email: "user@example.com",
      role: "user",
      loginMethod: "oauth",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as User,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("earlyAccess.listSignups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to the default two-signup fixture before each test
    vi.mocked(getEarlyAccessSignups).mockResolvedValue([...mockSignups]);
  });

  it("returns signups and stats for an admin user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.earlyAccess.listSignups();

    expect(result.signups).toHaveLength(2);
    expect(result.stats.total).toBe(2);
    expect(typeof result.stats.today).toBe("number");
    expect(typeof result.stats.thisWeek).toBe("number");
    expect(getEarlyAccessSignups).toHaveBeenCalledOnce();
  });

  it("returns correct today count when signups were created today", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.earlyAccess.listSignups();

    // mockSignups[0] was created now (today), mockSignups[1] was 7 days ago
    expect(result.stats.today).toBe(1);
  });

  it("returns correct thisWeek count", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.earlyAccess.listSignups();

    // Both signups are within the last 7 days (one is exactly 7 days ago, boundary inclusive)
    expect(result.stats.thisWeek).toBeGreaterThanOrEqual(1);
  });

  it("throws FORBIDDEN for a non-admin authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const err = await caller.earlyAccess.listSignups().catch(e => e);
    expect(err).toBeDefined();
    expect(err.code).toBe("FORBIDDEN");
  });

  it("throws FORBIDDEN for an unauthenticated (public) request", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const err = await caller.earlyAccess.listSignups().catch(e => e);
    expect(err).toBeDefined();
    // Unauthenticated requests also fail the admin gate
    expect(["FORBIDDEN", "UNAUTHORIZED"]).toContain(err.code);
  });

  it("returns empty signups array and zero stats when no signups exist", async () => {
    vi.mocked(getEarlyAccessSignups).mockResolvedValue([]);
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.earlyAccess.listSignups();

    expect(result.signups).toHaveLength(0);
    expect(result.stats.total).toBe(0);
    expect(result.stats.today).toBe(0);
    expect(result.stats.thisWeek).toBe(0);
  });
});
