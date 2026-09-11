import { ProductionModuleView } from '@/components/modules/production-module-view';

export default async function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return <ProductionModuleView module="campaigns" recordId={campaignId} />;
}
