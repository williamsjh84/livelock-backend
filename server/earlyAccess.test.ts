/**
 * Tests for the earlyAccess.submit tRPC procedure.
 * These tests mock the database and notification helpers so no real DB
 * connection or external service is required.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ── Mock database helper ──────────────────────────────────────────────────────
vi.mock("./db", () => ({
  insertEarlyAccessSignup: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock notification helper ──────────────────────────────────────────────────
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Import after mocks are in place
import { appRouter } from "./routers";
import { insertEarlyAccessSignup } from "./db";
import { notifyOwner } from "./_core/notification";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

const VALID_INPUT = {
  firstName: "Sarah",
  lastName: "Chen",
  email: "sarah@acme.com",
  company: "Acme Corp",
  teamSize: "2–5 people",
  useCase: "Wire transfers & payment approvals",
  message: "Looking forward to trying this.",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("earlyAccess.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves the signup and notifies the owner on valid input", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.earlyAccess.submit(VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(insertEarlyAccessSignup).toHaveBeenCalledOnce();
    expect(insertEarlyAccessSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Sarah",
        lastName: "Chen",
        email: "sarah@acme.com",
        company: "Acme Corp",
      })
    );
    expect(notifyOwner).toHaveBeenCalledOnce();
  });

  it("succeeds even when message is omitted", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const { message: _omit, ...inputWithoutMessage } = VALID_INPUT;
    const result = await caller.earlyAccess.submit(inputWithoutMessage);

    expect(result).toEqual({ success: true });
    expect(insertEarlyAccessSignup).toHaveBeenCalledOnce();
  });

  it("rejects an invalid email address", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.earlyAccess.submit({ ...VALID_INPUT, email: "not-an-email" })
    ).rejects.toThrow();
  });

  it("rejects an empty firstName", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.earlyAccess.submit({ ...VALID_INPUT, firstName: "" })
    ).rejects.toThrow();
  });

  it("rejects an empty company name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.earlyAccess.submit({ ...VALID_INPUT, company: "" })
    ).rejects.toThrow();
  });

  it("still returns success when owner notification fails", async () => {
    // Simulate notification service being temporarily unavailable
    vi.mocked(notifyOwner).mockRejectedValueOnce(new Error("Service unavailable"));

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.earlyAccess.submit(VALID_INPUT);

    // The signup was saved to DB — notification failure is non-fatal
    expect(result).toEqual({ success: true });
    expect(insertEarlyAccessSignup).toHaveBeenCalledOnce();
  });
});
