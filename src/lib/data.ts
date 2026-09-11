'use client';

/**
 * Transitional compatibility adapter.
 *
 * This module is intentionally NOT a source of truth and contains no mock
 * credentials, users, messages, tasks, documents, meetings or other business
 * records. Production domains must use the repositories and services under
 * src/server and the Firebase client SDK.
 *
 * Existing screens still importing this module receive empty collections until
 * their domain is migrated. This keeps the migration incremental without
 * reintroducing fabricated business data.
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

export type Context = { type: 'campaign' | 'game_operation' | 'user' | 'meeting'; id: string; name: string };
export type Workspace = { id: string; name: string; description: string; members: string[]; owner_id: string; privacy: 'public' | 'private'; linked_tasks: string[]; linked_campaigns: string[]; linked_files: string[]; linked_chat_channel_id: string; linked_knowledge_base_articles: string[] };
export type FeedItem = { item_id: string; timestamp: string; author_user_id: string | 'system'; item_type: 'post' | 'poll' | 'kudos' | 'system_event'; content: { text: string }; reactions: { user_id: string; reaction_type: 'like' | 'celebrate' | 'idea' | 'thanks' }[]; comments_count: number; is_pinned: boolean };
export type Bet = { id: string; playerId: string; market: string; stake: number; odds: number; status: 'pending' | 'won' | 'lost' | 'cashed_out'; timestamp: string };
export type Affiliate = { id: string; name: string; trackingCode: string; commissionRate: number };

export const users: LegacyUser[] = [];
export const tasks: any[] = [];
export const meetings: any[] = [];
export const departments: any[] = [];
export const campaigns: any[] = [];
export const projects = campaigns;
export const gameOperations: any[] = [];
export const knowledgeBase: any[] = [];
export const documents: any[] = [];
export const reports: any[] = [];
export const workflows: any[] = [];
export const automations: any[] = [];
export const integrations: any[] = [];
export const nationalHolidays: any[] = [];
export const calendarEvents: any[] = [];
export const cloudFiles: any[] = [];
export const workspaces: Workspace[] = [];
export const feedItems: FeedItem[] = [];
export const messages: Record<string, any[]> = {};
export const bets: Bet[] = [];
export const affiliates: Affiliate[] = [];
export const portalData = { dailyFocus: '', hotMarkets: [] as string[], countdownEvent: '', countdownDays: 0, recordOdd: 0 };
export const analyticsData = { userActivity: { labels: [] as string[], data: [] as number[] }, projectProgress: { labels: [] as string[], data: [] as number[] } };
export const menuItems: any[] = [];

export function getCurrentUser(): LegacyUser {
  try {
    const { auth } = initializeFirebase();
    const user = auth.currentUser;
    return {
      id: user?.uid ?? '', name: user?.displayName ?? '', email: user?.email ?? '', role: '', department: '', avatar: user?.photoURL ?? '', status: 'offline', lastSeen: '', bio: '', phone: user?.phoneNumber ?? '', location: '', permissions: [],
    };
  } catch {
    return { id: '', name: '', email: '', role: '', department: '', avatar: '', status: 'offline', lastSeen: '', bio: '', phone: '', location: '', permissions: [] };
  }
}

export const getTasksForUser = (_userId: string | number) => [] as any[];
export const getUpcomingMeetings = (_userId: string | number) => [] as any[];
export const getCampaignsForUser = (_userId: string | number) => [] as any[];
export const getDepartment = (_slug: string) => undefined;
export const getDepartmentMembers = (_deptName: string) => [] as LegacyUser[];
export const getDepartmentProjects = (_deptName: string) => [] as any[];
export const getCalendarEventsForUser = (_userId: string | number) => [] as any[];
export const getWorkspacesForUser = (_userId: string | number) => [] as Workspace[];
export const getWorkspaceById = (_workspaceId: string) => undefined;
export const getWorkspaceTasks = (_taskIds: (string | number)[]) => [] as any[];
export const getWorkspaceFiles = (_fileIds: (string | number)[]) => [] as any[];
export const getCampaignById = (_campaignId: string) => undefined;
