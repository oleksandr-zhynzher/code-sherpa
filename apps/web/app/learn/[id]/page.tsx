import { LearnDetailClient } from './learn-detail-client';

export default async function LearnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LearnDetailClient id={id} />;
}
