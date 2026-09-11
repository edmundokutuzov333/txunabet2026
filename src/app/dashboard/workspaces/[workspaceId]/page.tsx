import { ProductionModuleView } from '@/components/modules/production-module-view';

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <ProductionModuleView module="workspaces" recordId={workspaceId} />;
}
