import { DocumentWorkspaceV2 } from '@/features/documents/document-workspace-v2';

export default async function DocumentEditorPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams;
  return <DocumentWorkspaceV2 initialDocumentId={params.id} />;
}
