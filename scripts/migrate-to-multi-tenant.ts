#!/usr/bin/env npx tsx
/**
 * Migration Script: Single-Tenant to Multi-Tenant
 *
 * This script migrates an existing OpenInsights installation to the multi-tenant architecture:
 *
 * 1. Creates a default Organization with tenant_default schema
 * 2. Creates the tenant schema using the template
 * 3. Copies existing data from public schema to tenant schema
 * 4. Associates all users with the default organization
 * 5. Creates a free unlimited plan and subscription
 *
 * IMPORTANT: Backup your database before running!
 *
 * Usage:
 *   npx tsx scripts/migrate-to-multi-tenant.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --org-name   Organization name (default: "My Organization")
 *   --org-slug   Organization slug (default: "default")
 */

import { prisma } from '../src/lib/db';
import { createTenantSchema, tenantPool, withTenantSchema } from '../src/lib/db/tenant';

interface MigrationOptions {
  dryRun: boolean;
  orgName: string;
  orgSlug: string;
}

async function parseArgs(): Promise<MigrationOptions> {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    orgName: getArgValue(args, '--org-name') || process.env.DEFAULT_ORG_NAME || 'My Organization',
    orgSlug: getArgValue(args, '--org-slug') || process.env.DEFAULT_ORG_SLUG || 'default',
  };
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

async function migrateToMultiTenant() {
  const options = await parseArgs();

  console.log('');
  console.log('='.repeat(60));
  console.log('  OpenInsights Migration: Single-Tenant → Multi-Tenant');
  console.log('='.repeat(60));
  console.log('');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Step 1: Check if already migrated
    console.log('Step 1: Checking migration status...');
    const existingOrg = await prisma.organization.findFirst();
    if (existingOrg) {
      console.log(`  ⚠️  Organization already exists: ${existingOrg.name}`);
      console.log('  Migration appears to have been run before. Exiting.');
      return;
    }
    console.log('  ✓ No existing organizations found\n');

    // Step 2: Count existing data
    console.log('Step 2: Analyzing existing data...');
    const userCount = await prisma.user.count();
    const workspaceCount = await prisma.workspace.count();
    const projectCount = await prisma.project.count();
    const sourceCount = await prisma.source.count();
    const segmentCount = await prisma.transcriptSegment.count();

    console.log(`  Users:      ${userCount}`);
    console.log(`  Workspaces: ${workspaceCount}`);
    console.log(`  Projects:   ${projectCount}`);
    console.log(`  Sources:    ${sourceCount}`);
    console.log(`  Segments:   ${segmentCount}\n`);

    if (options.dryRun) {
      console.log('Step 3: Would create organization...');
      console.log(`  Name: ${options.orgName}`);
      console.log(`  Slug: ${options.orgSlug}`);
      console.log(`  Schema: tenant_default\n`);

      console.log('Step 4: Would create tenant schema with embedding dimension 1536\n');

      console.log('Step 5: Would copy data to tenant schema\n');

      console.log('Step 6: Would create organization memberships for all users\n');

      console.log('Step 7: Would create unlimited free plan and subscription\n');

      console.log('🔍 DRY RUN COMPLETE - No changes made');
      return;
    }

    // Step 3: Create Organization
    console.log('Step 3: Creating organization...');
    const org = await prisma.organization.create({
      data: {
        name: options.orgName,
        slug: options.orgSlug,
        schemaName: 'tenant_default',
        embeddingDimension: 1536, // Default to OpenAI dimension
      },
    });
    console.log(`  ✓ Created organization: ${org.name} (${org.id})\n`);

    // Step 4: Create tenant schema
    console.log('Step 4: Creating tenant schema...');
    const schemaName = await createTenantSchema('default', 1536);
    console.log(`  ✓ Created schema: ${schemaName}\n`);

    // Step 5: Copy data to tenant schema
    console.log('Step 5: Copying data to tenant schema...');
    await copyDataToTenantSchema(schemaName);
    console.log('  ✓ Data copied successfully\n');

    // Step 6: Create organization memberships
    console.log('Step 6: Creating organization memberships...');
    const users = await prisma.user.findMany();
    let ownerAssigned = false;

    for (const user of users) {
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: !ownerAssigned ? 'OWNER' : 'MEMBER', // First user becomes OWNER
          joinedAt: new Date(),
        },
      });
      if (!ownerAssigned) {
        console.log(`  ✓ ${user.email} → OWNER`);
        ownerAssigned = true;
      } else {
        console.log(`  ✓ ${user.email} → MEMBER`);
      }
    }
    console.log('');

    // Step 7: Create unlimited plan and subscription
    console.log('Step 7: Creating unlimited plan and subscription...');
    const plan = await prisma.plan.create({
      data: {
        name: 'Self-Hosted',
        priceMonthly: 0,
        maxUsers: 0, // 0 = unlimited
        maxStorageGb: 0,
        maxTranscriptionMins: 0,
        maxProjects: 0,
      },
    });
    console.log(`  ✓ Created plan: ${plan.name}`);

    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
      },
    });
    console.log('  ✓ Created subscription\n');

    // Done!
    console.log('='.repeat(60));
    console.log('  Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log(`  Organization: ${org.name} (${org.slug})`);
    console.log(`  Schema: ${schemaName}`);
    console.log(`  Members: ${users.length}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: npx prisma db push');
    console.log('  2. Verify data in tenant schema');
    console.log('  3. Update .env with ENCRYPTION_KEY (openssl rand -hex 32)');
    console.log('');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function copyDataToTenantSchema(schemaName: string) {
  // Get existing workspaces with their AI settings
  const workspaces = await prisma.workspace.findMany({
    include: {
      projects: {
        include: {
          sources: {
            include: {
              segments: true,
            },
          },
          tags: {
            include: {
              highlights: {
                include: {
                  themes: true,
                },
              },
            },
          },
          themes: true,
          shareLinks: true,
          speakerNames: true,
        },
      },
    },
  });

  if (workspaces.length === 0) {
    console.log('  No workspaces to migrate');
    return;
  }

  await withTenantSchema(schemaName, async (client) => {
    for (const workspace of workspaces) {
      // Insert workspace
      await client.query(
        `INSERT INTO workspaces (id, name, slug, ai_provider, openai_transcription_model, embedding_provider, gemini_api_key, openai_api_key, ollama_base_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          workspace.id,
          workspace.name,
          workspace.slug,
          workspace.aiProvider,
          workspace.openaiTranscriptionModel,
          workspace.embeddingProvider,
          workspace.geminiApiKey,
          workspace.openaiApiKey,
          workspace.ollamaBaseUrl,
          workspace.createdAt,
          workspace.updatedAt,
        ]
      );

      // Insert workspace member for owner
      const owner = await prisma.user.findFirst({
        where: { workspaceId: workspace.id },
      });
      if (owner) {
        await client.query(
          `INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
           VALUES ($1, $2, 'owner', NOW())`,
          [workspace.id, owner.id]
        );
      }

      for (const project of workspace.projects) {
        // Insert project
        await client.query(
          `INSERT INTO projects (id, workspace_id, name, description, summary, summary_status, summary_generated_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            project.id,
            workspace.id,
            project.name,
            project.description,
            project.summary ? JSON.stringify(project.summary) : null,
            project.summaryStatus,
            project.summaryGeneratedAt,
            project.createdAt,
            project.updatedAt,
          ]
        );

        // Insert tags
        for (const tag of project.tags) {
          await client.query(
            `INSERT INTO tags (id, project_id, name, color, description, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tag.id, project.id, tag.name, tag.color, tag.description, tag.createdAt, tag.updatedAt]
          );
        }

        // Insert themes
        for (const theme of project.themes) {
          await client.query(
            `INSERT INTO themes (id, project_id, name, description, color, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              theme.id,
              project.id,
              theme.name,
              theme.description,
              theme.color,
              theme.createdAt,
              theme.updatedAt,
            ]
          );
        }

        for (const source of project.sources) {
          // Insert source
          await client.query(
            `INSERT INTO sources (id, project_id, title, file_name, file_url, file_type, duration, status, processing_step, processing_progress, processing_started_at, deleted_at, summary, summary_status, summary_generated_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
              source.id,
              project.id,
              source.title,
              source.fileName,
              source.fileUrl,
              source.fileType,
              source.duration,
              source.status,
              source.processingStep,
              source.processingProgress,
              source.processingStartedAt,
              source.deletedAt,
              source.summary ? JSON.stringify(source.summary) : null,
              source.summaryStatus,
              source.summaryGeneratedAt,
              source.createdAt,
              source.updatedAt,
            ]
          );

          // Insert segments (without embedding - will copy with raw SQL at the end)
          for (const segment of source.segments) {
            await client.query(
              `INSERT INTO transcript_segments (id, source_id, content, start_time, end_time, speaker_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                segment.id,
                source.id,
                segment.content,
                segment.startTime,
                segment.endTime,
                segment.speakerId,
                segment.createdAt,
                segment.updatedAt,
              ]
            );
          }
        }

        // Insert highlights (after segments and tags exist)
        for (const tag of project.tags) {
          for (const highlight of tag.highlights) {
            await client.query(
              `INSERT INTO highlights (id, segment_id, tag_id, note, selected_text, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                highlight.id,
                highlight.segmentId,
                tag.id,
                highlight.note,
                highlight.selectedText,
                highlight.createdAt,
                highlight.updatedAt,
              ]
            );

            // Insert highlight-theme associations
            for (const ht of highlight.themes) {
              await client.query(
                `INSERT INTO highlight_themes (highlight_id, theme_id, created_at)
                 VALUES ($1, $2, $3)`,
                [highlight.id, ht.themeId, ht.createdAt]
              );
            }
          }
        }

        // Insert share links
        for (const shareLink of project.shareLinks) {
          await client.query(
            `INSERT INTO share_links (id, token, project_id, source_id, share_type, include_evidence, include_insights, created_by_id, is_active, expires_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              shareLink.id,
              shareLink.token,
              project.id,
              shareLink.sourceId,
              shareLink.sourceId ? 'source' : 'project',
              shareLink.includeEvidence,
              shareLink.includeInsights,
              shareLink.createdById,
              shareLink.isActive,
              shareLink.expiresAt,
              shareLink.createdAt,
              shareLink.updatedAt,
            ]
          );
        }

        // Insert speaker names
        for (const speakerName of project.speakerNames) {
          await client.query(
            `INSERT INTO speaker_names (id, project_id, speaker_id, custom_name, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              speakerName.id,
              project.id,
              speakerName.speakerId,
              speakerName.customName,
              speakerName.createdAt,
              speakerName.updatedAt,
            ]
          );
        }
      }

      console.log(`  ✓ Migrated workspace: ${workspace.name}`);
    }

    // Copy embeddings using raw SQL (Prisma doesn't expose Unsupported types)
    // This is done as a single bulk operation after all segments are inserted
    console.log('  Copying embeddings...');
    await client.query(
      `UPDATE transcript_segments ts
       SET embedding = pts.embedding
       FROM public.transcript_segments pts
       WHERE ts.id = pts.id AND pts.embedding IS NOT NULL`
    );
    console.log('  ✓ Embeddings copied');
  });
}

// Run migration
migrateToMultiTenant()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await tenantPool.end();
    process.exit(0);
  });
