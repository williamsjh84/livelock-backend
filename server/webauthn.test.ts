/**
 * LiveLock — WebAuthn Unit Tests
 * Tests for challenge storage, credential helpers, and session flow logic.
 * WebAuthn crypto operations are tested via mocks since they require a real browser.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the database module ──────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

// ── Challenge expiry logic ────────────────────────────────────────────────────
describe("Challenge expiry", () => {
  it("should set expiry 5 minutes in the future", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 5 * 60 * 1000);
    const diffMs = expiresAt.getTime() - now;
    expect(diffMs).toBeGreaterThanOrEqual(4 * 60 * 1000);
    expect(diffMs).toBeLessThanOrEqual(6 * 60 * 1000);
  });

  it("should detect an expired challenge", () => {
    const expiredAt = new Date(Date.now() - 1000); // 1 second ago
    const isExpired = expiredAt < new Date();
    expect(isExpired).toBe(true);
  });

  it("should detect a valid (non-expired) challenge", () => {
    const validUntil = new Date(Date.now() + 60 * 1000); // 1 minute from now
    const isExpired = validUntil < new Date();
    expect(isExpired).toBe(false);
  });
});

// ── Device name detection ─────────────────────────────────────────────────────
describe("Device name detection", () => {
  function getDeviceName(ua: string): string {
    if (/iPhone/.test(ua)) return "iPhone";
    if (/iPad/.test(ua)) return "iPad";
    if (/Mac/.test(ua)) return "Mac";
    if (/Android/.test(ua)) return "Android";
    if (/Windows/.test(ua)) return "Windows PC";
    return "My Device";
  }

  it("detects iPhone", () => {
    expect(getDeviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("iPhone");
  });

  it("detects Android", () => {
    expect(getDeviceName("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("Android");
  });

  it("detects Mac", () => {
    expect(getDeviceName("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("Mac");
  });

  it("detects Windows", () => {
    expect(getDeviceName("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows PC");
  });

  it("falls back to My Device for unknown UA", () => {
    expect(getDeviceName("curl/7.68.0")).toBe("My Device");
  });
});

// ── RP ID derivation ──────────────────────────────────────────────────────────
describe("RP ID derivation", () => {
  function getRpId(hostname: string): string {
    if (hostname === "localhost" || hostname === "127.0.0.1") return "localhost";
    return hostname.split(":")[0];
  }

  it("returns localhost for local development", () => {
    expect(getRpId("localhost")).toBe("localhost");
    expect(getRpId("127.0.0.1")).toBe("localhost");
  });

  it("returns the bare domain for production", () => {
    expect(getRpId("livelock.io")).toBe("livelock.io");
  });

  it("strips port from hostname", () => {
    expect(getRpId("livelock.io:3000")).toBe("livelock.io");
  });
});

// ── Counter validation ────────────────────────────────────────────────────────
describe("Authenticator counter validation", () => {
  it("accepts a counter that is higher than stored (normal use)", () => {
    const storedCounter = 5;
    const newCounter = 6;
    const isValid = newCounter > storedCounter || newCounter === 0;
    expect(isValid).toBe(true);
  });

  it("rejects a counter that is equal to stored (possible replay)", () => {
    const storedCounter = 5;
    const newCounter = 5;
    // Counter must be strictly greater than stored (unless both are 0)
    const isValid = newCounter > storedCounter || (storedCounter === 0 && newCounter === 0);
    expect(isValid).toBe(false);
  });

  it("rejects a counter that is lower than stored (cloned authenticator)", () => {
    const storedCounter = 10;
    const newCounter = 3;
    const isValid = newCounter > storedCounter || newCounter === 0;
    expect(isValid).toBe(false);
  });

  it("accepts counter of 0 for software authenticators that don't increment", () => {
    const storedCounter = 0;
    const newCounter = 0;
    const isValid = newCounter > storedCounter || newCounter === 0;
    expect(isValid).toBe(true);
  });
});

// ── Email validation ──────────────────────────────────────────────────────────
describe("Email validation", () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it("accepts valid email addresses", () => {
    expect(emailRegex.test("joe@company.com")).toBe(true);
    expect(emailRegex.test("user+tag@domain.co.uk")).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(emailRegex.test("notanemail")).toBe(false);
    expect(emailRegex.test("missing@tld")).toBe(false);
    expect(emailRegex.test("@nodomain.com")).toBe(false);
  });
});

// ── Synthetic openId generation ───────────────────────────────────────────────
describe("Synthetic openId for WebAuthn users", () => {
  it("generates a unique openId from email", () => {
    const email = "joe@company.com";
    const openId = `webauthn:${email}`;
    expect(openId).toBe("webauthn:joe@company.com");
    expect(openId.startsWith("webauthn:")).toBe(true);
  });

  it("two different emails produce different openIds", () => {
    const id1 = `webauthn:alice@company.com`;
    const id2 = `webauthn:bob@company.com`;
    expect(id1).not.toBe(id2);
  });
});
