/**
 * LiveLock — "Clinical Trust" Design System
 * Global app state context for the front-end simulation.
 *
 * CHALLENGE PROTOCOL — Two-Round Mutual Verification:
 *   Round 1: Initiator (Sarah) SPEAKS a word → Approver (Marcus) LISTENS and confirms hearing it
 *   Round 2: Approver (Marcus) SPEAKS a word → Initiator (Sarah) LISTENS and confirms hearing it
 *
 * Both words are different, one-time generated, and only shown on the relevant device.
 * This proves identity in BOTH directions — neither party can be impersonated.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

export type UserRole = 'initiator' | 'approver';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: 'online' | 'offline' | 'busy';
  joinedAt: string;
  verificationCount: number;
}

export type SessionPurpose =
  | 'Wire Transfer'
  | 'Invoice Approval'
  | 'Bank Detail Change'
  | 'Closing Instructions'
  | 'Payment Authorization'
  | 'Contract Execution';

export type SessionStatus =
  | 'idle'
  | 'challenge_sent'       // Round 1 active: Initiator speaks, Approver listens
  | 'round1_complete'      // Round 2 active: Approver speaks, Initiator listens
  | 'both_confirmed'       // Both rounds done — move to action approval
  | 'approved'
  | 'rejected'
  | 'expired';

export interface VerificationSession {
  id: string;
  initiatorId: string;
  approverId: string;
  purpose: SessionPurpose;
  amount?: string;

  // Round 1: Initiator speaks this word, Approver listens for it
  round1Word: string;
  round1InitiatorConfirmed: boolean; // Initiator tapped "They heard it"
  round1ApproverConfirmed: boolean;  // Approver tapped "I heard it"

  // Round 2: Approver speaks this word, Initiator listens for it
  round2Word: string;
  round2InitiatorConfirmed: boolean; // Initiator tapped "I heard it"
  round2ApproverConfirmed: boolean;  // Approver tapped "They heard it"

  // Legacy field kept for audit log display
  challengeWords: string[];

  status: SessionStatus;
  createdAt: Date;
  completedAt?: Date;

  // Final action approval
  initiatorApproved: boolean;
  approverApproved: boolean;
}

export interface AuditEntry {
  id: string;
  sessionId: string;
  initiatorName: string;
  approverName: string;
  purpose: SessionPurpose;
  amount?: string;
  result: 'verified' | 'rejected' | 'expired';
  timestamp: Date;
  challengeWords: string[];
}

interface LiveLockContextType {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  activeSession: VerificationSession | null;
  auditLog: AuditEntry[];
  activeTab: string;
  setActiveTab: (tab: string) => void;

  initiateSession: (approverId: string, purpose: SessionPurpose, amount?: string) => void;
  confirmChallenge: (role: UserRole) => void;
  approveSession: (role: UserRole) => void;
  rejectSession: (role: UserRole) => void;
  resetSession: () => void;
}

// Single-word pool for challenge-response (each word is distinct and memorable)
const WORD_POOL = [
  'Falcon', 'Cobalt', 'Ember', 'Glacier', 'Lynx',
  'Obsidian', 'Raven', 'Tundra', 'Viper', 'Zenith',
  'Amber', 'Basalt', 'Cedar', 'Dune', 'Eclipse',
  'Flint', 'Gravel', 'Helix', 'Indigo', 'Jasper',
  'Kelp', 'Lumen', 'Marble', 'Nova', 'Opal',
  'Prism', 'Quartz', 'Ridge', 'Slate', 'Titan',
];

function pickTwoDistinct(): [string, string] {
  const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'user-1',
    name: 'Sarah Chen',
    role: 'CFO',
    initials: 'SC',
    status: 'online',
    joinedAt: '2024-01-15',
    verificationCount: 47,
  },
  {
    id: 'user-2',
    name: 'Marcus Webb',
    role: 'CEO',
    initials: 'MW',
    status: 'online',
    joinedAt: '2024-01-15',
    verificationCount: 62,
  },
  {
    id: 'user-3',
    name: 'Priya Nair',
    role: 'Controller',
    initials: 'PN',
    status: 'busy',
    joinedAt: '2024-02-03',
    verificationCount: 28,
  },
  {
    id: 'user-4',
    name: 'James Ortiz',
    role: 'Operations',
    initials: 'JO',
    status: 'offline',
    joinedAt: '2024-03-10',
    verificationCount: 15,
  },
];

const INITIAL_AUDIT: AuditEntry[] = [
  {
    id: 'audit-1',
    sessionId: 'sess-001',
    initiatorName: 'Sarah Chen',
    approverName: 'Marcus Webb',
    purpose: 'Wire Transfer',
    amount: '$48,500',
    result: 'verified',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    challengeWords: ['Falcon', 'Cobalt'],
  },
  {
    id: 'audit-2',
    sessionId: 'sess-002',
    initiatorName: 'Marcus Webb',
    approverName: 'Priya Nair',
    purpose: 'Invoice Approval',
    amount: '$12,200',
    result: 'verified',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    challengeWords: ['Ember', 'Glacier'],
  },
  {
    id: 'audit-3',
    sessionId: 'sess-003',
    initiatorName: 'Priya Nair',
    approverName: 'Sarah Chen',
    purpose: 'Bank Detail Change',
    result: 'rejected',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    challengeWords: ['Raven', 'Tundra'],
  },
  {
    id: 'audit-4',
    sessionId: 'sess-004',
    initiatorName: 'James Ortiz',
    approverName: 'Marcus Webb',
    purpose: 'Payment Authorization',
    amount: '$7,800',
    result: 'verified',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    challengeWords: ['Opal', 'Prism'],
  },
];

const LiveLockContext = createContext<LiveLockContextType | null>(null);

export function LiveLockProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<VerificationSession | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(INITIAL_AUDIT);
  const [activeTab, setActiveTab] = useState('verify');

  const currentUser = TEAM_MEMBERS[0]; // Sarah Chen is the "current user"

  const initiateSession = useCallback((approverId: string, purpose: SessionPurpose, amount?: string) => {
    const [word1, word2] = pickTwoDistinct();
    const session: VerificationSession = {
      id: `sess-${Date.now()}`,
      initiatorId: 'user-1',
      approverId,
      purpose,
      amount,
      round1Word: word1,
      round1InitiatorConfirmed: false,
      round1ApproverConfirmed: false,
      round2Word: word2,
      round2InitiatorConfirmed: false,
      round2ApproverConfirmed: false,
      challengeWords: [word1, word2],
      status: 'challenge_sent',
      createdAt: new Date(),
      initiatorApproved: false,
      approverApproved: false,
    };
    setActiveSession(session);
  }, []);

  /**
   * confirmChallenge — handles both rounds.
   *
   * Round 1 (status: 'challenge_sent'):
   *   - Initiator clicks "They heard it" → round1InitiatorConfirmed = true
   *   - Approver clicks "I heard it"    → round1ApproverConfirmed = true
   *   - When BOTH confirmed → advance to Round 2 (status: 'round1_complete')
   *
   * Round 2 (status: 'round1_complete'):
   *   - Approver clicks "They heard it" → round2ApproverConfirmed = true
   *   - Initiator clicks "I heard it"   → round2InitiatorConfirmed = true
   *   - When BOTH confirmed → advance to action approval (status: 'both_confirmed')
   */
  const confirmChallenge = useCallback((role: UserRole) => {
    setActiveSession(prev => {
      if (!prev) return prev;

      const updated = { ...prev };

      if (prev.status === 'challenge_sent') {
        // Round 1: Initiator speaks, Approver listens
        if (role === 'initiator') updated.round1InitiatorConfirmed = true;
        if (role === 'approver') updated.round1ApproverConfirmed = true;
        if (updated.round1InitiatorConfirmed && updated.round1ApproverConfirmed) {
          updated.status = 'round1_complete';
        }
      } else if (prev.status === 'round1_complete') {
        // Round 2: Approver speaks, Initiator listens
        if (role === 'approver') updated.round2ApproverConfirmed = true;
        if (role === 'initiator') updated.round2InitiatorConfirmed = true;
        if (updated.round2InitiatorConfirmed && updated.round2ApproverConfirmed) {
          updated.status = 'both_confirmed';
        }
      }

      return updated;
    });
  }, []);

  const approveSession = useCallback((role: UserRole) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        initiatorApproved: role === 'initiator' ? true : prev.initiatorApproved,
        approverApproved: role === 'approver' ? true : prev.approverApproved,
      };
      if (updated.initiatorApproved && updated.approverApproved) {
        updated.status = 'approved';
        updated.completedAt = new Date();
        const approver = TEAM_MEMBERS.find(m => m.id === prev.approverId);
        const initiator = TEAM_MEMBERS.find(m => m.id === prev.initiatorId);
        const entry: AuditEntry = {
          id: `audit-${Date.now()}`,
          sessionId: prev.id,
          initiatorName: initiator?.name || 'Unknown',
          approverName: approver?.name || 'Unknown',
          purpose: prev.purpose,
          amount: prev.amount,
          result: 'verified',
          timestamp: new Date(),
          challengeWords: [prev.round1Word, prev.round2Word],
        };
        setAuditLog(log => [entry, ...log]);
      }
      return updated;
    });
  }, []);

  const rejectSession = useCallback((role: UserRole) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const approver = TEAM_MEMBERS.find(m => m.id === prev.approverId);
      const initiator = TEAM_MEMBERS.find(m => m.id === prev.initiatorId);
      const entry: AuditEntry = {
        id: `audit-${Date.now()}`,
        sessionId: prev.id,
        initiatorName: initiator?.name || 'Unknown',
        approverName: approver?.name || 'Unknown',
        purpose: prev.purpose,
        amount: prev.amount,
        result: 'rejected',
        timestamp: new Date(),
        challengeWords: [prev.round1Word, prev.round2Word],
      };
      setAuditLog(log => [entry, ...log]);
      return { ...prev, status: 'rejected', completedAt: new Date() };
    });
  }, []);

  const resetSession = useCallback(() => {
    setActiveSession(null);
  }, []);

  return (
    <LiveLockContext.Provider value={{
      currentUser,
      teamMembers: TEAM_MEMBERS,
      activeSession,
      auditLog,
      activeTab,
      setActiveTab,
      initiateSession,
      confirmChallenge,
      approveSession,
      rejectSession,
      resetSession,
    }}>
      {children}
    </LiveLockContext.Provider>
  );
}

export function useLiveLock() {
  const ctx = useContext(LiveLockContext);
  if (!ctx) throw new Error('useLiveLock must be used within LiveLockProvider');
  return ctx;
}

export { TEAM_MEMBERS };
