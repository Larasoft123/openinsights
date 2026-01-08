PRD: OpenInsights
Subtitle: The Privacy-First, Open Source Research Intelligence Platform

Version: 1.0.0

Lead Engineer: [Your Name]

Stack: TypeScript, Next.js 15, PostgreSQL (pgvector), Prisma, BullMQ, Tailwind CSS.

1. Executive Summary
   OpenInsights is a specialized tool for qualitative researchers to transform raw data (video/audio) into structured evidence. It solves the three main friction points of current market leaders (Dovetail, Condens): High cost, Cloud-only data storage, and Vendor lock-in.

Core Pillars:
Ownership: Complete control over research data via self-hosting.

Intelligence: Automated transcription and semantic search using AI.

Speed: A "keyboard-first" interface for rapid tagging and synthesis.

2. Target Audience
   Solo UX Researchers: Need professional-grade tools without enterprise pricing.

Regulated Industries: FinTech, MedTech, and GovTech requiring on-premise data processing.

Agencies: Need to hand over research repositories to clients without ongoing subscription costs.

3. Functional Requirements
   3.1 Workspace & Project Management
   Multi-tenancy: Support for multiple Workspaces (Teams).

Project Silos: Research data (Interviews, Tags, Insights) must be scoped to specific Projects.

Access Control: Role-based access (Admin, Editor, Viewer).

3.2 Media Ingestion & Processing Pipeline
Async Upload: Support for large file uploads (up to 2GB) with resumable state.

The Processing Worker (BullMQ): 1. Audio Extraction: Strip audio via FFmpeg for faster AI processing. 2. STT (Speech-to-Text): Integration with OpenAI Whisper (Local or API). 3. Diarization: Distinguish between Moderator and Participant. 4. Vectorization: Convert transcript segments into embeddings using pgvector.

3.3 The Analysis Canvas (Key Feature)
Synced Transcription: A React-based text editor synced with a Video/Audio player (Timestamp accuracy: ±100ms).

Selection & Tagging: Click-and-drag text selection to apply tags from a project-wide taxonomy.

Rich Media Highlights: Creating a highlight must preserve the video snippet, not just the text.

3.4 Synthesis & Discovery
Insight Boards: A grid-based view to group related highlights into "Themes."

Semantic Search: Users can ask questions like "How do users feel about the checkout button?" and find relevant video clips based on meaning, not just keywords.

Global Taxonomy: Manage a library of tags with colors and descriptions across the workspace.

4. Technical Architecture
   4.1 The Stack
   Frontend: Next.js 15 (App Router), TanStack Query, Radix UI.

Backend: Next.js Route Handlers + Standalone Node.js Worker for heavy lifting.

Database: PostgreSQL 16+ with pgvector extension.

Caching/Queue: Redis.

Storage: MinIO (Local) or AWS S3 (Production).

4.2 Database Schema Overview (Prisma)
User & Account: Auth and session management.

Project: Container for research.

Source: Metadata for uploaded video/audio files.

TranscriptSegment: Individual lines of text with startTime, endTime, and vector (embedding).

Tag: Taxonomy definitions.

Highlight: The join table between TranscriptSegment and Tag.

5. Non-Functional Requirements
   Performance: Transcript filtering and video syncing must feel instantaneous (<100ms latency).

Privacy: Option to toggle between "Cloud AI" (OpenAI) and "Local AI" (Ollama/Local Whisper).

Portability: Everything must run inside a docker-compose.yml file for "One-Click" deployment.

6. Development Roadmap (The "Fast-Track")
   Phase 1: Foundations (The "Storage" Phase)
   Setup Next.js 15, Prisma, and PostgreSQL.

Implement file upload to S3/Local.

Project and Source management UI.

Phase 2: Intelligence (The "AI" Phase)
Implement BullMQ workers for background transcription.

Build the Synchronized Player + Transcript view.

Basic tagging system.

Phase 3: Synthesis (The "Discovery" Phase)
Implement pgvector semantic search.

Build the "Insight Board" for grouping highlights.

Export findings to PDF/Markdown.

7. Success Definition
   Community Growth: Project reaches 500+ GitHub Stars within 3 months of launch.

Performance: A researcher can process a 1-hour interview and create 10 highlights in under 15 minutes total.
