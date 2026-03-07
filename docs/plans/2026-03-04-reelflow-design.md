# ReelFlow — Design Document

**Date:** 2026-03-04
**Status:** Approved

---

## Overview

ReelFlow is a full-stack web platform for creating faceless videos (quote videos, motivational clips, drone footage with voice over). It guides users through a 10-step wizard: from idea → research → script → voice over → image generation → video generation → music → subtitles → final render.

**Key differentiators:**
- Claude Agent SDK powers intelligent research and script generation (trend analysis, virality optimization)
- Multi-provider LLM support (Claude, GPT-4o, Gemini) — user-configurable per task
- Complete video pipeline: ElevenLabs (voice) → Gemini/Nanobanana (images) → Kling (image-to-video) → FFmpeg (final render)
- Self-hosted on Hetzner via Dokploy (Docker Compose)

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router) | SSR, Server Actions, Middleware, ecosystem |
| Language | TypeScript (strict) | No `any` |
| Styling | Tailwind CSS v4 + shadcn/ui (heavily customized) | Dark cinematic theme |
| Animations | Framer Motion | Page transitions, wizard steps, micro-interactions |
| Database | PostgreSQL 16 + Drizzle ORM | Type-safe queries, migrations |
| Auth | Auth.js v5 (NextAuth) | Email/Password + Google OAuth |
| Queue | BullMQ + Redis | Async jobs: rendering, API calls, polling |
| File Storage | MinIO (S3-compatible) | Self-hosted, presigned URLs |
| AI — Agent | Claude Agent SDK (TypeScript) | Research, concept, script generation |
| AI — LLM | Vercel AI SDK (multi-provider) | Unified interface for Claude, GPT-4o, Gemini |
| i18n | next-intl | Routing-based, Server Components support |
| Client State | Zustand | Wizard state, UI state |
| Server State | TanStack Query v5 | Caching, polling (queue status), optimistic updates |
| Icons | Phosphor Icons (duotone) | Cinematic look, distinctive style |
| Headings Font | Space Grotesk | Geometric, modern, cinematic |
| Body Font | Inter | Readability |
| Mono Font | JetBrains Mono | JSON, prompts, technical data |

---

## Infrastructure (Docker Compose on Dokploy/Hetzner)

```
Services:
├── next-app       (Next.js 15, Port 3000)
├── worker         (Node.js + FFmpeg + BullMQ consumer + Agent SDK)
├── postgres       (PostgreSQL 16, Port 5432)
├── redis          (Redis 7, Port 6379)
└── minio          (MinIO, Port 9000/9001)
```

- **next-app**: Handles UI, API routes, Server Actions. Lightweight — no heavy processing.
- **worker**: Consumes BullMQ jobs. Contains FFmpeg binary. Runs Agent SDK agents. Handles all video/audio processing, API calls to external services, and LLM-powered generation.
- Communication between next-app and worker is via Redis (BullMQ queues + SSE for real-time progress).

---

## Database Schema

### Core Tables

**users**
- id, email, password_hash, name, avatar_url, locale (de/en), created_at, updated_at

**projects**
- id, user_id (FK), name, platform (enum: youtube/shorts/reels/tiktok/custom), aspect_ratio, target_duration, style_preset_id (FK), current_step (1-10), status (enum: draft/in_progress/rendering/completed), idea_text, treatment (jsonb), research_report (jsonb), voice_id, voice_settings (jsonb), music_settings (jsonb), subtitle_style (jsonb), render_settings (jsonb), created_at, updated_at

**scenes**
- id, project_id (FK), order_index, narration_text, visual_description, image_prompt, estimated_duration, mood (enum), created_at, updated_at

**voice_overs**
- id, scene_id (FK), file_url, duration_ms, status (enum: pending/processing/completed/failed), cost_cents, created_at

**scene_images**
- id, scene_id (FK), file_url, variant_index, is_selected, prompt_used, status (enum), cost_cents, created_at

**video_clips**
- id, scene_id (FK), file_url, clip_index, duration_ms, status (enum), cost_cents, created_at

### Supporting Tables

**api_keys**
- id, user_id (FK), provider (enum: elevenlabs/gemini/kling/anthropic/openai), encrypted_key (AES-256-GCM), is_valid, last_tested_at

**style_presets**
- id, name, style_prompt, transition_type, subtitle_style (jsonb), is_active, is_custom, created_by (FK nullable)

**music_tracks**
- id, name, file_url, genre, mood, bpm, duration_ms, uploaded_by (FK)

**cost_logs**
- id, user_id (FK), project_id (FK), provider (enum), operation, cost_cents, metadata (jsonb), created_at

---

## Wizard State Machine

10-step wizard with linear progression and backward navigation:

```
Step 1:  Project Setup       → name, platform, aspect_ratio, duration, style_preset
Step 2:  Idea & Concept      → idea text, agent research, confirmed treatment
Step 3:  Script Generation   → confirmed scenes (narration + visual descriptions)
Step 4:  Voice Over          → selected voice, generated audio for all scenes
Step 5:  Image Prompt Review → confirmed prompts (optional, toggle-based)
Step 6:  Image Generation    → selected image variant per scene
Step 7:  Video Generation    → generated video clips for all scenes
Step 8:  Music & Audio       → music assignments, ducking settings
Step 9:  Subtitles           → confirmed subtitles with styling
Step 10: Preview & Render    → final render completed
```

**Rules:**
- Forward: only when current step is complete
- Backward: always allowed
- Edits in earlier steps invalidate dependent later steps (e.g., editing narration → voice over must be regenerated)
- Step 5 is skippable via toggle
- Wizard state persisted in DB (current_step) + client (Zustand for UI state)

---

## Queue Architecture (BullMQ)

| Queue | Purpose | Concurrency | Retry |
|-------|---------|-------------|-------|
| `voice-over` | ElevenLabs TTS per scene | 3 | 3× |
| `image-gen` | Gemini/Nanobanana per scene (2-3 variants) | 5 | 3× |
| `video-gen` | Kling image-to-video per scene | 3 | 2× |
| `research` | Claude Agent SDK (concept research) | 1 | 1× |
| `render` | FFmpeg final assembly | 1 | 2× |

All queues emit progress events via SSE to the frontend. Cost is logged after each job completion.

---

## API Integration Flows

### ElevenLabs (Voice Over)
1. User selects voice from browser (GET /v1/voices)
2. User clicks "Generate" → Server Action → BullMQ `voice-over` job
3. Worker calls POST /v1/text-to-speech/{voice_id} per scene
4. Audio file saved to MinIO, duration extracted, DB updated
5. SSE event → UI updates with play button

### Gemini / Nanobanana (Image Generation)
1. Prompts auto-generated from script + style preset (or manually edited in Step 5)
2. User clicks "Generate" → Server Action → BullMQ `image-gen` jobs (batch)
3. Worker calls Gemini API with Nanobanana JSON format
4. 2-3 variants per scene saved to MinIO, DB updated
5. SSE events → UI shows gallery for selection

### Kling (Image-to-Video)
1. User clicks "Generate Videos" → Server Action → BullMQ `video-gen` jobs
2. Worker sends selected image to Kling API (async)
3. Worker polls for completion
4. If scene > 10s: Frame Continuity Loop (extract last frame → new clip → concat)
5. Video clips saved to MinIO, DB updated
6. SSE events → UI updates

### Claude Agent SDK (Concept & Script)
1. User enters idea + clicks "Start Research"
2. Server Action → BullMQ `research` job
3. Worker starts Agent with tools:
   - `web_search`: Trends, competitors, viral content in niche
   - `analyze_virality`: Hooks, structures, platform-specific patterns
   - `generate_treatment`: Structured concept from research
   - `generate_script`: Scene-based JSON script
4. Agent streams progress → SSE → UI shows real-time updates
5. Research report + treatment saved to DB

### Multi-Provider LLM
- Users configure preferred provider per task type in Settings
- Vercel AI SDK provides unified interface
- Agent SDK always uses Claude (Anthropic API key required)
- Image prompts, subtitle generation etc. can use any configured provider

---

## Visual Design: "Dark Cinema"

### Color Palette
```
Background:     #08080F   (Deep Space)
Surface:        #111119   (Elevated panels)
Card:           #1A1A28   (Cards, Inputs, Sidebars)
Border:         #2A2A3C   (Subtle borders)

Primary:        #8B5CF6   (Electric Violet)
Primary Glow:   #8B5CF620 (Hover effects)
Secondary:      #06B6D4   (Cyan)

Text Primary:   #E8E8F0   (Off-white)
Text Secondary: #7B7B96   (Muted)
Text Tertiary:  #4A4A64   (Disabled)

Success:        #10B981   (Emerald)
Warning:        #F59E0B   (Amber)
Error:          #EF4444   (Red)
```

### Layout
- **Top Bar**: Logo, navigation, project name, user menu
- **Step Rail** (left): Vertical step navigation with Phosphor Duotone icons. Active step: violet highlight. Completed: cyan checkmark. Clickable for backward navigation.
- **Content Area** (center): Step-specific content with Framer Motion transitions
- **Action Bar** (bottom): Contextual actions (Next, Generate, Render)

### Key Screens
1. **Dashboard**: Project grid with thumbnails, status badges, platform icons. Empty state with film reel illustration.
2. **Step 2 — Idea**: Large text input, "Start Research" button, live progress, research report card, editable treatment.
3. **Step 3 — Script Editor**: Split view (scene list left, editor right), drag & drop reordering, JSON preview toggle.
4. **Step 4 — Voice Over**: Voice browser grid with preview, scene list with play/regenerate, waveform visualization.
5. **Step 6 — Images**: Variant gallery per scene, click to select (violet border), inline prompt editor for regeneration.
6. **Step 10 — Render**: Video player with custom dark controls, timeline with scene markers, export panel, render progress bar.

### Animations & Interactions
- Page transitions: Framer Motion slide + fade between wizard steps
- Card hover: scale(1.02) + violet glow border
- Button press: scale(0.97)
- Loading: Skeleton screens matching content layout
- Toast notifications: Slide-in from top-right
- Drag & drop: Spring animations for scene reordering
- All animations respect `prefers-reduced-motion`

---

## Security

| Area | Measure |
|------|---------|
| API Keys | AES-256-GCM encrypted in DB, encryption key in ENV |
| Auth | Argon2 password hashing, HTTP-only Secure cookies, CSRF tokens |
| API Routes | Rate limiting (in-memory or Upstash), Zod input validation, auth middleware |
| File Upload | Type whitelist (audio/video/image), size limits |
| HTTP Headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| Database | Parameterized queries (Drizzle), row-level filtering per user |
| MinIO | Presigned URLs (time-limited), no public buckets |
| Secrets | .env never in git, Docker secrets in production |

---

## Cost Tracking

- Every API call logged after completion: provider, operation, tokens/seconds/images, cost in cents
- Admin dashboard: costs per project, per provider, over time
- Pre-generation cost estimate shown (based on scene count × average cost)

---

## i18n (Internationalization)

- next-intl with routing-based locale detection
- Two locales: `de` (German, default) and `en` (English)
- Language switcher in top bar
- All UI strings in translation files
- User locale preference saved in DB

---

## User Model

- Multi-user with authentication
- Email/Password + Google OAuth (Auth.js v5)
- Each user sees only their own projects and API keys
- Admin features (music library management, style presets) available to all users for their own content
