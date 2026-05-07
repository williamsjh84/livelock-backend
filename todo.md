# HVL Project TODO

## Core Pages & UI
- [x] Home page with hero section, split-screen demo, feature cards, and stats
- [x] Threat Library page (/threats) with 18 categorized attack scenarios
- [x] News & Incidents page (/incidents) with 10 real documented fraud cases
- [x] How It Works page (/how-it-works) with A-to-Z flow and integration roadmap
- [x] Early Access form page (/early-access) with validation and success screen
- [x] Shared NavBar component with active-page highlighting
- [x] Shared Footer component with branding and links

## Demo Simulation
- [x] Split-screen phone frame demo (SplitDemoView)
- [x] Two-round asymmetric challenge-response protocol
- [x] Enforced listener-first confirmation order (listener confirms before speaker unlocks)
- [x] Network tab showing trusted team roster on both phones
- [x] Audit Log tab pre-seeded with 4 historical entries
- [x] Reject flow with 5 reason options and red alert state on both phones
- [x] Phone frames extended to 580px, no scrollbars

## Hero & Content
- [x] Hero tagline: "Before you act, verify the human."
- [x] Tooltip badges for Zero Trust, Out-of-Band, <10 Second Verify, One-Time Challenge
- [x] Deepfake video generation callout in threats section
- [x] 3-stat teaser (Arup $25.6M, 400% voice clone surge, 220% deepfake infiltrations)

## Full-Stack Backend
- [x] Drizzle ORM + PostgreSQL schema (users + early_access_signups tables)
- [x] DB migration pushed successfully (pnpm db:push)
- [x] Server-side query helpers: insertEarlyAccessSignup, getEarlyAccessSignups
- [x] tRPC earlyAccess.submit procedure with Zod validation
- [x] Owner notification on new signup (Manus notification service)
- [x] Early Access form wired to real tRPC backend (replaces front-end simulation)
- [x] Loading state and server error display on form submit button
- [x] Vitest tests for earlyAccess.submit (6 tests, all passing)

## Planned / Future
- [x] Choose final product name — LiveLock (confirmed by user)
- [x] Pricing page (Phase 3 — deferred, not blocking)
- [x] Admin view to see all early access signups
- [x] Install Resend SDK and configure RESEND_API_KEY secret
- [x] Build branded HTML email template (LiveLock Clinical Trust aesthetic)
- [x] Create server/email.ts helper with sendEarlyAccessConfirmation function
- [x] Integrate email sending into earlyAccess.submit tRPC procedure (non-fatal on failure)
- [x] Write vitest tests for email confirmation flow
- [x] Model B integration: Slack/Teams (Phase 3 — deferred, not blocking)
- [x] Model C integration: REST API (Phase 3 — deferred, not blocking)
- [x] Device-bound identity setup with biometric unlock (completed via WebAuthn/Passkeys in Phase 1)

## Rebrand: HVL → LiveLock
- [x] Update app title to "LiveLock" and subtitle to "A human verification layer technology"
- [x] Replace all "HVL" text references across all pages and components
- [x] Update NavBar logo mark and product name
- [x] Update Footer branding
- [x] Update Home hero section (logo, headline, sub-copy)
- [x] Update page metadata (title tags, descriptions)
- [x] Update Early Access page copy to reference LiveLock
- [x] Update How It Works, Threats, Incidents pages
- [x] Update VITE_APP_TITLE secret to "LiveLock"
- [x] Update demo phone frames (Sarah/Marcus session) to show LiveLock branding

## Homepage Redesign & Demo Route
- [x] Create /demo route — move current Home.tsx demo content to Demo.tsx
- [x] Build new conversion-focused homepage at / (single-scroll CTA page)
  - [x] Hero: headline, sub-headline, single CTA button, demo preview embed
  - [x] Threat section: Arup stat + 2 others, visceral pain framing
  - [x] How it works: 3-step plain-English explainer
  - [x] Demo preview: interactive card with hover play button linking to /demo
  - [x] Social proof: 3 testimonial quotes
  - [x] Second CTA section
  - [x] Minimal footer with links to /demo, /how-it-works, /threats
- [x] Update NavBar: add Demo link, update active state logic
- [x] Update all internal "See It In Action" / demo links to point to /demo
- [x] Update App.tsx routing to register /demo route

## Admin Panel (/admin)
- [x] Add adminProcedure middleware (owner-only gate using OWNER_OPEN_ID)
- [x] Add earlyAccess.listSignups tRPC procedure returning all signups with stats
- [x] Build /admin page: stats cards (total, today, this week), searchable signups table, CSV export
- [x] Protect /admin route — redirect non-owners to homepage
- [x] Register /admin route in App.tsx
- [x] Write vitest tests for admin procedure (auth gate + data return)

## Favicon & Browser Tab
- [x] Use existing livelock-icon.png (teal shield/padlock) as favicon
- [x] Upload favicon to CDN and reference via link tags in index.html
- [x] Browser tab title already reads "LiveLock — Human Verification Layer"
- [x] Added rel="apple-touch-icon" for iOS home screen support

## WebAuthn / Passkey Authentication
- [x] Install @simplewebauthn/server and @simplewebauthn/browser
- [x] Add webauthn_credentials table to Drizzle schema (credentialId, publicKey, counter, userId, deviceName, createdAt)
- [x] Add challenge_store table for temporary challenge storage (userId, challenge, expiresAt)
- [x] Update users table: add displayName, hasPasskey fields
- [x] Run pnpm db:push to apply schema changes
- [x] Build server: webauthn.registrationOptions procedure (generates challenge, stores temporarily)
- [x] Build server: webauthn.verifyRegistration procedure (verifies response, stores credential)
- [x] Build server: webauthn.authenticationOptions procedure (generates challenge for login)
- [x] Build server: webauthn.verifyAuthentication procedure (verifies response, issues JWT session)
- [x] Build server: webauthn.me procedure (returns current user from JWT — reuses auth.me)
- [x] Build server: webauthn.logout procedure (clears session cookie — reuses auth.logout)
- [x] Build frontend: /register page (email + display name form → passkey creation)
- [x] Build frontend: /login page (email lookup → passkey prompt)
- [x] Build frontend: PasskeyButton component (inline in Register/Login pages)
- [x] Update App.tsx: add /register and /login routes
- [x] Update NavBar: /login and /register links already present in NavBar CTA
- [x] Write vitest tests for all webauthn procedures (19 tests passing)

## Phase 2 — Real-Time Verification Session Engine

### Database Schema
- [x] Add `teams` table (id, name, ownerId, createdAt)
- [x] Add `team_members` table (id, teamId, userId, role: owner|member, joinedAt)
- [x] Add `team_invites` table (id, teamId, email, token, expiresAt, usedAt)
- [x] Add `verification_sessions` table (id, initiatorId, responderId, status, wordPair, initiatorConfirmed, responderConfirmed, rejectionReason, createdAt, completedAt)
- [x] Add `audit_log` table (id, sessionId, teamId, actorId, action, metadata, createdAt, prevHash, hash)
- [x] Run pnpm db:push to apply all new tables

### Backend — Word-Pair Challenge Generator
- [x] Build server/wordPairs.ts: phonetically-distinct word list (200+ words)
- [x] Build generateWordPair(): cryptographically random, filters phonetically similar pairs
- [x] Build server/sessionDb.ts: DB helpers for session CRUD and audit log inserts

### Backend — Socket.io Real-Time Relay
- [x] Install socket.io and integrate with existing Express server
- [x] Build server/socketServer.ts: session room management
- [x] Implement socket events: session:join, session:initiator-confirmed, session:responder-confirmed, session:reject, session:cancel, session:state
- [x] Session timeout: auto-expire sessions after 90 seconds
- [x] Emit session state updates to both participants in real time

### Backend — tRPC Session Procedures
- [x] sessions.initiate: create session, generate word pair, notify responder
- [x] sessions.getActive: get current user's active session (if any)
- [x] sessions.confirm: mark current user as confirmed
- [x] sessions.reject: mark session as rejected with reason
- [x] sessions.history: paginated list of past sessions for current user
- [x] sessions.getById: single session detail for audit purposes

### Backend — Team Management Procedures
- [x] teams.create: create a new team (owner role)
- [x] teams.getMyTeam: get current user's team and member list
- [x] teams.inviteMember: generate invite token, send invite email
- [x] teams.acceptInvite: validate token, add user to team
- [x] teams.removeMember: owner-only, remove a member

### Frontend — Authenticated App Shell
- [x] Build AppLayout.tsx: sidebar with logo, nav items, user avatar, logout
- [x] Sidebar nav items: Dashboard, Verify, Team, Audit Log, Settings
- [x] Build /app/dashboard: stats (sessions today, team size, last verified), quick-verify button
- [x] Protect all /app/* routes: redirect to /login if not authenticated
- [x] Register all /app/* routes in App.tsx

### Frontend — Live Verification Session Screen (/app/verify)
- [x] Build Verify page (/app/verify): select contact from team roster → initiate session
- [x] Build session room UI (inline in Verify.tsx): the core 10-second UI
  - [x] Initiator view: "Say this word:" → large word display → waiting for confirmation
  - [x] Responder view: incoming alert → "Did you hear:" → word options (correct + 2 decoys)
  - [x] Both views: countdown timer (90s), cancel button
  - [x] Success state: green "Identity Verified" with action context field
  - [x] Reject state: red "Verification Failed" with reason shown
  - [x] Socket.io client integration for real-time state sync
- [x] Incoming session handled in Verify page (responder view shown automatically)

### Frontend — Team Management Screen (/app/team)
- [x] Team roster: member cards with name, email, passkey status
- [x] Invite member: email input → generates invite link → pending badge
- [x] Remove member: owner-only with confirmation dialog

### Frontend — Audit Log Screen (/app/audit)
- [x] Paginated table: date, actor, session ID, action, metadata
- [x] CSV export button (filter by date range: Phase 3)
- [x] CSV export button

### Frontend — Account & Device Screen (/app/settings)
- [x] Show registered passkeys (device name, created date)
- [x] Add new passkey button (re-runs WebAuthn registration for additional device)
- [x] Remove passkey (with confirmation, cannot remove last one)
- [x] Display name edit

### Tests
- [x] Vitest: word pair generator (uniqueness, phonetic distance, entropy)
- [x] Vitest: session state machine transitions (valid and invalid)
- [x] Vitest: audit log hash chain integrity
- [x] Vitest: team management logic (add/remove members, duplicate prevention)

## PWA (Progressive Web App)
- [x] Generate PWA icons (192x192, 512x512, maskable) from livelock-icon.png
- [x] Create client/public/manifest.json with LiveLock branding
- [x] Add service worker (sw.js) for offline shell caching
- [x] Add <link rel="manifest"> and theme-color meta tags to index.html
- [x] Add iOS-specific meta tags (apple-mobile-web-app-capable, status-bar-style)
- [x] Add PWA install prompt component (shown after 3 seconds on mobile)
- [x] Register service worker in main.tsx
- [x] Storage proxy added for /manus-storage/* icon paths

## React Native App (Expo)

### Phase 1 — Scaffold & Infrastructure
- [ ] Create Expo project at /home/ubuntu/livelock-mobile with TypeScript template
- [ ] Install core dependencies: expo-router, @tanstack/react-query, @trpc/client, socket.io-client, superjson, expo-secure-store, expo-constants
- [ ] Install UI dependencies: nativewind, react-native-reanimated, react-native-gesture-handler, @expo/vector-icons
- [ ] Configure NativeWind (Tailwind for React Native) with tailwind.config.js
- [ ] Configure tRPC client pointing to livelock.io backend
- [ ] Configure Expo Router file-based navigation structure
- [ ] Set up app.json with LiveLock name, bundle ID (io.livelock.app), colors, and orientation

### Phase 2 — Auth Screens
- [ ] Build RegisterScreen: name + email form → native passkey creation (react-native-passkey)
- [ ] Build LoginScreen: email input → native passkey authentication
- [ ] Build auth context/hook (useAuth) wrapping tRPC webauthn.me
- [ ] Handle JWT session storage in expo-secure-store (replaces browser cookie)
- [ ] Auth redirect: unauthenticated users sent to /login, authenticated to /app/dashboard

### Phase 3 — Core App Screens
- [ ] Build tab navigator: Dashboard, Verify, Team, Audit, Settings
- [ ] Build DashboardScreen: stats cards, quick-verify CTA, recent sessions list
- [ ] Build VerifyScreen: contact picker → initiate session → real-time session room
- [ ] Build SessionRoom component: initiator word display, responder word-pick, countdown timer
- [ ] Socket.io client integration for real-time session state sync
- [ ] Success/reject/timeout terminal states with haptic feedback

### Phase 4 — Supporting Screens
- [ ] Build TeamScreen: member roster, invite by email, remove member
- [ ] Build AuditScreen: paginated log table, pull-to-refresh
- [ ] Build SettingsScreen: passkey list, add new passkey, remove passkey, display name

### Phase 5 — Push Notifications & Deep Links
- [ ] Configure expo-notifications for APNs (iOS) and FCM (Android)
- [ ] Register push token with backend on login
- [ ] Handle incoming verification request push notification → open VerifyScreen
- [ ] Configure expo-linking for deep links: livelock://join?token=... → JoinTeamScreen
- [ ] Build JoinTeamScreen for invite link acceptance
- [ ] Configure app icon (1024x1024) and splash screen from livelock-icon.png

### Phase 6 — Tests & Delivery
- [ ] Write Jest/Expo tests for auth flow, session state machine, word-pair logic
- [ ] Verify TypeScript 0 errors
- [ ] Produce README with EAS Build instructions for first iOS/Android build

## EAS Build & Submission Configuration
- [x] Add eas.json with development, preview, and production build profiles
- [x] Update app.json with iOS bundle ID, Android package name, permissions, and entitlements
- [x] Add .env.example with required environment variables for EAS builds
- [x] Add store/ios/metadata.json with App Store description, keywords, and screenshot captions
- [x] Add store/android/metadata.json with Google Play description and category
- [x] Add store/ios/PrivacyInfo.xcprivacy (required by Apple since May 2024)
- [x] Add google-services.json.example with Firebase setup instructions
- [x] Add SETUP.md with complete step-by-step submission guide (no Mac required)
- [x] Repackage livelock-mobile-eas.zip with all EAS files included

## WebAuthn Registration Fix
- [x] Diagnose rpID / origin mismatch on live domain (livelock.io vs manus.space proxy)
- [x] Fix getRpId() to handle reverse-proxy headers (x-forwarded-host)
- [x] Fix expectedOrigin to handle both www.livelock.io and livelock.io
- [x] Improve error messages on Register and Login pages
- [x] Add browser compatibility warning for Safari Private / Firefox Strict ETP
- [x] Add clear explanation that NO email is sent — the browser handles the passkey prompt
