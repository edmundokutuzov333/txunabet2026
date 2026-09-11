export type DocumentAccess = 'viewer' | 'editor';

export interface DocumentRecord {
  id: string;
  companyId: string;
  ownerId: string;
  title: string;
  content: string;
  viewerIds: string[];
  editorIds: string[];
  version: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  createdBy: string;
  createdAt: unknown;
}
