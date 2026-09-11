import type { Timestamp } from 'firebase/firestore';

export type MessageLike = {
  id: string;
  clientMessageId?: string | null;
  createdAt: number | string | Timestamp | null;
};

function timestamp(value: MessageLike['createdAt']): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (value && typeof value === 'object') {
    const candidate = value as Timestamp & { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof candidate.toMillis === 'function') return candidate.toMillis();
    if (typeof candidate.seconds === 'number') return candidate.seconds * 1000 + Math.floor((candidate.nanoseconds ?? 0) / 1_000_000);
  }
  return 0;
}

/**
 * Merge server snapshots, older pages and optimistic messages into one stable
 * timeline. Document IDs win over optimistic entries; clientMessageId then
 * prevents duplicates when the server acknowledgement races the realtime feed.
 */
export function mergeMessageState<T extends MessageLike>(...collections: T[][]): T[] {
  const byId = new Map<string, T>();
  const optimisticByClientId = new Map<string, string>();

  for (const collection of collections) {
    for (const message of collection) {
      const existing = byId.get(message.id);
      if (existing) {
        byId.set(message.id, preferServerMessage(existing, message));
        continue;
      }
      const clientId = message.clientMessageId ?? null;
      if (clientId) {
        const previousId = optimisticByClientId.get(clientId);
        if (previousId && previousId !== message.id) {
          byId.delete(previousId);
        }
        optimisticByClientId.set(clientId, message.id);
      }
      byId.set(message.id, message);
    }
  }

  return Array.from(byId.values()).sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt));
}

function preferServerMessage<T extends MessageLike>(left: T, right: T): T {
  const leftOptimistic = left.id.startsWith('optimistic_');
  const rightOptimistic = right.id.startsWith('optimistic_');
  if (leftOptimistic && !rightOptimistic) return right;
  return leftOptimistic === rightOptimistic ? (timestamp(right.createdAt) >= timestamp(left.createdAt) ? right : left) : left;
}
