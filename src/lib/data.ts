'use client';

/**
 * Transitional compatibility adapter.
 * This module is intentionally not a source of business data.
 * Migrated domains must use src/server and the Firebase client SDK.
 */

import { initializeFirebase } from '@/firebase';

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
  head: any;
  memberCount: number;
  budget: number;
  projects: number;
  description: string;
  goals: string[];
  [key: string]: any;
};

export type LegacyProject = { id: number; name: string; progress: number; status: string; [key: string]: any };
export type LegacyTask = { id: string | number; title: string; description: string; dueDate: string; priority: string; contextId?: string; [key: string]: any };
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
  kpis: { signups: number; cpa: number; ggr?: number; [key: string]: any };
  [key: string]: any;
};

export type Context = { type: 'campaign' | 'game_operation' | 'user' | 'meeting'; id: string; name: string };
export type Workspace = { id: string; name: string; description: string; members: string[]; owner_id: string; privacy: 'public' | 'private'; linked_tasks: string[]; linked_campaigns: string[]; linked_files: string[]; linked_chat_channel_id: string; linked_knowledge_base_articles: string[]; [key: string]: any };
export type FeedItem = { item_id: string; timestamp: string; author_user_id: string | 'system'; item_type: 'post' | 'poll' | 'kudos' | 'system_event'; content: { text: string }; reactions: { user_id: string; reaction_type: 'like' | 'celebrate' | 'idea' | 'thanks' }[]; comments_count: number; is_pinned: boolean };
export type Bet = { id: string; playerId: string; market: string; stake: number; odds: number; status: 'pending' | 'won' | 'lost' | 'cashed_out'; timestamp: string };
export type Affiliate = { id: string; name: string; trackingCode: string; commissionRate: number };
export type MenuItem = { id: string; title: string; badge?: number | string; permissions?: string[]; department?: string; status?: LegacyUser['status'] };
export type MenuSection = { title: string; action?: boolean; items: MenuItem[] };

export const users: LegacyUser[] = [];
export const tasks: LegacyTask[] = [];
export const meetings: Record<string, any>[] = [];
export const departments: LegacyDepartment[] = [];
export const campaigns: LegacyCampaign[] = [];
export const projects = campaigns;
export const gameOperations: Record<string, any>[] = [];
export const knowledgeBase: Record<string, any>[] = [];
export const documents: Record<string, any>[] = [];
export const reports: Record<string, any>[] = [];
export const workflows: Record<string, any>[] = [];
export const automations: Record<string, any>[] = [];
export const integrations: Record<string, any>[] = [];
export const nationalHolidays: Record<string, any>[] = [];
export const calendarEvents: Record<string, any>[] = [];
export const cloudFiles: Record<string, any>[] = [];
export const workspaces: Workspace[] = [];
export const feedItems: FeedItem[] = [];
export const messages: Record<string, Record<string, any>[]> = {};
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
export const getUpcomingMeetings = (_userId: string | number): Record<string, any>[] => [];
export const getCampaignsForUser = (_userId: string | number): LegacyCampaign[] => [];
export const getDepartment = (_slug: string): LegacyDepartment | undefined => undefined;
export const getDepartmentMembers = (_deptName: string): LegacyUser[] => [];
export const getDepartmentProjects = (_deptName: string): LegacyProject[] => [];
export const getCalendarEventsForUser = (_userId: string | number): Record<string, any>[] => [];
export const getWorkspacesForUser = (_userId: string | number): Workspace[] => [];
export const getWorkspaceById = (_workspaceId: string): Workspace | undefined => undefined;
export const getWorkspaceTasks = (_taskIds: (string | number)[]): LegacyTask[] => [];
export const getWorkspaceFiles = (_fileIds: (string | number)[]): Record<string, any>[] => [];
export const getCampaignById = (_campaignId: string): LegacyCampaign | undefined => undefined;
