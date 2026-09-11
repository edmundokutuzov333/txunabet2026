export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'reversed';

export interface TransactionRecord {
  id: string;
  companyId: string;
  userId: string;
  externalId?: string | null;
  source: 'stripe' | 'wallet' | 'manual' | 'system';
  amount: number;
  currency: string;
  status: TransactionStatus;
  createdAt: unknown;
  updatedAt: unknown;
  metadata: Record<string, string>;
}
