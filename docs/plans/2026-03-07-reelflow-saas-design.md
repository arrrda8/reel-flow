# ReelFlow SaaS — Design Document

**Date:** 2026-03-07
**Status:** Approved
**Author:** Erdal Akkoc + Claude

## 1. Overview

ReelFlow is a SaaS platform for AI-powered faceless video creation. Users bring their own API keys (BYOK) for AI providers and walk through a step-by-step wizard to create videos — from idea to export.

**Target:** Content creators, agencies, and marketers who want faceless video content without manual editing.

## 2. Architecture

### 2.1 AI Provider Abstraction Layer

Unified `AIProvider` interface with three LLM implementations:

```typescript
interface AIProvider {
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStructured<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T>;
}
```

Implementations:
- `AnthropicProvider` — Claude API
- `OpenAIProvider` — GPT-4o / GPT-4.1
- `GeminiProvider` — Gemini 2.5 Flash/Pro

Specialized providers (no user choice — one provider per capability):
- `ElevenLabsProvider` — Voice generation
- `NanoBananaProvider` — Image generation (NanoBanana 2 API)
- `KieAIProvider` — Video generation (kie.ai, multiple models)

### 2.2 Key Management

- Users store API keys in Settings → API Keys
- Keys encrypted with AES-256-GCM using `ENCRYPTION_KEY` env var
- Validation on save (test API call to provider)
- Keys never exposed in frontend (masked display: `sk-...abc`)
- Missing key → wizard step shows inline warning + link to Settings

### 2.3 Data Flow

```
User Input → Server Action → AIProviderFactory.create(userPreference)
                                    ↓
                              Decrypt user's API key
                                    ↓
                              Call provider API
                                    ↓
                              Save result to DB + MinIO (if file)
                                    ↓
                              Return to wizard UI
```

Processing happens via server actions (direct calls), not BullMQ workers. The queue system is reserved for long-running tasks (video rendering) where polling/SSE is needed.

## 3. Pipeline (Wizard Steps)

Each step produces output that the user reviews and edits before proceeding. Progress is saved to DB — users can pause and resume.

### Step 1: Idea & Concept
- **Input:** Topic, niche, target audience, tone
- **Process:** LLM generates concept (title, hook, key points, structure)
- **Output:** Editable concept document
- **Provider:** User's selected LLM

### Step 2: Research
- **Input:** Approved concept
- **Process:** LLM generates facts, statistics, talking points
- **Output:** Editable research notes
- **Provider:** User's selected LLM

### Step 3: Script
- **Input:** Concept + Research
- **Process:** LLM writes full script with scene breakdowns
- **Output:** Editable script with scene markers
- **Provider:** User's selected LLM

### Step 4: Voice-Over
- **Input:** Approved script
- **Process:**
  1. Fetch available voices from ElevenLabs API
  2. User selects voice (with preview)
  3. Generate audio from script
- **Output:** Audio file (MP3) with waveform preview
- **Provider:** ElevenLabs

### Step 5: Images
- **Input:** Script scenes
- **Process:**
  1. LLM generates image prompts per scene
  2. NanoBanana 2 generates images
  3. User reviews, can edit prompt and regenerate individual images
- **Output:** Image per scene
- **Provider:** LLM (prompts) + NanoBanana 2 (generation)

### Step 6: Video
- **Input:** Images + Audio
- **Process:**
  1. User selects kie.ai model
  2. Images animated/composed into video scenes
  3. Audio synced with video
- **Output:** Video clips per scene
- **Provider:** kie.ai

### Step 7: Export
- **Input:** All video clips
- **Process:** Final composition, optional adjustments
- **Output:** Downloadable video file + share link

## 4. UI/Design Redesign

### 4.1 Design Principles
- **Clean & Minimal** — generous whitespace, no gradient overload
- **OKLCH color system** — subtle palette with neutrals as base, accent only for CTAs
- **Typography:** Space Grotesk (headings) + Inter (body) — already configured
- **Light Mode default**, Dark Mode as option

### 4.2 Navigation (currently missing)

```
Sidebar:
├── Dashboard (project overview, recent projects)
├── New Project (→ Wizard)
├── Projects (list of all projects with status)
├── Settings
│   ├── API Keys
│   ├── Profile
│   └── Language
└── Admin (admin-only)
    ├── Users
    ├── System Status
    └── Settings
```

### 4.3 Wizard UI
- Card-based layout per step
- Clear visual hierarchy with step progress indicator
- Subtle Framer Motion transitions between steps
- Inline editing with auto-save
- Responsive: works on tablet (768px+), optimized for desktop

## 5. Admin Panel

- **User Management:** List, activate/deactivate users
- **System Status:** Redis, DB, Storage health checks
- **Feature Flags:** Simple toggles (e.g., open/closed registration)
- Access controlled via `ADMIN_EMAILS` env variable
- Intentionally minimal — grows with the product

## 6. i18n

- `next-intl` already configured
- Language switcher in Settings (DE/EN)
- User preference stored in DB
- All UI strings via message files
- LLM-generated content language = user's wizard prompt language

## 7. Pricing Model

- **Phase 1 (now):** BYOK — users provide their own API keys, no cost to us
- **Phase 2 (later):** Credit system — users buy credits, we proxy API calls

## 8. Tech Stack (unchanged)

- Next.js (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Drizzle ORM + PostgreSQL
- NextAuth v5 (JWT)
- MinIO (S3-compatible storage)
- Redis (caching, rate limiting)
- Framer Motion (animations)
- Zustand (client state)
- Deployment: Dokploy on Hetzner

## 9. External API Dependencies

| Provider | Purpose | Auth | Docs |
|----------|---------|------|------|
| Anthropic | LLM (Claude) | API Key | anthropic.com/docs |
| OpenAI | LLM (GPT) | API Key | platform.openai.com |
| Google AI | LLM (Gemini) | API Key | ai.google.dev |
| ElevenLabs | Voice TTS | API Key | elevenlabs.io/docs |
| NanoBanana 2 | Image Gen | API Key | TBD |
| kie.ai | Video Gen | API Key | kie.ai |
