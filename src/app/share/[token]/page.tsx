import { notFound } from 'next/navigation';
import {
  validateShareLink,
  getSharedProjectData,
  getSharedSourceData,
} from '@/lib/services/share.service';
import { SharedProjectView } from '@/components/share/shared-project-view';
import { SharedSourceView } from '@/components/share/shared-source-view';
import { PoweredByWatermark } from '@/components/share/powered-by-watermark';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  // Validate the share link
  const shareLink = await validateShareLink(token);

  if (!shareLink) {
    notFound();
  }

  const isSourceShare = shareLink.sourceId !== null;

  if (isSourceShare) {
    // Fetch source data
    const sourceData = await getSharedSourceData(shareLink.sourceId!);

    if (!sourceData) {
      notFound();
    }

    return (
      <div className="relative min-h-screen">
        <SharedSourceView source={sourceData} projectName={shareLink.project.name} />
        <PoweredByWatermark />
      </div>
    );
  }

  // Fetch project data
  const projectData = await getSharedProjectData(shareLink.project.id, {
    includeEvidence: shareLink.includeEvidence,
    includeInsights: shareLink.includeInsights,
  });

  if (!projectData) {
    notFound();
  }

  return (
    <div className="relative min-h-screen">
      <SharedProjectView
        project={projectData}
        includeEvidence={shareLink.includeEvidence}
        includeInsights={shareLink.includeInsights}
      />
      <PoweredByWatermark />
    </div>
  );
}
