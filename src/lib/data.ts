'use client';

/**
 * Transitional compatibility adapter.
 *
 * These exports intentionally contain no fabricated business records. Migrated
 * domains must use server services/repositories and the Firebase client SDK.
 * The concrete shapes below exist only so legacy screens can render explicit
 * empty/loading states without weakening the TypeScript contract of the new
 * production domains.
 */

import { initializeFirebase } from '@/firebase';
import type { Context } from '@/lib/types';

export type LegacyUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  status: 'online' | 'away' | 'busy' | 'offline' | 'dnd';
  lastSeen: string;
  bio: string;
  phone: string;
  location: string;
  permissions: string[];
};

export type LegacyDepartment = {
  id: number;
  name: string;
  slug: string;
  head: string;
  memberCount: number;
  budget: number;
  projects: number;
  description: string;
  goals: string[];
};

export type LegacyProject = {
  id: number;
  name: string;
  progress: number;
  status: string;
};

export type LegacyChecklistItem = { id: string; text: string; checked: boolean };
export type LegacyTaskStatus = 'backlog' | 'todo' | 'in-progress' | 'blocked' | 'done' | 'completed';
export type LegacyTask = {
  id: string | number;
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  status: LegacyTaskStatus;
  assignedTo: string[];
  context: Context | null;
  contextId?: string;
  checklist: LegacyChecklistItem[];
  labels: string[];
};

export type LegacyCampaign = {
  id: string;
  name: string;
  description: string;
  members: string[];
  spent: number;
  budget: number;
  status: string;
  risks: string;
  startDate: string;
  endDate: string;
  department?: string;
  kpis: { signups: number; cpa: number; ggr?: number };
};

export type LegacyMeeting = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'active' | 'completed' | string;
  participants: string[];
};

export type LegacyCalendarEvent = {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  location: string;
  type: string;
  participants: string[];
  createdBy: string;
};

export type LegacyHoliday = { id: string; name: string; date: string };
export type LegacyFile = { id: string; name: string; size: string; sharedWith: string[] };
export type LegacyAutomation = { id: number; name: string; active: boolean };
export type LegacyWorkflow = { id: string; name: string; department: string; steps: number };
export type LegacyKnowledgeArticle = { id: string; title: string; category: string; views: number; tags: string[] };
export type LegacyGameOperation = { id: string; name: string; provider: string; gameType: string; riskLevel: 'low' | 'medium' | 'high' | string; stage: string };
export type LegacyIntegration = { id: string; name: string; type: string; status: string; icon?: string; connected: boolean };
export type LegacyReport = { id: string; name: string; title?: string; summary?: string; type?: string; department?: string; description: string; status: string; createdAt: string };
export type LegacyLooseRecord = Record<string, any>;

export type Workspace = {
  id: string;
  name: string;
  description: string;
  members: string[];
  owner_id: string;
  privacy: 'public' | 'private';
  linked_tasks: string[];
  linked_campaigns: string[];
  linked_files: string[];
  linked_chat_channel_id: string;
  linked_knowledge_base_articles: string[];
};

export type FeedItem = {
  item_id: string;
  timestamp: string;
  author_user_id: string | 'system';
  item_type: 'post' | 'poll' | 'kudos' | 'system_event';
  content: { text: string };
  reactions: { user_id: string; reaction_type: 'like' | 'celebrate' | 'idea' | 'thanks' }[];
  comments_count: number;
  is_pinned: boolean;
};

export type Bet = { id: string; playerId: string; market: string; stake: number; odds: number; status: 'pending' | 'won' | 'lost' | 'cashed_out'; timestamp: string };
export type Affiliate = { id: string; name: string; trackingCode: string; commissionRate: number };
export type MenuItem = { id: string; title: string; badge?: number | string; permissions?: string[]; department?: string; status?: LegacyUser['status'] };
export type MenuSection = { title: string; action?: boolean; items: MenuItem[] };

export const users: LegacyUser[] = [];
export const tasks: LegacyTask[] = [];
export const meetings: LegacyMeeting[] = [];
export const departments: LegacyDepartment[] = [];
export const campaigns: LegacyCampaign[] = [];
export const projects: LegacyCampaign[] = campaigns;
export const gameOperations: LegacyGameOperation[] = [];
export const knowledgeBase: LegacyKnowledgeArticle[] = [];
export const documents: LegacyLooseRecord[] = [];
export const reports: LegacyReport[] = [];
export const workflows: LegacyWorkflow[] = [];
export const automations: LegacyAutomation[] = [];
export const integrations: LegacyIntegration[] = [];
export const nationalHolidays: LegacyHoliday[] = [];
export const calendarEvents: LegacyCalendarEvent[] = [];
export const cloudFiles: LegacyFile[] = [];
export const workspaces: Workspace[] = [];
export const feedItems: FeedItem[] = [];
export const messages: Record<string, LegacyLooseRecord[]> = {};
export const bets: Bet[] = [];
export const affiliates: Affiliate[] = [];
export const portalData = { dailyFocus: '', hotMarkets: [] as string[], countdownEvent: '', countdownDays: 0, recordOdd: 0 };
export const analyticsData = { userActivity: { labels: [] as string[], data: [] as number[] }, projectProgress: { labels: [] as string[], data: [] as number[] } };
export const menuItems: MenuSection[] = [];

export function getCurrentUser(): LegacyUser {
  try {
    const { auth } = initializeFirebase();
    const user = auth.currentUser;
    return { id: user?.uid ?? '', name: user?.displayName ?? '', email: user?.email ?? '', role: '', department: '', avatar: user?.photoURL ?? '', status: 'offline', lastSeen: '', bio: '', phone: user?.phoneNumber ?? '', location: '', permissions: [] };
  } catch {
    return { id: '', name: '', email: '', role: '', department: '', avatar: '', status: 'offline', lastSeen: '', bio: '', phone: '', location: '', permissions: [] };
  }
}

export const getTasksForUser = (_userId: string | number): LegacyTask[] => [];
export const getUpcomingMeetings = (_userId: string | number): LegacyMeeting[] => [];
export const getCampaignsForUser = (_userId: string | number): LegacyCampaign[] => [];
export const getDepartment = (_slug: string): LegacyDepartment | undefined => undefined;
export const getDepartmentMembers = (_deptName: string): LegacyUser[] => [];
export const getDepartmentProjects = (_deptName: string): LegacyProject[] => [];
export const getCalendarEventsForUser = (_userId: string | number): LegacyCalendarEvent[] => [];
export const getWorkspacesForUser = (_userId: string | number): Workspace[] => [];
export const getWorkspaceById = (_workspaceId: string): Workspace | undefined => undefined;
export const getWorkspaceTasks = (_taskIds: (string | number)[]): LegacyTask[] => [];
export const getWorkspaceFiles = (_fileIds: (string | number)[]): LegacyFile[] => [];
export const getCampaignById = (_campaignId: string): LegacyCampaign | undefined => undefined;
