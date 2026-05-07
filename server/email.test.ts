/**
 * Tests for the email confirmation helper (server/email.ts) and its
 * integration inside the earlyAccess.submit tRPC procedure.
 * The Resend client is mocked so no real network calls are made.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock Resend SDK ───────────────────────────────────────────────────────────
const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
    domains: { list: vi.fn() },
  })),
}));

// ── Mock ENV so the API key is always "present" ───────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    resendApiKey: "re_test_key",
    forgeApiUrl: "",
    forgeApiKey: "",
    appId: "",
    cookieSecret: "",
    databaseUrl: "",
    oAuthServerUrl: "",
    ownerOpenId: "",
    isProduction: false,
  },
}));

// ── Mock DB helper ────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  insertEarlyAccessSignup: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock notification helper ──────────────────────────────────────────────────
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Import after mocks
import { sendEarlyAccessConfirmation } from "./email";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const VALID_SIGNUP = {
  firstName: "Sarah",
  lastName: "Chen",
  email: "sarah@acme.com",
  company: "Acme Corp",
  teamSize: "2–5 people",
  useCase: "Wire transfers & payment approvals",
};

// ── sendEarlyAccessConfirmation unit tests ────────────────────────────────────

describe("sendEarlyAccessConfirmation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls Resend with correct recipient and subject", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "email_123" }, error: null });

    const result = await sendEarlyAccessConfirmation({
      toEmail: "sarah@acme.com",
      firstName: "Sarah",
      company: "Acme Corp",
    });

    expect(result).toBe(true);
    expect(mockSend).toHaveBeenCalledOnce();
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toContain("sarah@acme.com");
    expect(call.subject).toContain("Sarah");
    expect(call.html).toContain("Sarah");
    expect(call.html).toContain("Acme Corp");
    expect(call.html).toContain("LiveLock");
  });

  it("returns false and does not throw when Resend returns an error object", async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: "Invalid API key" } });

    const result = await sendEarlyAccessConfirmation({
      toEmail: "sarah@acme.com",
      firstName: "Sarah",
      company: "Acme Corp",
    });

    expect(result).toBe(false);
  });

  it("returns false and does not throw when Resend throws", async () => {
    mockSend.mockRejectedValueOnce(new Error("Network timeout"));

    const result = await sendEarlyAccessConfirmation({
      toEmail: "sarah@acme.com",
      firstName: "Sarah",
      company: "Acme Corp",
    });

    expect(result).toBe(false);
  });

  it("includes a plain-text fallback body", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "email_456" }, error: null });

    await sendEarlyAccessConfirmation({
      toEmail: "sarah@acme.com",
      firstName: "Sarah",
      company: "Acme Corp",
    });

    const call = mockSend.mock.calls[0][0];
    expect(call.text).toContain("Sarah");
    expect(call.text).toContain("Acme Corp");
    expect(call.text).toContain("livelock.io");
  });
});

// ── earlyAccess.submit integration: email is called ──────────────────────────

describe("earlyAccess.submit — email integration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a confirmation email on successful signup", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "email_789" }, error: null });

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.earlyAccess.submit(VALID_SIGNUP);

    expect(result).toEqual({ success: true });
    expect(mockSend).toHaveBeenCalledOnce();
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toContain("sarah@acme.com");
  });

  it("still returns success when email sending fails", async () => {
    mockSend.mockRejectedValueOnce(new Error("Resend down"));

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.earlyAccess.submit(VALID_SIGNUP);

    // Email failure must not break the signup
    expect(result).toEqual({ success: true });
  });
});
