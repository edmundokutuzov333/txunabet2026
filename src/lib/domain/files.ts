export interface FileRecord {
  id: string;
  companyId: string;
  ownerId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  conversationId?: string | null;
  documentId?: string | null;
  createdAt: unknown;
  updatedAt: unknown;
  metadata: Record<string, string>;
}
