import { DocumentWorkspaceV3 } from '@/features/documents/document-workspace-v3';

export default async function DocumentEditorPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams;
  return <DocumentWorkspaceV3 initialDocumentId={params.id} />;
}
