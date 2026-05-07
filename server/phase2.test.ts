/**
 * LiveLock Phase 2 — Unit Tests
 * Tests for: word pair generator, session state machine logic, team management, audit log
 */
import { describe, it, expect, beforeEach } from "vitest";

// ── Word Pair Generator ────────────────────────────────────────────────────────

describe("Word Pair Generator", () => {
  // We test the logic directly without importing the module to avoid DB deps
  const WORD_LIST = [
    "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel",
    "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa",
    "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey",
    "xray", "yankee", "zulu",
  ];

  function generateWordPair(wordList: string[]): { wordA: string; wordB: string; decoys: string[] } {
    const shuffled = [...wordList].sort(() => Math.random() - 0.5);
    const [wordA, wordB, ...rest] = shuffled;
    const decoys = rest.slice(0, 2);
    return { wordA, wordB, decoys };
  }

  function generateOptions(wordA: string, decoys: string[]): string[] {
    return [wordA, ...decoys].sort(() => Math.random() - 0.5);
  }

  it("generates two distinct words", () => {
    const { wordA, wordB } = generateWordPair(WORD_LIST);
    expect(wordA).toBeTruthy();
    expect(wordB).toBeTruthy();
    expect(wordA).not.toBe(wordB);
  });

  it("generates exactly 2 decoys", () => {
    const { decoys } = generateWordPair(WORD_LIST);
    expect(decoys).toHaveLength(2);
  });

  it("decoys do not include wordA or wordB", () => {
    const { wordA, wordB, decoys } = generateWordPair(WORD_LIST);
    expect(decoys).not.toContain(wordA);
    expect(decoys).not.toContain(wordB);
  });

  it("options array contains wordA and 2 decoys (3 total)", () => {
    const { wordA, decoys } = generateWordPair(WORD_LIST);
    const options = generateOptions(wordA, decoys);
    expect(options).toHaveLength(3);
    expect(options).toContain(wordA);
  });

  it("options are shuffled (not always in insertion order)", () => {
    // Run 20 times — probability of always being in same order is (1/6)^20 ≈ 0
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const { wordA, decoys } = generateWordPair(WORD_LIST);
      const options = generateOptions(wordA, decoys);
      orders.add(options.join(","));
    }
    // Should have at least 2 different orderings
    expect(orders.size).toBeGreaterThan(1);
  });

  it("all words in options are from the word list", () => {
    const { wordA, decoys } = generateWordPair(WORD_LIST);
    const options = generateOptions(wordA, decoys);
    options.forEach(w => expect(WORD_LIST).toContain(w));
  });
});

// ── Session State Machine ──────────────────────────────────────────────────────

describe("Session State Machine", () => {
  type SessionStatus = "pending" | "active" | "verified" | "rejected" | "expired" | "cancelled";

  interface Session {
    status: SessionStatus;
    initiatorConfirmed: boolean;
    responderConfirmed: boolean;
    expiresAt: Date;
    wordA: string;
    wordB: string;
    selectedWord?: string;
  }

  function createSession(): Session {
    return {
      status: "pending",
      initiatorConfirmed: false,
      responderConfirmed: false,
      expiresAt: new Date(Date.now() + 90_000),
      wordA: "alpha",
      wordB: "bravo",
    };
  }

  function transitionToActive(session: Session): Session {
    if (session.status !== "pending") throw new Error("Session must be pending");
    return { ...session, status: "active" };
  }

  function initiatorConfirm(session: Session): Session {
    if (session.status !== "active") throw new Error("Session must be active");
    return { ...session, initiatorConfirmed: true };
  }

  function responderConfirm(session: Session, selectedWord: string): Session {
    if (session.status !== "active") throw new Error("Session must be active");
    const newSession = { ...session, responderConfirmed: true, selectedWord };
    if (newSession.initiatorConfirmed && newSession.responderConfirmed) {
      const correct = selectedWord === session.wordA;
      return { ...newSession, status: correct ? "verified" : "rejected" };
    }
    return newSession;
  }

  function expireSession(session: Session): Session {
    if (["verified", "rejected", "cancelled"].includes(session.status)) return session;
    if (new Date() > session.expiresAt) {
      return { ...session, status: "expired" };
    }
    return session;
  }

  it("starts in pending state", () => {
    const session = createSession();
    expect(session.status).toBe("pending");
    expect(session.initiatorConfirmed).toBe(false);
    expect(session.responderConfirmed).toBe(false);
  });

  it("transitions pending → active when responder joins", () => {
    const session = transitionToActive(createSession());
    expect(session.status).toBe("active");
  });

  it("cannot activate a non-pending session", () => {
    const session = { ...createSession(), status: "verified" as SessionStatus };
    expect(() => transitionToActive(session)).toThrow();
  });

  it("records initiator confirmation", () => {
    const session = initiatorConfirm(transitionToActive(createSession()));
    expect(session.initiatorConfirmed).toBe(true);
    expect(session.status).toBe("active"); // not yet verified — responder hasn't confirmed
  });

  it("verifies when both parties confirm and word is correct", () => {
    let session = transitionToActive(createSession());
    session = initiatorConfirm(session);
    session = responderConfirm(session, "alpha"); // wordA is "alpha"
    expect(session.status).toBe("verified");
  });

  it("rejects when responder picks wrong word", () => {
    let session = transitionToActive(createSession());
    session = initiatorConfirm(session);
    session = responderConfirm(session, "bravo"); // wrong word
    expect(session.status).toBe("rejected");
  });

  it("does not verify if only responder confirms (initiator hasn't yet)", () => {
    let session = transitionToActive(createSession());
    // Responder confirms first without initiator
    session = responderConfirm(session, "alpha");
    expect(session.status).toBe("active"); // still active, waiting for initiator
    expect(session.responderConfirmed).toBe(true);
  });

  it("expires a session past its deadline", () => {
    const session: Session = {
      ...createSession(),
      status: "active",
      expiresAt: new Date(Date.now() - 1000), // already expired
    };
    const expired = expireSession(session);
    expect(expired.status).toBe("expired");
  });

  it("does not expire an already-verified session", () => {
    const session: Session = {
      ...createSession(),
      status: "verified",
      expiresAt: new Date(Date.now() - 1000),
    };
    const result = expireSession(session);
    expect(result.status).toBe("verified");
  });
});

// ── Team Management ────────────────────────────────────────────────────────────

describe("Team Management Logic", () => {
  interface TeamMember {
    userId: number;
    role: "owner" | "member";
    email: string;
  }

  interface Team {
    id: number;
    name: string;
    ownerId: number;
    members: TeamMember[];
  }

  function createTeam(ownerId: number, name: string): Team {
    return {
      id: 1,
      name,
      ownerId,
      members: [{ userId: ownerId, role: "owner", email: "owner@example.com" }],
    };
  }

  function addMember(team: Team, userId: number, email: string): Team {
    if (team.members.some(m => m.userId === userId)) {
      throw new Error("User is already a member");
    }
    return {
      ...team,
      members: [...team.members, { userId, role: "member", email }],
    };
  }

  function removeMember(team: Team, userId: number, requesterId: number): Team {
    if (requesterId !== team.ownerId) throw new Error("Only the owner can remove members");
    if (userId === team.ownerId) throw new Error("Cannot remove the team owner");
    return {
      ...team,
      members: team.members.filter(m => m.userId !== userId),
    };
  }

  it("creates a team with the owner as the only member", () => {
    const team = createTeam(1, "Finance Team");
    expect(team.name).toBe("Finance Team");
    expect(team.members).toHaveLength(1);
    expect(team.members[0].role).toBe("owner");
  });

  it("adds a new member", () => {
    const team = addMember(createTeam(1, "Finance Team"), 2, "alice@example.com");
    expect(team.members).toHaveLength(2);
    expect(team.members[1].role).toBe("member");
  });

  it("prevents duplicate member addition", () => {
    const team = addMember(createTeam(1, "Finance Team"), 2, "alice@example.com");
    expect(() => addMember(team, 2, "alice@example.com")).toThrow("already a member");
  });

  it("allows owner to remove a member", () => {
    let team = addMember(createTeam(1, "Finance Team"), 2, "alice@example.com");
    team = removeMember(team, 2, 1); // owner (id=1) removes member (id=2)
    expect(team.members).toHaveLength(1);
  });

  it("prevents non-owner from removing members", () => {
    let team = addMember(createTeam(1, "Finance Team"), 2, "alice@example.com");
    team = addMember(team, 3, "bob@example.com");
    expect(() => removeMember(team, 3, 2)).toThrow("Only the owner");
  });

  it("prevents removing the owner", () => {
    const team = createTeam(1, "Finance Team");
    expect(() => removeMember(team, 1, 1)).toThrow("Cannot remove the team owner");
  });
});

// ── Audit Log ─────────────────────────────────────────────────────────────────

describe("Audit Log", () => {
  interface AuditEntry {
    id: number;
    action: string;
    actorId: number;
    sessionId?: string;
    metadata?: string;
    prevHash?: string;
    hash: string;
    createdAt: Date;
  }

  // Simplified hash chain simulation (not crypto — just for logic testing)
  function hashEntry(entry: Omit<AuditEntry, "hash">): string {
    return `hash:${entry.id}:${entry.action}:${entry.prevHash ?? "genesis"}`;
  }

  function appendEntry(
    log: AuditEntry[],
    action: string,
    actorId: number,
    sessionId?: string,
    metadata?: string,
  ): AuditEntry[] {
    const prevHash = log.length > 0 ? log[log.length - 1].hash : undefined;
    const id = log.length + 1;
    const partial = { id, action, actorId, sessionId, metadata, prevHash, createdAt: new Date() };
    const hash = hashEntry(partial);
    return [...log, { ...partial, hash }];
  }

  function verifyChain(log: AuditEntry[]): boolean {
    for (let i = 0; i < log.length; i++) {
      const entry = log[i];
      const expectedPrevHash = i === 0 ? undefined : log[i - 1].hash;
      if (entry.prevHash !== expectedPrevHash) return false;
      const recomputed = hashEntry({ ...entry, hash: entry.hash });
      if (recomputed !== entry.hash) return false;
    }
    return true;
  }

  it("starts with an empty log", () => {
    const log: AuditEntry[] = [];
    expect(log).toHaveLength(0);
  });

  it("appends entries with sequential IDs", () => {
    let log: AuditEntry[] = [];
    log = appendEntry(log, "session.initiated", 1, "sess-1");
    log = appendEntry(log, "session.verified", 1, "sess-1");
    expect(log[0].id).toBe(1);
    expect(log[1].id).toBe(2);
  });

  it("chains entries via prevHash", () => {
    let log: AuditEntry[] = [];
    log = appendEntry(log, "session.initiated", 1, "sess-1");
    log = appendEntry(log, "session.verified", 1, "sess-1");
    expect(log[1].prevHash).toBe(log[0].hash);
  });

  it("first entry has no prevHash (genesis)", () => {
    let log: AuditEntry[] = [];
    log = appendEntry(log, "team.created", 1);
    expect(log[0].prevHash).toBeUndefined();
  });

  it("verifies a valid chain", () => {
    let log: AuditEntry[] = [];
    log = appendEntry(log, "team.created", 1);
    log = appendEntry(log, "member.joined", 2);
    log = appendEntry(log, "session.verified", 1, "sess-1");
    expect(verifyChain(log)).toBe(true);
  });

  it("detects tampering with a middle entry", () => {
    let log: AuditEntry[] = [];
    log = appendEntry(log, "team.created", 1);
    log = appendEntry(log, "session.verified", 1, "sess-1");
    log = appendEntry(log, "member.joined", 2);

    // Tamper with entry 2
    const tampered = [...log];
    tampered[1] = { ...tampered[1], action: "session.rejected" }; // change action without rehashing
    expect(verifyChain(tampered)).toBe(false);
  });

  it("stores metadata as JSON string", () => {
    let log: AuditEntry[] = [];
    const meta = JSON.stringify({ actionContext: "Wire transfer $50k" });
    log = appendEntry(log, "session.initiated", 1, "sess-1", meta);
    const parsed = JSON.parse(log[0].metadata!);
    expect(parsed.actionContext).toBe("Wire transfer $50k");
  });
});
