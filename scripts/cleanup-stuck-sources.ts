import { prisma } from '../src/lib/db';

async function main() {
  // Find sources stuck in PROCESSING for more than 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const stuckSources = await prisma.source.findMany({
    where: {
      status: 'PROCESSING',
      updatedAt: { lt: tenMinutesAgo },
    },
    select: { id: true, title: true, updatedAt: true },
  });

  console.log(`Found ${stuckSources.length} stuck sources:`);
  stuckSources.forEach((s) => console.log(`  - ${s.id}: ${s.title} (updated: ${s.updatedAt})`));

  if (stuckSources.length === 0) {
    console.log('No stuck sources to clean up');
    return;
  }

  // Mark them as FAILED
  const result = await prisma.source.updateMany({
    where: { id: { in: stuckSources.map((s) => s.id) } },
    data: {
      status: 'FAILED',
      processingStep: null,
      processingProgress: null,
      processingStartedAt: null,
    },
  });

  console.log(`Marked ${result.count} sources as FAILED`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
