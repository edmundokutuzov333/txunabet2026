import { DocumentWorkspace } from '@/features/documents/document-workspace';

export default async function DocumentEditorPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams;
  return <DocumentWorkspace initialDocumentId={params.id} />;
}
