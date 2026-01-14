#!/usr/bin/env npx tsx

/**
 * Seed Official Presets
 *
 * This script creates the 4 official presets for OpenInsights.
 * Run with: npx tsx scripts/seed-official-presets.ts
 *
 * Requirements:
 * - Database must be set up with at least one user
 * - The first user will be set as the author of official presets
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';
import type { PresetConfig } from '../src/lib/db/presets/types';

// Official preset configurations based on the spec
const OFFICIAL_PRESETS: Array<{
  name: string;
  description: string;
  category: string;
  config: PresetConfig;
}> = [
  {
    name: 'Usability Test Analysis',
    description:
      'Complete setup for moderated usability tests. Track task completion, friction points, and user emotions during usability testing sessions.',
    category: 'USABILITY',
    config: {
      tags: [
        // Task Outcomes
        {
          name: 'Task Success',
          color: '#22C55E',
          description: 'User completed the task successfully',
        },
        {
          name: 'Task Partial',
          color: '#F59E0B',
          description: 'User completed with difficulty or assistance',
        },
        { name: 'Task Failure', color: '#EF4444', description: 'User could not complete the task' },
        // Friction Points
        {
          name: 'Confusion',
          color: '#F97316',
          description: 'User expresses confusion or uncertainty',
        },
        {
          name: 'Hesitation',
          color: '#FB923C',
          description: 'User pauses or hesitates before action',
        },
        {
          name: 'Misclick',
          color: '#FBBF24',
          description: 'User clicks wrong element or takes wrong path',
        },
        {
          name: 'Workaround',
          color: '#A3E635',
          description: 'User finds alternative way to complete task',
        },
        // Emotions
        { name: 'Frustration', color: '#DC2626', description: 'User shows signs of frustration' },
        {
          name: 'Delight',
          color: '#10B981',
          description: 'User expresses positive surprise or satisfaction',
        },
        {
          name: 'Surprise',
          color: '#8B5CF6',
          description: 'User reacts unexpectedly to UI behavior',
        },
        // Quotes
        { name: 'Pain Point', color: '#E11D48', description: 'Direct quote about a problem' },
        {
          name: 'Feature Request',
          color: '#0EA5E9',
          description: 'User suggests new functionality',
        },
      ],
      metadataFields: [
        {
          name: 'participant_segment',
          label: 'Participant Segment',
          fieldType: 'SELECT',
          options: [
            'New User (< 1 month)',
            'Regular User (1-12 months)',
            'Power User (> 12 months)',
          ],
          required: true,
        },
        {
          name: 'task_scenario',
          label: 'Task Scenario',
          fieldType: 'TEXT',
          placeholder: 'e.g., Complete checkout flow',
        },
        {
          name: 'device',
          label: 'Device',
          fieldType: 'SELECT',
          options: ['Desktop', 'Mobile (iOS)', 'Mobile (Android)', 'Tablet'],
        },
        {
          name: 'task_success',
          label: 'Task Completed Successfully',
          fieldType: 'BOOLEAN',
        },
      ],
      aiPrompts: {
        autoTaggingEnabled: false,
        autoTaggingPrompt: `Analyze the transcript and identify moments where:
- User expresses confusion ("I don't understand", "where is", pauses > 3 sec)
- User makes an error or takes an unexpected path
- User expresses emotion (frustration, delight, surprise)
- User explicitly requests a feature or workaround

For each moment, suggest the most appropriate tag from the available taxonomy.`,
        projectSummaryPrompt: `Based on the tagged highlights across all sessions, identify:
1. Top 5 recurring friction points by frequency
2. Patterns that appear in 3+ sessions
3. Critical severity issues (blocking task completion)

Group findings by theme and suggest priority order.`,
      },
      projectSettings: {
        projectType: 'Usability Testing',
        goals: 'Identify usability issues and friction points in the user experience',
      },
    },
  },
  {
    name: 'Jobs-to-be-Done Interview',
    description:
      'For analyzing customer switching decisions using the JTBD framework. Tracks the timeline from first thought to satisfaction, plus the four forces that influence adoption.',
    category: 'DISCOVERY',
    config: {
      tags: [
        // Timeline
        {
          name: 'First Thought',
          color: '#6366F1',
          description: 'When they first realized they needed a change',
        },
        {
          name: 'Passive Looking',
          color: '#818CF8',
          description: 'Casually exploring alternatives',
        },
        {
          name: 'Active Looking',
          color: '#A78BFA',
          description: 'Actively searching for solutions',
        },
        { name: 'Deciding', color: '#C4B5FD', description: 'Evaluating final options' },
        { name: 'Consuming', color: '#DDD6FE', description: 'Using the new solution' },
        { name: 'Satisfaction', color: '#22C55E', description: 'Reflecting on the switch' },
        // Forces - Push
        {
          name: 'Push: Frustration',
          color: '#EF4444',
          description: 'Frustration with current solution',
        },
        {
          name: 'Push: Changed Circumstances',
          color: '#F97316',
          description: 'Life/work changes forcing action',
        },
        // Forces - Pull
        {
          name: 'Pull: Attraction',
          color: '#10B981',
          description: 'Appeal of new solution features',
        },
        {
          name: 'Pull: Social Proof',
          color: '#14B8A6',
          description: 'Recommendations from others',
        },
        // Forces - Anxiety
        { name: 'Anxiety: Unknown', color: '#F59E0B', description: 'Fear of the unknown' },
        { name: 'Anxiety: Switching Cost', color: '#FBBF24', description: 'Effort to switch' },
        // Forces - Habit
        { name: 'Habit: Comfort', color: '#6B7280', description: 'Comfort with current solution' },
        {
          name: 'Habit: Sunk Cost',
          color: '#9CA3AF',
          description: 'Investment in current solution',
        },
      ],
      metadataFields: [
        {
          name: 'previous_solution',
          label: 'Previous Solution',
          fieldType: 'TEXT',
          placeholder: 'What they were using before',
        },
        {
          name: 'new_solution',
          label: 'New Solution',
          fieldType: 'TEXT',
          placeholder: 'What they switched to',
        },
        {
          name: 'timeline_duration',
          label: 'Timeline Duration',
          fieldType: 'SELECT',
          options: ['< 1 week', '1-4 weeks', '1-3 months', '3-6 months', '> 6 months'],
        },
      ],
      aiPrompts: {
        autoTaggingEnabled: false,
        autoTaggingPrompt: `Identify key moments in the customer's switching journey:
- Triggering events that started the search
- Comparison moments with alternatives
- The deciding moment
- Forces at play (push, pull, anxiety, habit)

Tag each moment with the appropriate timeline stage or force.`,
        projectSummaryPrompt: `Synthesize the customer journeys to identify:
1. Common triggering events
2. Key decision criteria
3. Strongest push and pull forces
4. Main anxieties and how they were overcome

Create a composite customer timeline with insights.`,
      },
      projectSettings: {
        projectType: 'Jobs-to-be-Done',
        goals: 'Understand why customers switch between solutions and what drives their decisions',
      },
    },
  },
  {
    name: 'Customer Feedback Synthesis',
    description:
      'Analyze customer feedback from reviews, support tickets, or surveys. Automatically classify sentiment, topics, and actionability.',
    category: 'VOICE_OF_CUSTOMER',
    config: {
      tags: [
        // Sentiment
        { name: 'Positive', color: '#22C55E', description: 'Positive feedback or praise' },
        { name: 'Neutral', color: '#6B7280', description: 'Neutral or factual statement' },
        { name: 'Negative', color: '#EF4444', description: 'Negative feedback or complaint' },
        // Topics
        { name: 'Topic: Pricing', color: '#0EA5E9', description: 'Related to pricing or value' },
        { name: 'Topic: Performance', color: '#8B5CF6', description: 'Speed, reliability, uptime' },
        { name: 'Topic: UX', color: '#EC4899', description: 'User experience and design' },
        { name: 'Topic: Feature', color: '#14B8A6', description: 'Feature request or feedback' },
        { name: 'Topic: Bug', color: '#F97316', description: 'Bug report or technical issue' },
        { name: 'Topic: Support', color: '#6366F1', description: 'Customer support experience' },
        // Actionability
        { name: 'Quick Fix', color: '#22C55E', description: 'Can be addressed quickly' },
        { name: 'Roadmap', color: '#F59E0B', description: 'Requires planning and development' },
        {
          name: 'Out of Scope',
          color: '#6B7280',
          description: 'Not feasible or aligned with strategy',
        },
      ],
      metadataFields: [
        {
          name: 'feedback_source',
          label: 'Feedback Source',
          fieldType: 'SELECT',
          options: [
            'App Store Review',
            'Support Ticket',
            'NPS Survey',
            'Social Media',
            'Email',
            'Other',
          ],
        },
        {
          name: 'user_segment',
          label: 'User Segment',
          fieldType: 'SELECT',
          options: ['New User', 'Active User', 'Power User', 'Churned User', 'Unknown'],
        },
        {
          name: 'priority',
          label: 'Priority',
          fieldType: 'SELECT',
          options: ['Critical', 'High', 'Medium', 'Low'],
        },
      ],
      aiPrompts: {
        autoTaggingEnabled: false,
        autoTaggingPrompt: `Analyze the feedback and classify:
1. Sentiment (positive, neutral, negative)
2. Primary topic (pricing, performance, UX, feature, bug, support)
3. Actionability (quick fix, roadmap, out of scope)

Extract specific requests or issues mentioned.`,
        projectSummaryPrompt: `Synthesize all feedback to provide:
1. Sentiment breakdown by source and segment
2. Top topics by frequency and sentiment
3. Prioritized list of actionable items
4. Key quotes representing each major theme`,
      },
      projectSettings: {
        projectType: 'Voice of Customer',
        goals: 'Synthesize customer feedback to identify trends, issues, and opportunities',
      },
    },
  },
  {
    name: 'Competitor Analysis',
    description:
      'Compare feature parity and user perceptions across competing products. Track what users like about competitors and switching triggers.',
    category: 'COMPETITIVE',
    config: {
      tags: [
        // Feature Parity
        { name: 'We Have', color: '#22C55E', description: 'Feature we have that competitors lack' },
        {
          name: 'They Have',
          color: '#EF4444',
          description: 'Feature competitors have that we lack',
        },
        { name: 'Both Have', color: '#6B7280', description: 'Feature both products have' },
        // User Perception
        {
          name: 'Perception: Better',
          color: '#22C55E',
          description: 'Users perceive us as better',
        },
        { name: 'Perception: Worse', color: '#EF4444', description: 'Users perceive us as worse' },
        { name: 'Perception: Similar', color: '#6B7280', description: 'Users see no difference' },
        // Switching Triggers
        {
          name: 'Switch To Them If',
          color: '#F97316',
          description: 'Reasons users would switch to competitor',
        },
        {
          name: 'Switch To Us If',
          color: '#10B981',
          description: 'Reasons users would switch to us',
        },
        // Competitive Mentions
        {
          name: 'Competitor Mentioned',
          color: '#8B5CF6',
          description: 'Specific competitor reference',
        },
        { name: 'Comparison Quote', color: '#0EA5E9', description: 'Direct comparison statement' },
      ],
      metadataFields: [
        {
          name: 'competitor_name',
          label: 'Primary Competitor Discussed',
          fieldType: 'TEXT',
          placeholder: 'e.g., Competitor X',
        },
        {
          name: 'user_experience',
          label: 'User Experience Level',
          fieldType: 'SELECT',
          options: [
            'Uses Both',
            'Switched From Competitor',
            'Switched To Competitor',
            'Only Uses Us',
            'Only Uses Them',
          ],
        },
      ],
      aiPrompts: {
        autoTaggingEnabled: false,
        autoTaggingPrompt: `Identify competitive intelligence:
- Direct competitor mentions and comparisons
- Feature parity observations (we have, they have, both have)
- Perception statements (better, worse, similar)
- Switching triggers (what would make them switch)

Tag each mention with the appropriate category.`,
        projectSummaryPrompt: `Create a competitive analysis summary:
1. Feature comparison matrix
2. Perception summary by competitor
3. Top switching triggers (both directions)
4. Opportunity areas where we can differentiate`,
      },
      projectSettings: {
        projectType: 'Competitive Analysis',
        goals: 'Understand competitive positioning and identify differentiation opportunities',
      },
    },
  },
];

async function main() {
  console.log('Seeding official presets...\n');

  // Get the first user to be the author of official presets
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!firstUser) {
    console.error('Error: No users found in the database.');
    console.error('Please create at least one user before running this script.');
    process.exit(1);
  }

  console.log(`Using user "${firstUser.email}" as the author for official presets.\n`);

  for (const presetData of OFFICIAL_PRESETS) {
    // Check if preset already exists
    const existing = await prisma.preset.findFirst({
      where: {
        name: presetData.name,
        isOfficial: true,
      },
    });

    if (existing) {
      console.log(`⏭️  Skipping "${presetData.name}" - already exists`);
      continue;
    }

    // Create the preset
    const preset = await prisma.preset.create({
      data: {
        name: presetData.name,
        description: presetData.description,
        category: presetData.category,
        config: presetData.config as unknown as object,
        authorId: firstUser.id,
        visibility: 'PRIVATE', // Official presets are visible to all via isOfficial flag
        isOfficial: true,
      },
    });

    console.log(`✅ Created "${preset.name}" (${preset.category})`);
  }

  console.log('\nDone! Official presets have been seeded.');
}

main()
  .catch((e) => {
    console.error('Error seeding presets:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
