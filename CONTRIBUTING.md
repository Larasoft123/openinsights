# Contributing to OpenInsights

Thank you for your interest in contributing to OpenInsights! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker and Docker Compose
- Git

### Getting Started

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/openinsights.git
   cd openinsights
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start infrastructure**

   ```bash
   docker compose up -d
   ./scripts/setup-db.sh
   ```

5. **Start development server**

   ```bash
   pnpm dev
   ```

## Git Workflow

We use GitFlow branching model:

- `main` — Production releases only
- `develop` — Active development (default branch)
- `feature/*` — New features
- `fix/*` — Bug fixes

### Branch Naming

```
feature/short-description
fix/issue-number-short-description
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

# Examples:
feat(search): add semantic search filtering
fix(video): resolve playback sync issues
docs(readme): update installation instructions
refactor(api): simplify error handling
test(search): add integration tests for search service
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

Commits are validated by commitlint via Husky pre-commit hook.

## Code Standards

### TypeScript

- **No `as any` type casting** — Use proper typing or `unknown` with type guards
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation at API boundaries

### Code Quality

Before submitting, ensure your code passes all checks:

```bash
pnpm lint        # ESLint
pnpm format      # Prettier
pnpm typecheck   # TypeScript
pnpm spellcheck  # Spell check
pnpm test        # Run tests
```

All checks run automatically on pull requests via GitHub Actions.

### Testing Guidelines

- **No mocking for integration tests** — Test real database queries, APIs, and connections
- Unit tests with Vitest for pure logic and utilities
- React Testing Library for component testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm vitest run src/__tests__/path/to/test.ts

# Watch mode
pnpm test:watch
```

## Pull Request Process

1. **Create a feature branch from `develop`**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature
   ```

2. **Make your changes and commit**

   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Push and create a pull request**

   ```bash
   git push origin feature/your-feature
   ```

4. **PR Requirements**
   - Target the `develop` branch
   - Provide a clear description of changes
   - Reference any related issues
   - Ensure all CI checks pass
   - Request review from maintainers

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   └── api/                # Route handlers
├── components/
│   ├── ui/                 # Shadcn UI components
│   └── providers/          # React context providers
├── lib/
│   ├── ai/                 # AI provider abstraction
│   ├── db/                 # Prisma client
│   ├── queues/             # BullMQ queue definitions
│   │   └── workers/        # Worker implementations
│   ├── services/           # Business logic services
│   ├── stores/             # Zustand state stores
│   ├── logger/             # Pino logger
│   └── validations/        # Zod schemas
├── workers/                # Worker entry point
└── __tests__/              # Test files
```

## Database Changes

When modifying the database schema:

1. Update `prisma/schema.prisma`
2. Run migration: `pnpm exec prisma migrate dev --name descriptive-name`
3. For pgvector columns, use raw SQL migrations (not supported in Prisma schema)

## Adding Dependencies

- Use `pnpm add <package>` for runtime dependencies
- Use `pnpm add -D <package>` for dev dependencies
- Justify new dependencies in your PR description

## Areas for Contribution

### Good First Issues

Look for issues labeled `good first issue` on GitHub.

### Feature Ideas

- Local Whisper transcription support
- Additional export formats
- Accessibility improvements
- Performance optimizations
- Documentation improvements

### Bug Reports

When reporting bugs, include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, browser)
- Error messages and logs

## Getting Help

- Open an issue for questions
- Check existing issues before creating new ones
- Be respectful and constructive in discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
