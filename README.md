# ReelFlow

AI-powered faceless video creation platform. From idea to export in minutes.

## Features

- **10-Step Video Wizard** -- Guided workflow from concept to final render
- **AI Script Generation** -- Generate scripts and storyboards from a simple idea
- **AI Voice Over** -- Text-to-speech with multiple voice options
- **AI Image Generation** -- Scene-by-scene image creation with variant selection
- **Image-to-Video** -- Transform still images into video clips
- **Music & Sound** -- Background music selection and audio configuration
- **Subtitle Styling** -- Configurable subtitle font, color, position, and animation
- **Real-Time Preview** -- Timeline-based preview with audio and effects
- **Render & Export** -- Final render with download and platform publishing
- **User Dashboard** -- Project management with cards and quick actions
- **Settings & API Keys** -- Encrypted storage for third-party API keys
- **Admin Panel** -- User management and platform usage overview
- **Google OAuth & Credentials Auth** -- Flexible authentication options

## Tech Stack

| Layer          | Technology                                         |
| -------------- | -------------------------------------------------- |
| Framework      | Next.js 15 (App Router)                            |
| Language       | TypeScript                                         |
| Styling        | Tailwind CSS v4, Dark Cinema theme                 |
| UI Components  | shadcn/ui, Radix UI                                |
| Icons          | Phosphor Icons (duotone)                           |
| Fonts          | Space Grotesk (headings), Inter (body)             |
| Auth           | Auth.js v5 (credentials + Google OAuth)            |
| Database       | PostgreSQL 16                                      |
| ORM            | Drizzle ORM                                        |
| Queue          | BullMQ + Redis 7                                   |
| Object Storage | MinIO (S3-compatible)                              |
| State          | Zustand, React Query                               |
| Animations     | Framer Motion                                      |
| Validation     | Zod                                                |
| Containerized  | Docker Compose                                     |

## Prerequisites

- **Node.js** >= 18
- **Docker** and **Docker Compose**
- **npm** (or your preferred package manager)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd reel-flow
   ```

2. **Copy environment variables**

   ```bash
   cp .env.example .env.local
   ```

3. **Generate secrets**

   ```bash
   # AUTH_SECRET
   openssl rand -hex 32

   # ENCRYPTION_KEY
   openssl rand -hex 32
   ```

   Paste the generated values into `.env.local` for `AUTH_SECRET` and `ENCRYPTION_KEY`.

4. **Start infrastructure services**

   ```bash
   docker compose up -d
   ```

   This starts PostgreSQL, Redis, and MinIO.

5. **Install dependencies**

   ```bash
   npm install
   ```

6. **Push database schema**

   ```bash
   npm run db:push
   ```

7. **Seed the database** (optional)

   ```bash
   npm run db:seed
   ```

8. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/
    (app)/             # Authenticated app routes
      dashboard/       # Project dashboard
      project/[id]/    # Project wizard view
      settings/        # User settings & API keys
      admin/           # Admin panel
    (auth)/            # Auth routes (login, register)
    api/               # API routes (auth, SSE events)
    layout.tsx         # Root layout with metadata
    not-found.tsx      # Custom 404 page
    error.tsx          # Custom error page
    loading.tsx        # Root loading state
    robots.ts          # Robots.txt generation
    sitemap.ts         # Sitemap generation
  components/
    layout/            # Top bar, action bar, step rail
    projects/          # Project cards, empty state, create dialog
    ui/                # shadcn/ui components
    wizard/            # Wizard shell, step content, step components
      steps/           # Individual step components (10 steps)
  db/
    index.ts           # Drizzle database client
    schema.ts          # Database schema (Drizzle)
    seed.ts            # Database seeder
  hooks/               # Custom React hooks
  i18n/                # Internationalization config
  lib/
    auth.ts            # Auth.js configuration
    auth.config.ts     # Auth providers config
    auth-actions.ts    # Server actions (register)
    encryption.ts      # API key encryption utilities
    project-actions.ts # Project CRUD server actions
    settings-actions.ts# Settings server actions
    queue.ts           # BullMQ queue setup
    storage.ts         # MinIO storage client
    wizard-steps.ts    # Wizard step definitions
    utils.ts           # Shared utilities
  stores/
    wizard-store.ts    # Zustand wizard state
  worker/
    index.ts           # BullMQ worker entry
    processors/        # Job processors (image-gen, render, etc.)
  middleware.ts        # Auth middleware
```

## Available Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start development server             |
| `npm run build`      | Build for production                 |
| `npm run start`      | Start production server              |
| `npm run lint`       | Run ESLint                           |
| `npm run db:generate`| Generate Drizzle migrations          |
| `npm run db:migrate` | Run Drizzle migrations               |
| `npm run db:push`    | Push schema directly (dev)           |
| `npm run db:studio`  | Open Drizzle Studio                  |
| `npm run db:seed`    | Seed database with sample data       |

## Environment Variables

| Variable              | Required | Description                                      |
| --------------------- | -------- | ------------------------------------------------ |
| `DATABASE_URL`        | Yes      | PostgreSQL connection string                     |
| `AUTH_SECRET`         | Yes      | Auth.js session secret (`openssl rand -hex 32`)  |
| `AUTH_URL`            | Yes      | Application URL for auth callbacks               |
| `REDIS_URL`           | Yes      | Redis connection string                          |
| `MINIO_ENDPOINT`      | Yes      | MinIO server hostname                            |
| `MINIO_PORT`          | Yes      | MinIO server port                                |
| `MINIO_USE_SSL`       | No       | Use SSL for MinIO (default: false)               |
| `MINIO_ACCESS_KEY`    | Yes      | MinIO access key                                 |
| `MINIO_SECRET_KEY`    | Yes      | MinIO secret key                                 |
| `MINIO_BUCKET`        | Yes      | MinIO bucket name                                |
| `ENCRYPTION_KEY`      | Yes      | Key for encrypting stored API keys               |
| `AUTH_GOOGLE_ID`      | No       | Google OAuth client ID                           |
| `AUTH_GOOGLE_SECRET`  | No       | Google OAuth client secret                       |
| `ANTHROPIC_API_KEY`   | No       | Anthropic API key (or set via Settings UI)       |
| `OPENAI_API_KEY`      | No       | OpenAI API key (or set via Settings UI)          |
| `GOOGLE_AI_API_KEY`   | No       | Google AI API key (or set via Settings UI)       |
| `ELEVENLABS_API_KEY`  | No       | ElevenLabs API key (or set via Settings UI)      |
| `NEXT_PUBLIC_APP_URL` | No       | Public app URL (default: http://localhost:3000)   |

## Architecture

ReelFlow uses a **10-step wizard** to guide users through the video creation process:

1. **Project Setup** -- Configure project name, target platform, duration, and style preset
2. **Idea & Concept** -- Enter a video idea; AI researches and generates a structured concept
3. **Script & Storyboard** -- AI generates a scene-by-scene script with editable storyboard
4. **Voice Over** -- Select a voice and generate AI text-to-speech for each scene
5. **Image Generation** -- AI generates images per scene with multiple variants to choose from
6. **Video Generation** -- Transform selected images into video clips via image-to-video AI
7. **Music & Sound** -- Select background music and configure audio mix settings
8. **Subtitles** -- Configure subtitle styling, font, color, position, and animation
9. **Preview** -- Full timeline-based preview with all audio tracks and effects
10. **Render & Export** -- Final render with download or direct platform publishing

Background jobs (voice synthesis, image generation, video rendering) are processed by a BullMQ worker connected to Redis. Generated assets are stored in MinIO (S3-compatible object storage). All AI provider API keys can be configured per-user through the Settings page and are encrypted at rest.

## Docker Services

| Service    | Image              | Port(s)     | Purpose                  |
| ---------- | ------------------ | ----------- | ------------------------ |
| `postgres` | postgres:16-alpine | 5432        | Primary database         |
| `redis`    | redis:7-alpine     | 6379        | Job queue & caching      |
| `minio`    | minio/minio:latest | 9000, 9001  | Object storage (assets)  |

## License

This project is private and not licensed for public distribution.
