import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** Display name shown in the app (separate from OAuth name) */
  displayName: varchar("displayName", { length: 100 }),
  /** Whether this user has completed WebAuthn passkey registration */
  hasPasskey: boolean("hasPasskey").default(false).notNull(),
  /** Hashed password for email/password auth (format: salt:hash) */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** Job title, e.g. "CFO", "Head of Security" */
  title: varchar("title", { length: 100 }),
  /** E.164 phone number for SMS notifications, e.g. +12125551234 */
  phone: varchar("phone", { length: 20 }),
  /** Whether this user has opted in to SMS notifications */
  smsNotifications: boolean("smsNotifications").default(false).notNull(),
  /** Organization ID for SSO users */
  orgId: int("orgId"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Early Access signup submissions
export const earlyAccessSignups = mysqlTable("early_access_signups", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 200 }).notNull(),
  teamSize: varchar("teamSize", { length: 50 }).notNull(),
  useCase: varchar("useCase", { length: 200 }).notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EarlyAccessSignup = typeof earlyAccessSignups.$inferSelect;
export type InsertEarlyAccessSignup = typeof earlyAccessSignups.$inferInsert;

/**
 * WebAuthn credential storage.
 * One user can have multiple credentials (multiple devices).
 * The private key NEVER leaves the user's device — we only store the public key.
 */
export const webauthnCredentials = mysqlTable("webauthn_credentials", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users.id */
  userId: int("userId").notNull(),
  /** Base64URL-encoded credential ID assigned by the authenticator */
  credentialId: varchar("credentialId", { length: 512 }).notNull().unique(),
  /** Base64URL-encoded COSE public key */
  publicKey: text("publicKey").notNull(),
  /** Signature counter — increments on each use; used to detect cloned authenticators */
  counter: bigint("counter", { mode: "number" }).default(0).notNull(),
  /** Human-readable device label (e.g., "iPhone 15", "MacBook Pro") */
  deviceName: varchar("deviceName", { length: 100 }).default("My Device").notNull(),
  /** Whether this credential supports user verification (biometric/PIN) */
  userVerified: boolean("userVerified").default(false).notNull(),
  /** Authenticator Attachment: "platform" (built-in) or "cross-platform" (hardware key) */
  authenticatorAttachment: varchar("authenticatorAttachment", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
});

export type WebAuthnCredential = typeof webauthnCredentials.$inferSelect;
export type InsertWebAuthnCredential = typeof webauthnCredentials.$inferInsert;

/**
 * Temporary challenge storage for WebAuthn ceremonies.
 * Challenges are single-use and expire after 5 minutes.
 * Must be deleted immediately after use (successful or failed).
 */
export const webauthnChallenges = mysqlTable("webauthn_challenges", {
  id: int("id").autoincrement().primaryKey(),
  /** The user attempting registration or authentication */
  userId: int("userId").notNull(),
  /** Base64URL-encoded random challenge sent to the authenticator */
  challenge: varchar("challenge", { length: 512 }).notNull(),
  /** "registration" or "authentication" */
  type: mysqlEnum("type", ["registration", "authentication"]).notNull(),
  /** Expiry timestamp — challenges older than this must be rejected */
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebAuthnChallenge = typeof webauthnChallenges.$inferSelect;
export type InsertWebAuthnChallenge = typeof webauthnChallenges.$inferInsert;

// ── Phase 2: Verification Session Engine ─────────────────────────────────────

/**
 * A team is a group of trusted colleagues who can verify each other.
 * One user can belong to one team (for MVP).
 */
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  ownerId: int("ownerId").notNull(),
  /** If true, members without a passkey cannot confirm verification sessions */
  requireBiometric: boolean("requireBiometric").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * Members of a team. One row per user-team relationship.
 */
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

/**
 * Pending invitations to join a team.
 * Token is a random UUID sent via email.
 */
export const teamInvites = mysqlTable("team_invites", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedByUserId: int("invitedByUserId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamInvite = typeof teamInvites.$inferSelect;
export type InsertTeamInvite = typeof teamInvites.$inferInsert;

/**
 * A verification session between two users.
 * The initiator starts the session; the responder confirms or rejects.
 * wordA is shown to the initiator ("say this"); wordB is the decoy set for the responder.
 */
export const verificationSessions = mysqlTable("verification_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  teamId: int("teamId"),
  initiatorId: int("initiatorId").notNull(),
  responderId: int("responderId").notNull(),
  /** The correct word the initiator will say aloud */
  wordA: varchar("wordA", { length: 64 }).notNull(),
  /** A second word shown to the responder as a decoy option */
  wordB: varchar("wordB", { length: 64 }).notNull(),
  /** Optional context: what action is being authorized */
  actionContext: text("actionContext"),
  status: mysqlEnum("status", ["pending", "active", "verified", "rejected", "expired", "cancelled"]).default("pending").notNull(),
  initiatorConfirmed: boolean("initiatorConfirmed").default(false).notNull(),
  responderConfirmed: boolean("responderConfirmed").default(false).notNull(),
  rejectionReason: varchar("rejectionReason", { length: 200 }),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type VerificationSession = typeof verificationSessions.$inferSelect;
export type InsertVerificationSession = typeof verificationSessions.$inferInsert;

/**
 * Immutable audit log. Each row hashes the previous row to form a chain.
 * Never delete rows — append only.
 */
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 36 }),
  teamId: int("teamId"),
  actorId: int("actorId").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // e.g. "session.verified", "session.rejected", "member.invited"
  metadata: text("metadata"), // JSON blob
  /** SHA-256 hash of the previous row's hash (chain integrity) */
  prevHash: varchar("prevHash", { length: 64 }),
  /** SHA-256 hash of this row's content */
  hash: varchar("hash", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = typeof auditLog.$inferInsert;

/**
 * Password reset tokens for the "Forgot password" flow.
 * Tokens are single-use and expire after 1 hour.
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

/**
 * Web Push subscriptions for PWA push notifications.
 * One user can have multiple subscriptions (different browsers/devices).
 */
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;

/**
 * Organizations for SSO/SAML enterprise login.
 * Maps a company domain to a SAML configuration.
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  ownerId: int("ownerId").notNull(),
  ssoEnabled: boolean("ssoEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;

/**
 * SAML SP configuration per organization.
 * Stores IdP metadata needed to verify SAML assertions.
 */
export const samlConfigs = mysqlTable("saml_configs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull().unique(),
  entryPoint: varchar("entryPoint", { length: 500 }).notNull(),
  issuer: varchar("issuer", { length: 500 }).notNull(),
  cert: text("cert").notNull(),
  nameIdFormat: varchar("nameIdFormat", { length: 200 }).default("urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SamlConfig = typeof samlConfigs.$inferSelect;
