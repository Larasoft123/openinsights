# Phase 11: Evidence Dashboard & Synthesis

## Overview

Build the "Discovery" phase features from the PRD:

1. **Semantic Search** - Find clips by meaning using pgvector
2. **Evidence Dashboard** - View/filter all highlights across sources
3. **Insight Board** - Group highlights into themes
4. **Export** - PDF/Markdown export of findings

## Current State

- Embeddings stored in `transcript_segments.embedding` (1536-dim OpenAI vectors)
- Highlights link segments to tags via `highlights` table
- Basic keyword search exists in transcript panel

## Priority Order

| Task                                      | Priority | Risk                           |
| ----------------------------------------- | -------- | ------------------------------ |
| Step 1: Search API                        | High     | Critical for "Discovery" value |
| Step 2: Theme Schema + Evidence Dashboard | High     | Foundation for synthesis       |
| Step 3: Insight Board (Kanban)            | Medium   | High UX complexity (DnD)       |
| Step 4: Export (Markdown + PDF)           | Low      | Nice-to-have polish            |

## Implementation Plan

### Step 1: Semantic Search API

Create `/api/projects/[projectId]/search` endpoint:

- Accept natural language query
- Generate embedding for query using OpenAI
- Query pgvector using cosine similarity (`<=>` operator)
- **Similarity threshold**: MIN_SIMILARITY = 0.75 to filter noise
- Return ranked segments with source context

**Database optimization**: Add HNSW index for fast 1536-dim vector search:

```sql
CREATE INDEX IF NOT EXISTS transcript_segments_embedding_idx
ON transcript_segments
USING hnsw (embedding vector_cosine_ops);
```

**Production-grade query**:

```sql
SELECT ts.id, ts.content, s.title as source_title, s.id as source_id,
       1 - (ts.embedding <=> $query_vector::vector) as similarity
FROM transcript_segments ts
JOIN sources s ON ts.source_id = s.id
WHERE s.project_id = $project_id
  AND ts.embedding IS NOT NULL
  AND 1 - (ts.embedding <=> $query_vector::vector) > 0.75
ORDER BY ts.embedding <=> $query_vector
LIMIT 20;
```

### Step 2: Evidence Dashboard Page

Create `/projects/[projectId]/evidence` page:

- List all highlights grouped by tag (accordion/tabs)
- Filter by tag, source, date range
- Semantic search bar (queries Step 1 API)
- Click highlight to jump to source in Analysis Canvas

Components:

- `EvidenceDashboard` - Main layout
- `HighlightCard` - Display highlight with video thumbnail
- `TagFilter` - Multi-select tag filter
- `SemanticSearchInput` - Search with AI toggle

### Step 3: Insight Board (Themes)

Add new schema model:

```prisma
model Theme {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String   @default("#6366F1")
  projectId   String   @map("project_id")
  project     Project  @relation(...)
  highlights  HighlightTheme[]
}

model HighlightTheme {
  highlightId String    @map("highlight_id")
  highlight   Highlight @relation(...)
  themeId     String    @map("theme_id")
  theme       Theme     @relation(...)
  @@id([highlightId, themeId])
}
```

Create `/projects/[projectId]/insights` page:

- Kanban-style board with themes as columns
- Drag-and-drop highlights between themes
- Create/edit/delete themes

**"Magic Cluster" Feature** (AI-assisted theme suggestion):

- Button to auto-suggest themes for unassigned highlights
- Uses Gemini to analyze highlight content and propose 3-5 themes
- Returns JSON with theme names and suggested highlight assignments
- User can accept/modify suggestions before applying

### Step 4: Export Functionality

Create `/api/projects/[projectId]/export` endpoint:

- Query params: `format=pdf|markdown`, `themeId?`
- Markdown: Generate structured document with highlights
- PDF: Use `@react-pdf/renderer` for styled output

Export includes:

- Project metadata
- Themes with grouped highlights
- Source references with timestamps

## File Structure

```
src/
├── app/
│   ├── projects/
│   │   └── [projectId]/
│   │       ├── evidence/
│   │       │   └── page.tsx
│   │       └── insights/
│   │           └── page.tsx
│   └── api/
│       └── projects/
│           └── [projectId]/
│               ├── search/
│               │   └── route.ts
│               ├── themes/
│               │   └── route.ts
│               └── export/
│                   └── route.ts
├── components/
│   ├── evidence/
│   │   ├── evidence-dashboard.tsx
│   │   ├── highlight-card.tsx
│   │   ├── tag-filter.tsx
│   │   └── semantic-search.tsx
│   └── insights/
│       ├── insight-board.tsx
│       ├── theme-column.tsx
│       └── draggable-highlight.tsx
└── lib/
    └── services/
        ├── search.service.ts
        └── export.service.ts
```

## Dependencies to Add

- `@dnd-kit/core` - Drag and drop for insight board
- `@react-pdf/renderer` - PDF generation (optional, can start with markdown only)

## Testing Strategy

### Unit Tests (Vitest)

- `search.service.test.ts` - Test embedding generation and SQL query building
- `export.service.test.ts` - Test markdown/PDF generation logic

### Integration Tests (Vitest + Real DB)

- `search.api.test.ts` - Test semantic search API with seeded data
- `themes.api.test.ts` - Test CRUD operations for themes
- `export.api.test.ts` - Test export endpoint responses

### E2E Tests (Playwright)

- Evidence dashboard flow: filter, search, click to navigate
- Insight board flow: create theme, drag highlight, export

### CI/CD Update

Update `.github/workflows/ci.yml` to include pgvector in test database:

```yaml
- name: Setup Test Database
  run: |
    docker run -d --name postgres-test \
      -e POSTGRES_USER=test \
      -e POSTGRES_PASSWORD=test \
      -e POSTGRES_DB=openinsights_test \
      -p 5432:5432 \
      ankane/pgvector:latest
    sleep 5
    docker exec postgres-test psql -U test -d openinsights_test \
      -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## Decisions Made

- **Scope**: Full (semantic search + evidence dashboard + insight board + export)
- **Data scope**: Project-scoped (highlights from sources within current project)
