# ReelFlow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete faceless video creation platform with 10-step wizard, Claude Agent SDK research, multi-provider LLM, and Docker-based self-hosted deployment.

**Architecture:** Next.js 15 monolith (App Router) + separate Worker service for FFmpeg/BullMQ. PostgreSQL + Drizzle ORM for persistence, Redis + BullMQ for job queues, MinIO for file storage. Claude Agent SDK in Worker for intelligent research & script generation.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui (customized), Framer Motion, Drizzle ORM, PostgreSQL 16, Redis 7, BullMQ, MinIO, Auth.js v5, next-intl, Zustand, TanStack Query v5, Phosphor Icons, Space Grotesk + Inter + JetBrains Mono, Vercel AI SDK, Claude Agent SDK, FFmpeg.

**Design Reference:** `docs/plans/2026-03-04-reelflow-design.md`

---

## Milestone 1: Foundation (Scaffold, Docker, DB, Auth, Design System)

### Task 1: Initialize Next.js 15 Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.gitignore`

**Step 1: Create Next.js 15 project**

```bash
cd /Users/ardo/Desktop/Reel-Flow
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

Select: Yes to all defaults. App Router, src/ directory, import alias @/*.

**Step 2: Install core dependencies**

```bash
npm install drizzle-orm postgres dotenv zustand @tanstack/react-query framer-motion @phosphor-icons/react next-intl next-themes zod
npm install -D drizzle-kit @types/node tsx
```

**Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables: yes. Then customize in Step 4.

**Step 4: Configure tailwind.config.ts with Dark Cinema theme**

Replace the generated config with the Dark Cinema color palette:

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#08080F",
        surface: "#111119",
        card: "#1A1A28",
        border: "#2A2A3C",
        primary: {
          DEFAULT: "#8B5CF6",
          glow: "rgba(139, 92, 246, 0.125)",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#06B6D4",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#7B7B96",
          foreground: "#4A4A64",
        },
        foreground: "#E8E8F0",
        success: "#10B981",
        warning: "#F59E0B",
        destructive: "#EF4444",
      },
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

**Step 5: Configure global CSS**

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

@layer base {
  :root {
    --background: 240 33% 3%;
    --foreground: 240 20% 93%;
    --card: 240 18% 13%;
    --card-foreground: 240 20% 93%;
    --primary: 263 90% 66%;
    --primary-foreground: 0 0% 100%;
    --secondary: 187 94% 43%;
    --secondary-foreground: 0 0% 100%;
    --muted: 245 10% 53%;
    --muted-foreground: 245 15% 34%;
    --border: 245 17% 20%;
    --ring: 263 90% 66%;
    --radius: 0.625rem;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-body antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-heading;
  }
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 15 project with Dark Cinema theme"
```

---

### Task 2: Docker Compose Setup

**Files:**
- Create: `docker-compose.yml`, `Dockerfile`, `Dockerfile.worker`, `.dockerignore`, `.env.example`, `.env.development`

**Step 1: Create docker-compose.yml**

```yaml
# docker-compose.yml
services:
  next-app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://reelflow:reelflow@postgres:5432/reelflow
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=reelflow
      - MINIO_SECRET_KEY=reelflow123
      - MINIO_BUCKET=reelflow-assets
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    volumes:
      - ./src:/app/src
    env_file:
      - .env.development

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - DATABASE_URL=postgresql://reelflow:reelflow@postgres:5432/reelflow
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=reelflow
      - MINIO_SECRET_KEY=reelflow123
      - MINIO_BUCKET=reelflow-assets
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    env_file:
      - .env.development

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: reelflow
      POSTGRES_PASSWORD: reelflow
      POSTGRES_DB: reelflow
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U reelflow"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: reelflow
      MINIO_ROOT_PASSWORD: reelflow123
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"

volumes:
  pgdata:
  redisdata:
  miniodata:
```

**Step 2: Create Dockerfile (Next.js app)**

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

**Step 3: Create Dockerfile.worker**

```dockerfile
# Dockerfile.worker
FROM node:20-alpine AS base

RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production
CMD ["node", "--import", "tsx/esm", "src/worker/index.ts"]
```

**Step 4: Create .env.example and .env.development**

```env
# .env.example
# Database
DATABASE_URL=postgresql://reelflow:reelflow@localhost:5432/reelflow

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=reelflow
MINIO_SECRET_KEY=reelflow123
MINIO_BUCKET=reelflow-assets
MINIO_USE_SSL=false

# Auth
AUTH_SECRET=generate-a-secret-here
AUTH_URL=http://localhost:3000

# Encryption (for API keys at rest)
ENCRYPTION_KEY=generate-32-byte-hex-key

# External APIs (users configure these in the app)
# ELEVENLABS_API_KEY=
# GEMINI_API_KEY=
# KLING_API_KEY=
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
```

Copy `.env.example` to `.env.development` with dev values filled in.

**Step 5: Create .dockerignore**

```
node_modules
.next
.git
*.md
docs
```

**Step 6: Update next.config.ts for standalone output**

```ts
// next.config.ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withNextIntl(nextConfig);
```

**Step 7: Commit**

```bash
git add docker-compose.yml Dockerfile Dockerfile.worker .dockerignore .env.example .env.development next.config.ts
git commit -m "feat: add Docker Compose setup (postgres, redis, minio, worker)"
```

---

### Task 3: Database Schema with Drizzle ORM

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `src/db/seed.ts`

**Step 1: Create drizzle.config.ts**

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 2: Create the full database schema**

```ts
// src/db/schema.ts
import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  pgEnum,
  serial,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const platformEnum = pgEnum("platform", [
  "youtube",
  "shorts",
  "reels",
  "tiktok",
  "custom",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "in_progress",
  "rendering",
  "completed",
]);

export const moodEnum = pgEnum("mood", [
  "motivating",
  "informative",
  "dramatic",
  "calm",
  "energetic",
  "melancholic",
  "mysterious",
  "uplifting",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const apiProviderEnum = pgEnum("api_provider", [
  "elevenlabs",
  "gemini",
  "kling",
  "anthropic",
  "openai",
]);

export const localeEnum = pgEnum("locale", ["de", "en"]);

// Users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  locale: localeEnum("locale").default("de").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// API Keys (encrypted)
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    provider: apiProviderEnum("provider").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    iv: text("iv").notNull(),
    isValid: boolean("is_valid").default(false),
    lastTestedAt: timestamp("last_tested_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("api_keys_user_provider_idx").on(table.userId, table.provider),
  ]
);

// Style Presets
export const stylePresets = pgTable("style_presets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  stylePrompt: text("style_prompt").notNull(),
  transitionType: varchar("transition_type", { length: 50 }).default("fade").notNull(),
  subtitleStyle: jsonb("subtitle_style").$type<{
    fontFamily: string;
    fontSize: number;
    color: string;
    position: "bottom" | "center" | "top";
    background: "transparent" | "semi-transparent" | "solid";
    animation: "word-highlight" | "fade-in" | "none";
  }>(),
  isActive: boolean("is_active").default(true).notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Projects
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    platform: platformEnum("platform").notNull(),
    aspectRatio: varchar("aspect_ratio", { length: 10 }).notNull(), // e.g. "16:9", "9:16"
    targetDuration: integer("target_duration").notNull(), // seconds
    stylePresetId: uuid("style_preset_id").references(() => stylePresets.id),
    currentStep: integer("current_step").default(1).notNull(),
    status: projectStatusEnum("status").default("draft").notNull(),
    ideaText: text("idea_text"),
    treatment: jsonb("treatment"),
    researchReport: jsonb("research_report"),
    voiceId: varchar("voice_id", { length: 255 }),
    voiceSettings: jsonb("voice_settings").$type<{
      stability: number;
      similarityBoost: number;
      style: number;
      speakerBoost: boolean;
    }>(),
    musicSettings: jsonb("music_settings").$type<{
      globalTrackId: string | null;
      duckingLevel: number; // 0-1
      musicVolume: number; // 0-1
      voiceVolume: number; // 0-1
    }>(),
    subtitleStyle: jsonb("subtitle_style").$type<{
      fontFamily: string;
      fontSize: number;
      color: string;
      position: "bottom" | "center" | "top";
      background: "transparent" | "semi-transparent" | "solid";
      animation: "word-highlight" | "fade-in" | "none";
    }>(),
    renderSettings: jsonb("render_settings").$type<{
      quality: "720p" | "1080p" | "4k";
      format: "mp4" | "webm";
      transition: "cut" | "fade" | "crossfade";
    }>(),
    promptReviewEnabled: boolean("prompt_review_enabled").default(false).notNull(),
    llmProvider: apiProviderEnum("llm_provider").default("anthropic"),
    thumbnailUrl: text("thumbnail_url"),
    finalVideoUrl: text("final_video_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("projects_user_idx").on(table.userId),
    index("projects_status_idx").on(table.status),
  ]
);

// Scenes
export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    orderIndex: integer("order_index").notNull(),
    narrationText: text("narration_text").notNull(),
    visualDescription: text("visual_description").notNull(),
    imagePrompt: text("image_prompt"),
    estimatedDuration: integer("estimated_duration"), // seconds
    mood: moodEnum("mood").default("calm"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("scenes_project_idx").on(table.projectId),
    index("scenes_order_idx").on(table.projectId, table.orderIndex),
  ]
);

// Voice Overs
export const voiceOvers = pgTable(
  "voice_overs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sceneId: uuid("scene_id")
      .references(() => scenes.id, { onDelete: "cascade" })
      .notNull(),
    fileUrl: text("file_url"),
    durationMs: integer("duration_ms"),
    status: assetStatusEnum("status").default("pending").notNull(),
    costCents: integer("cost_cents"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("voice_overs_scene_idx").on(table.sceneId)]
);

// Scene Images
export const sceneImages = pgTable(
  "scene_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sceneId: uuid("scene_id")
      .references(() => scenes.id, { onDelete: "cascade" })
      .notNull(),
    fileUrl: text("file_url"),
    variantIndex: integer("variant_index").notNull(),
    isSelected: boolean("is_selected").default(false).notNull(),
    promptUsed: text("prompt_used"),
    status: assetStatusEnum("status").default("pending").notNull(),
    costCents: integer("cost_cents"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("scene_images_scene_idx").on(table.sceneId)]
);

// Video Clips
export const videoClips = pgTable(
  "video_clips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sceneId: uuid("scene_id")
      .references(() => scenes.id, { onDelete: "cascade" })
      .notNull(),
    fileUrl: text("file_url"),
    clipIndex: integer("clip_index").notNull(),
    durationMs: integer("duration_ms"),
    status: assetStatusEnum("status").default("pending").notNull(),
    costCents: integer("cost_cents"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("video_clips_scene_idx").on(table.sceneId)]
);

// Music Tracks
export const musicTracks = pgTable("music_tracks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  genre: varchar("genre", { length: 100 }),
  mood: varchar("mood", { length: 100 }),
  bpm: integer("bpm"),
  durationMs: integer("duration_ms"),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Scene Music (per-scene music assignment)
export const sceneMusic = pgTable("scene_music", {
  id: uuid("id").defaultRandom().primaryKey(),
  sceneId: uuid("scene_id")
    .references(() => scenes.id, { onDelete: "cascade" })
    .notNull(),
  trackId: uuid("track_id")
    .references(() => musicTracks.id, { onDelete: "cascade" })
    .notNull(),
  volume: integer("volume").default(50).notNull(), // 0-100
  fadeIn: boolean("fade_in").default(false).notNull(),
  fadeOut: boolean("fade_out").default(false).notNull(),
});

// Cost Logs
export const costLogs = pgTable(
  "cost_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    provider: apiProviderEnum("provider").notNull(),
    operation: varchar("operation", { length: 100 }).notNull(),
    costCents: integer("cost_cents").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cost_logs_user_idx").on(table.userId),
    index("cost_logs_project_idx").on(table.projectId),
  ]
);

// Jobs (for UI progress tracking)
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 50 }).notNull(), // voice-over, image-gen, video-gen, research, render
    status: assetStatusEnum("status").default("pending").notNull(),
    progress: integer("progress").default(0).notNull(), // 0-100
    result: jsonb("result"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("jobs_project_idx").on(table.projectId),
    index("jobs_status_idx").on(table.status),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  apiKeys: many(apiKeys),
  costLogs: many(costLogs),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  stylePreset: one(stylePresets, { fields: [projects.stylePresetId], references: [stylePresets.id] }),
  scenes: many(scenes),
  costLogs: many(costLogs),
  jobs: many(jobs),
}));

export const scenesRelations = relations(scenes, ({ one, many }) => ({
  project: one(projects, { fields: [scenes.projectId], references: [projects.id] }),
  voiceOvers: many(voiceOvers),
  images: many(sceneImages),
  videoClips: many(videoClips),
  music: many(sceneMusic),
}));

export const voiceOversRelations = relations(voiceOvers, ({ one }) => ({
  scene: one(scenes, { fields: [voiceOvers.sceneId], references: [scenes.id] }),
}));

export const sceneImagesRelations = relations(sceneImages, ({ one }) => ({
  scene: one(scenes, { fields: [sceneImages.sceneId], references: [scenes.id] }),
}));

export const videoClipsRelations = relations(videoClips, ({ one }) => ({
  scene: one(scenes, { fields: [videoClips.sceneId], references: [scenes.id] }),
}));
```

**Step 3: Create database connection**

```ts
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

**Step 4: Generate and run initial migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

**Step 5: Create seed script with default style presets**

```ts
// src/db/seed.ts
import { db } from "./index";
import { stylePresets } from "./schema";

const defaultPresets = [
  {
    name: "Cinematic",
    nameEn: "Cinematic",
    stylePrompt: "Cinematic look, film-like color grading, dramatic lighting, shallow depth of field, letterbox framing, golden hour warmth, lens flare, 35mm film aesthetic",
    transitionType: "crossfade",
    subtitleStyle: {
      fontFamily: "Inter",
      fontSize: 24,
      color: "#FFFFFF",
      position: "bottom" as const,
      background: "semi-transparent" as const,
      animation: "fade-in" as const,
    },
  },
  {
    name: "Minimalistisch",
    nameEn: "Minimalist",
    stylePrompt: "Clean minimalist aesthetic, lots of white space, soft neutral tones, simple geometric shapes, muted colors, elegant simplicity, zen-like composition",
    transitionType: "fade",
    subtitleStyle: {
      fontFamily: "Inter",
      fontSize: 22,
      color: "#1A1A28",
      position: "bottom" as const,
      background: "transparent" as const,
      animation: "fade-in" as const,
    },
  },
  {
    name: "Dark & Moody",
    nameEn: "Dark & Moody",
    stylePrompt: "Dark moody atmosphere, high contrast, deep shadows, dramatic chiaroscuro lighting, rich dark tones, mysterious ambiance, noir-inspired",
    transitionType: "fade",
    subtitleStyle: {
      fontFamily: "Inter",
      fontSize: 24,
      color: "#E8E8F0",
      position: "bottom" as const,
      background: "semi-transparent" as const,
      animation: "word-highlight" as const,
    },
  },
  {
    name: "Natur-Dokumentation",
    nameEn: "Nature Documentary",
    stylePrompt: "Natural documentary style, vivid natural colors, soft golden light, macro detail, wide landscape shots, National Geographic quality, organic textures",
    transitionType: "crossfade",
    subtitleStyle: {
      fontFamily: "Inter",
      fontSize: 22,
      color: "#FFFFFF",
      position: "bottom" as const,
      background: "semi-transparent" as const,
      animation: "fade-in" as const,
    },
  },
  {
    name: "Neon / Cyberpunk",
    nameEn: "Neon / Cyberpunk",
    stylePrompt: "Neon cyberpunk aesthetic, glowing neon lights, purple and cyan color palette, futuristic urban environment, rain-slicked streets, holographic effects, Blade Runner inspired",
    transitionType: "cut",
    subtitleStyle: {
      fontFamily: "JetBrains Mono",
      fontSize: 20,
      color: "#06B6D4",
      position: "bottom" as const,
      background: "solid" as const,
      animation: "word-highlight" as const,
    },
  },
  {
    name: "Vintage / Retro",
    nameEn: "Vintage / Retro",
    stylePrompt: "Vintage retro aesthetic, film grain, warm faded tones, vignette effect, 1970s color palette, nostalgic atmosphere, analog photography feel, light leaks",
    transitionType: "fade",
    subtitleStyle: {
      fontFamily: "Inter",
      fontSize: 22,
      color: "#F5E6D3",
      position: "bottom" as const,
      background: "transparent" as const,
      animation: "fade-in" as const,
    },
  },
  {
    name: "Abstrakt / Künstlerisch",
    nameEn: "Abstract / Artistic",
    stylePrompt: "Abstract artistic interpretation, bold brush strokes, vivid colors, mixed media collage, expressionist style, creative composition, artistic freedom, gallery-worthy",
    transitionType: "cut",
    subtitleStyle: {
      fontFamily: "Space Grotesk",
      fontSize: 26,
      color: "#FFFFFF",
      position: "center" as const,
      background: "transparent" as const,
      animation: "word-highlight" as const,
    },
  },
];

async function seed() {
  console.log("Seeding style presets...");
  for (const preset of defaultPresets) {
    await db.insert(stylePresets).values(preset).onConflictDoNothing();
  }
  console.log("Seed complete.");
  process.exit(0);
}

seed();
```

**Step 6: Add scripts to package.json**

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

**Step 7: Commit**

```bash
git add src/db/ drizzle.config.ts package.json
git commit -m "feat: add database schema with Drizzle ORM (users, projects, scenes, assets)"
```

---

### Task 4: Authentication with Auth.js v5

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/middleware.ts`, `src/lib/auth-actions.ts`

**Step 1: Install auth dependencies**

```bash
npm install next-auth@beta @auth/drizzle-adapter argon2
```

**Step 2: Create auth config**

```ts
// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
        });
        if (!user) return null;

        const valid = await argon2.verify(user.passwordHash, parsed.data.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
```

**Step 3: Create auth API route**

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

**Step 4: Create registration server action**

```ts
// src/lib/auth-actions.ts
"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import argon2 from "argon2";
import { z } from "zod";
import { eq } from "drizzle-orm";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function register(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Ungültige Eingaben." };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });

  if (existing) {
    return { error: "E-Mail bereits registriert." };
  }

  const passwordHash = await argon2.hash(parsed.data.password);

  await db.insert(users).values({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
  });

  return { success: true };
}
```

**Step 5: Create middleware for route protection**

```ts
// src/middleware.ts
import { auth } from "@/lib/auth";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ["de", "en"],
  defaultLocale: "de",
});

const publicPaths = ["/login", "/register", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return intlMiddleware(req);
  }

  // Require auth for all other paths
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!_next|api/auth|favicon.ico|.*\\..*).*)"],
};
```

**Step 6: Create login and register pages (basic — styled in Task 5)**

Create basic functional login and register pages using shadcn/ui form components. Include email/password fields, form validation with Zod, error display, and links between login/register.

**Step 7: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-actions.ts src/app/api/auth/ src/app/\(auth\)/ src/middleware.ts
git commit -m "feat: add authentication with Auth.js v5 (credentials + Google)"
```

---

### Task 5: Base Layout & Design System Components

**Files:**
- Create: `src/components/ui/` (customize shadcn components), `src/app/(app)/layout.tsx`, `src/components/layout/top-bar.tsx`, `src/components/layout/step-rail.tsx`, `src/components/layout/action-bar.tsx`

**Step 1: Customize shadcn/ui components for Dark Cinema**

Install required shadcn components:

```bash
npx shadcn@latest add button card input label dialog dropdown-menu avatar badge skeleton tabs tooltip toast sonner separator scroll-area select switch slider progress
```

Override the theme in `src/app/globals.css` to use the Dark Cinema palette (already done in Task 1). Customize each component's border-radius, shadow, and hover states to match the cinematic aesthetic — no default shadcn look.

**Step 2: Create TopBar component**

```tsx
// src/components/layout/top-bar.tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  FilmReel,
  GearSix,
  SignOut,
  Translate,
} from "@phosphor-icons/react/dist/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocale, useTranslations } from "next-intl";

export function TopBar({ projectName }: { projectName?: string }) {
  const { data: session } = useSession();
  const t = useTranslations("layout");
  const locale = useLocale();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <FilmReel size={28} weight="duotone" />
          <span className="font-heading text-lg font-bold">ReelFlow</span>
        </Link>
        {projectName && (
          <>
            <span className="text-muted">/</span>
            <span className="text-sm text-foreground">{projectName}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted hover:text-foreground transition-colors">
              <Translate size={18} weight="duotone" />
              {locale.toUpperCase()}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href="/de" locale="de">Deutsch</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/en" locale="en">English</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer border border-border hover:border-primary transition-colors">
              <AvatarFallback className="bg-card text-sm">
                {session?.user?.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <GearSix size={16} weight="duotone" />
                {t("settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => signOut()}
              className="flex items-center gap-2 text-destructive"
            >
              <SignOut size={16} weight="duotone" />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

**Step 3: Create StepRail component**

```tsx
// src/components/layout/step-rail.tsx
"use client";

import { cn } from "@/lib/utils";
import {
  Gear,
  Lightbulb,
  NotePencil,
  Microphone,
  ImageSquare,
  Images,
  FilmStrip,
  MusicNotes,
  Subtitles,
  Play,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";

const steps = [
  { number: 1, icon: Gear, labelKey: "setup" },
  { number: 2, icon: Lightbulb, labelKey: "idea" },
  { number: 3, icon: NotePencil, labelKey: "script" },
  { number: 4, icon: Microphone, labelKey: "voiceOver" },
  { number: 5, icon: ImageSquare, labelKey: "promptReview" },
  { number: 6, icon: Images, labelKey: "imageGen" },
  { number: 7, icon: FilmStrip, labelKey: "videoGen" },
  { number: 8, icon: MusicNotes, labelKey: "music" },
  { number: 9, icon: Subtitles, labelKey: "subtitles" },
  { number: 10, icon: Play, labelKey: "render" },
];

interface StepRailProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
  promptReviewEnabled: boolean;
}

export function StepRail({
  currentStep,
  completedSteps,
  onStepClick,
  promptReviewEnabled,
}: StepRailProps) {
  return (
    <nav className="flex w-16 flex-col items-center gap-1 border-r border-border bg-surface py-4">
      {steps.map((step) => {
        if (step.number === 5 && !promptReviewEnabled) return null;

        const isActive = step.number === currentStep;
        const isCompleted = completedSteps.includes(step.number);
        const isClickable = isCompleted || step.number <= currentStep;
        const Icon = step.icon;

        return (
          <button
            key={step.number}
            onClick={() => isClickable && onStepClick(step.number)}
            disabled={!isClickable}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
              isActive && "bg-primary/20 text-primary",
              isCompleted && !isActive && "text-secondary",
              !isActive && !isCompleted && "text-muted-foreground",
              isClickable && "cursor-pointer hover:bg-card",
              !isClickable && "cursor-not-allowed opacity-40"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="step-indicator"
                className="absolute inset-0 rounded-lg border border-primary/50 bg-primary/10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <Icon size={20} weight="duotone" className="relative z-10" />
          </button>
        );
      })}
    </nav>
  );
}
```

**Step 4: Create app layout with TopBar + StepRail**

```tsx
// src/app/(app)/layout.tsx
import { TopBar } from "@/components/layout/top-bar";
import { SessionProvider } from "next-auth/react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex h-screen flex-col bg-background">
        <TopBar />
        <main className="flex flex-1 overflow-hidden">{children}</main>
      </div>
    </SessionProvider>
  );
}
```

**Step 5: Create i18n message files**

Create `src/messages/de.json` and `src/messages/en.json` with the basic layout strings (settings, signOut, step labels, etc.).

**Step 6: Commit**

```bash
git add src/components/ src/app/\(app\)/ src/messages/
git commit -m "feat: add base layout with TopBar, StepRail, and Dark Cinema design system"
```

---

### Task 6: MinIO Client & File Upload Utilities

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/encryption.ts`

**Step 1: Install MinIO client**

```bash
npm install minio
```

**Step 2: Create storage utility**

```ts
// src/lib/storage.ts
import * as Minio from "minio";

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT!),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

const BUCKET = process.env.MINIO_BUCKET!;

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
  }
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await ensureBucket();
  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });
  return key;
}

export async function getPresignedUrl(
  key: string,
  expirySeconds = 3600
): Promise<string> {
  return minioClient.presignedGetObject(BUCKET, key, expirySeconds);
}

export async function deleteFile(key: string): Promise<void> {
  await minioClient.removeObject(BUCKET, key);
}

export { minioClient, BUCKET };
```

**Step 3: Create encryption utility for API keys**

```ts
// src/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

export function encrypt(text: string): { encrypted: string; iv: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    encrypted: encrypted + ":" + authTag,
    iv: iv.toString("hex"),
  };
}

export function decrypt(encrypted: string, iv: string): string {
  const [encryptedData, authTag] = encrypted.split(":");
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

**Step 4: Commit**

```bash
git add src/lib/storage.ts src/lib/encryption.ts
git commit -m "feat: add MinIO storage client and AES-256-GCM encryption utility"
```

---

### Task 7: BullMQ Queue Setup & Worker Entry Point

**Files:**
- Create: `src/lib/queue.ts`, `src/worker/index.ts`, `src/worker/processors/index.ts`

**Step 1: Install BullMQ**

```bash
npm install bullmq ioredis
```

**Step 2: Create queue definitions (shared between app and worker)**

```ts
// src/lib/queue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const voiceOverQueue = new Queue("voice-over", { connection });
export const imageGenQueue = new Queue("image-gen", { connection });
export const videoGenQueue = new Queue("video-gen", { connection });
export const researchQueue = new Queue("research", { connection });
export const renderQueue = new Queue("render", { connection });

export type VoiceOverJobData = {
  sceneId: string;
  projectId: string;
  userId: string;
  narrationText: string;
  voiceId: string;
  voiceSettings: {
    stability: number;
    similarityBoost: number;
    style: number;
    speakerBoost: boolean;
  };
};

export type ImageGenJobData = {
  sceneId: string;
  projectId: string;
  userId: string;
  prompt: string;
  aspectRatio: string;
  variantIndex: number;
};

export type VideoGenJobData = {
  sceneId: string;
  projectId: string;
  userId: string;
  imageUrl: string;
  targetDurationMs: number;
  clipIndex: number;
};

export type ResearchJobData = {
  projectId: string;
  userId: string;
  ideaText: string;
  platform: string;
  targetDuration: number;
  locale: string;
};

export type RenderJobData = {
  projectId: string;
  userId: string;
  quality: "720p" | "1080p" | "4k";
  format: "mp4" | "webm";
  transition: "cut" | "fade" | "crossfade";
  burnSubtitles: boolean;
};
```

**Step 3: Create worker entry point**

```ts
// src/worker/index.ts
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { processVoiceOver } from "./processors/voice-over";
import { processImageGen } from "./processors/image-gen";
import { processVideoGen } from "./processors/video-gen";
import { processResearch } from "./processors/research";
import { processRender } from "./processors/render";

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

console.log("Starting ReelFlow Worker...");

const voiceOverWorker = new Worker("voice-over", processVoiceOver, {
  connection,
  concurrency: 3,
});

const imageGenWorker = new Worker("image-gen", processImageGen, {
  connection,
  concurrency: 5,
});

const videoGenWorker = new Worker("video-gen", processVideoGen, {
  connection,
  concurrency: 3,
});

const researchWorker = new Worker("research", processResearch, {
  connection,
  concurrency: 1,
});

const renderWorker = new Worker("render", processRender, {
  connection,
  concurrency: 1,
});

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down workers...");
  await Promise.all([
    voiceOverWorker.close(),
    imageGenWorker.close(),
    videoGenWorker.close(),
    researchWorker.close(),
    renderWorker.close(),
  ]);
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("ReelFlow Worker started. Listening for jobs...");
```

**Step 4: Create placeholder processor files**

Create stub files for each processor in `src/worker/processors/`:
- `voice-over.ts` — placeholder that logs job data
- `image-gen.ts` — placeholder
- `video-gen.ts` — placeholder
- `research.ts` — placeholder
- `render.ts` — placeholder

Each should export a `process*` function that accepts a BullMQ `Job` and logs the data. We'll implement them in later milestones.

**Step 5: Commit**

```bash
git add src/lib/queue.ts src/worker/
git commit -m "feat: add BullMQ queue setup and worker entry point with processor stubs"
```

---

### Task 8: SSE (Server-Sent Events) for Real-Time Progress

**Files:**
- Create: `src/app/api/events/[projectId]/route.ts`, `src/lib/events.ts`, `src/hooks/use-project-events.ts`

**Step 1: Create Redis pub/sub event system**

```ts
// src/lib/events.ts
import IORedis from "ioredis";

const publisher = new IORedis(process.env.REDIS_URL!);

export type ProjectEvent = {
  type: "job-progress" | "job-completed" | "job-failed" | "research-update";
  jobType: string;
  jobId: string;
  sceneId?: string;
  progress?: number;
  data?: Record<string, unknown>;
  error?: string;
};

export async function publishEvent(projectId: string, event: ProjectEvent) {
  await publisher.publish(`project:${projectId}`, JSON.stringify(event));
}
```

**Step 2: Create SSE API route**

```ts
// src/app/api/events/[projectId]/route.ts
import { auth } from "@/lib/auth";
import IORedis from "ioredis";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { projectId } = await params;
  const subscriber = new IORedis(process.env.REDIS_URL!);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      subscriber.subscribe(`project:${projectId}`);
      subscriber.on("message", (_channel, message) => {
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      });

      // Keep-alive
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        subscriber.unsubscribe();
        subscriber.disconnect();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**Step 3: Create React hook for consuming events**

```ts
// src/hooks/use-project-events.ts
"use client";

import { useEffect, useCallback } from "react";
import type { ProjectEvent } from "@/lib/events";

export function useProjectEvents(
  projectId: string | null,
  onEvent: (event: ProjectEvent) => void
) {
  const stableOnEvent = useCallback(onEvent, []);

  useEffect(() => {
    if (!projectId) return;

    const eventSource = new EventSource(`/api/events/${projectId}`);

    eventSource.onmessage = (e) => {
      try {
        const event: ProjectEvent = JSON.parse(e.data);
        stableOnEvent(event);
      } catch {
        // Ignore keepalive or malformed messages
      }
    };

    return () => eventSource.close();
  }, [projectId, stableOnEvent]);
}
```

**Step 4: Commit**

```bash
git add src/lib/events.ts src/app/api/events/ src/hooks/
git commit -m "feat: add SSE event system for real-time job progress updates"
```

---

## Milestone 2: Dashboard & Project Management

### Task 9: Dashboard Page

**Files:**
- Create: `src/app/(app)/page.tsx`, `src/components/dashboard/project-card.tsx`, `src/components/dashboard/empty-state.tsx`, `src/actions/projects.ts`

**Step 1: Create project server actions**

Create server actions in `src/actions/projects.ts`:
- `getProjects()` — fetch all projects for the current user, ordered by updatedAt desc
- `createProject(data)` — create a new project with Zod-validated input
- `deleteProject(id)` — soft delete (or hard delete) a project owned by the user
- `duplicateProject(id)` — clone all project data except generated assets

All actions must verify `session.user.id` and filter by userId.

**Step 2: Create ProjectCard component**

Card shows: thumbnail (or placeholder film reel icon), project name, platform badge, status badge (colored), relative date ("vor 2 Stunden"), step progress indicator (e.g., "Schritt 4/10").

Hover effect: scale(1.02) + violet glow border via `shadow-[0_0_20px_rgba(139,92,246,0.15)]`.

Use Framer Motion `whileHover` and `whileTap` for animation.

**Step 3: Create EmptyState component**

Large Phosphor `FilmReel` icon (duotone, 64px), heading "Noch keine Projekte" / "No projects yet", subtext, and a CTA button "Erstes Video erstellen" / "Create your first video".

Centered vertically and horizontally. Subtle fade-in animation.

**Step 4: Create Dashboard page**

Grid layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`.

Include:
- Page title "Projekte" / "Projects"
- "+ Neues Projekt" button (primary, top right)
- Search/filter bar (optional first pass — can add later)
- ProjectCard grid or EmptyState
- Framer Motion stagger animation for cards loading in

**Step 5: Commit**

```bash
git add src/app/\(app\)/page.tsx src/components/dashboard/ src/actions/projects.ts
git commit -m "feat: add dashboard with project cards, empty state, and CRUD actions"
```

---

### Task 10: Create Project Dialog

**Files:**
- Create: `src/components/dashboard/create-project-dialog.tsx`
- Modify: `src/app/(app)/page.tsx`

**Step 1: Build create project dialog**

Use shadcn/ui Dialog component. Form fields:
1. **Project Name** — text input, required
2. **Platform** — select dropdown (YouTube, YouTube Shorts, Instagram Reels, TikTok, Custom)
3. **Aspect Ratio** — auto-derived from platform, but editable. Show as read-only chip that updates when platform changes, with an "Anpassen" / "Customize" toggle.
4. **Target Duration** — select (30s, 60s, 90s, 2min, 3min, 5min, Custom)
5. **Style Preset** — grid of preset cards with name + short description. Load from DB.

On submit: call `createProject` server action → redirect to `/project/[id]` (the wizard).

**Step 2: Connect to dashboard**

Wire the "+ Neues Projekt" button to open the dialog. Use `useRouter` to navigate after creation.

**Step 3: Commit**

```bash
git add src/components/dashboard/create-project-dialog.tsx src/app/\(app\)/page.tsx
git commit -m "feat: add create project dialog with platform/preset selection"
```

---

## Milestone 3: Wizard Framework & Steps 1-3

### Task 11: Wizard Framework & Zustand Store

**Files:**
- Create: `src/stores/wizard-store.ts`, `src/app/(app)/project/[id]/layout.tsx`, `src/app/(app)/project/[id]/page.tsx`, `src/components/wizard/wizard-content.tsx`, `src/components/wizard/action-bar.tsx`

**Step 1: Create Zustand wizard store**

```ts
// src/stores/wizard-store.ts
import { create } from "zustand";

interface WizardState {
  projectId: string | null;
  currentStep: number;
  completedSteps: number[];
  promptReviewEnabled: boolean;
  isLoading: boolean;

  setProject: (id: string, step: number, completed: number[], promptReview: boolean) => void;
  goToStep: (step: number) => void;
  completeStep: (step: number) => void;
  invalidateStepsFrom: (step: number) => void;
  togglePromptReview: (enabled: boolean) => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  projectId: null,
  currentStep: 1,
  completedSteps: [],
  promptReviewEnabled: false,
  isLoading: true,

  setProject: (id, step, completed, promptReview) =>
    set({ projectId: id, currentStep: step, completedSteps: completed, promptReviewEnabled: promptReview, isLoading: false }),

  goToStep: (step) =>
    set((state) => {
      // Can only go forward if previous step is completed, or go backward freely
      if (step > state.currentStep && !state.completedSteps.includes(state.currentStep)) {
        return state;
      }
      return { currentStep: step };
    }),

  completeStep: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),

  invalidateStepsFrom: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.filter((s) => s < step),
    })),

  togglePromptReview: (enabled) => set({ promptReviewEnabled: enabled }),
}));
```

**Step 2: Create project layout with StepRail**

The project layout loads project data from DB, initializes the wizard store, renders StepRail + content area + ActionBar.

```tsx
// src/app/(app)/project/[id]/layout.tsx
```

Uses `StepRail` from Task 5. Content area uses `AnimatePresence` + `motion.div` for smooth step transitions.

**Step 3: Create WizardContent component**

Routes to the correct step component based on `currentStep`:
- Step 1 → `<StepSetup />`
- Step 2 → `<StepIdea />`
- Step 3 → `<StepScript />`
- etc.

Each step component is lazy-loaded with `dynamic(() => import(...))`.

**Step 4: Create ActionBar component**

Bottom bar with: "Zurück" / "Back" button (if step > 1), step-specific status text, "Weiter" / "Next" or "Generieren" / "Generate" button. Styled with surface background, top border.

**Step 5: Commit**

```bash
git add src/stores/ src/app/\(app\)/project/ src/components/wizard/
git commit -m "feat: add wizard framework with Zustand store, step routing, and ActionBar"
```

---

### Task 12: Step 1 — Project Setup

**Files:**
- Create: `src/components/wizard/steps/step-setup.tsx`
- Modify: `src/actions/projects.ts` (add `updateProject` action)

**Step 1: Build Step 1 component**

Display the current project settings (from creation) and allow editing:
- Project name (editable input)
- Platform selector (visual cards with platform icons)
- Aspect Ratio (auto-derived, with override toggle)
- Target Duration (slider + presets)
- Style Preset (scrollable card grid — load from DB)
- Prompt Review toggle (Switch component)

Each change saves automatically via debounced `updateProject` server action (no explicit save button — modern UX).

**Step 2: Commit**

```bash
git add src/components/wizard/steps/step-setup.tsx src/actions/projects.ts
git commit -m "feat: add Step 1 (Project Setup) with platform, duration, and preset selection"
```

---

### Task 13: Step 2 — Idea & Concept (Agent SDK Integration)

**Files:**
- Create: `src/components/wizard/steps/step-idea.tsx`, `src/components/wizard/steps/idea/research-report.tsx`, `src/components/wizard/steps/idea/treatment-editor.tsx`, `src/actions/research.ts`, `src/worker/processors/research.ts`

**Step 1: Install Claude Agent SDK**

```bash
npm install @anthropic-ai/sdk
```

**Step 2: Implement the research processor in the worker**

```ts
// src/worker/processors/research.ts
import { Job } from "bullmq";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { publishEvent } from "@/lib/events";
import { decrypt } from "@/lib/encryption";
import { apiKeys } from "@/db/schema";
import type { ResearchJobData } from "@/lib/queue";

export async function processResearch(job: Job<ResearchJobData>) {
  const { projectId, userId, ideaText, platform, targetDuration, locale } = job.data;

  // Get user's Anthropic API key
  const keyRecord = await db.query.apiKeys.findFirst({
    where: (keys, { and, eq: e }) =>
      and(e(keys.userId, userId), e(keys.provider, "anthropic")),
  });

  if (!keyRecord) {
    throw new Error("No Anthropic API key configured");
  }

  const apiKey = decrypt(keyRecord.encryptedKey, keyRecord.iv);
  const client = new Anthropic({ apiKey });

  // Phase 1: Research
  await publishEvent(projectId, {
    type: "research-update",
    jobType: "research",
    jobId: job.id!,
    data: { phase: "researching", message: locale === "de" ? "Recherchiere Trends und Zielgruppe..." : "Researching trends and audience..." },
  });

  const researchResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `You are a video content strategist specializing in ${platform} content. Research the following video idea and provide insights on: 1) Current trends in this niche, 2) What makes similar videos viral (hooks, structure, pacing), 3) Target audience analysis, 4) Recommended approach for maximum engagement. Respond in ${locale === "de" ? "German" : "English"}.`,
    messages: [
      {
        role: "user",
        content: `Video idea: "${ideaText}"\nPlatform: ${platform}\nTarget duration: ${targetDuration} seconds\n\nProvide a detailed research report.`,
      },
    ],
  });

  const researchReport = researchResponse.content[0].type === "text"
    ? researchResponse.content[0].text
    : "";

  await publishEvent(projectId, {
    type: "research-update",
    jobType: "research",
    jobId: job.id!,
    data: { phase: "research-complete", report: researchReport },
  });

  // Phase 2: Generate Treatment
  await publishEvent(projectId, {
    type: "research-update",
    jobType: "research",
    jobId: job.id!,
    data: { phase: "generating-treatment", message: locale === "de" ? "Erstelle Konzept..." : "Creating concept..." },
  });

  const treatmentResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `You are a video content creator. Based on the research, create a structured video treatment/concept. Include: 1) Core message, 2) Target audience, 3) Tonality, 4) Video structure overview (intro hook, main content, outro/CTA), 5) Key visual themes. Respond in ${locale === "de" ? "German" : "English"}. Output as structured JSON with fields: coreMessage, targetAudience, tonality, structure (array of {section, description}), visualThemes (array of strings).`,
    messages: [
      {
        role: "user",
        content: `Original idea: "${ideaText}"\nPlatform: ${platform}\nDuration: ${targetDuration}s\n\nResearch findings:\n${researchReport}\n\nCreate a treatment.`,
      },
    ],
  });

  const treatmentText = treatmentResponse.content[0].type === "text"
    ? treatmentResponse.content[0].text
    : "";

  // Parse treatment JSON (with fallback)
  let treatment;
  try {
    const jsonMatch = treatmentText.match(/\{[\s\S]*\}/);
    treatment = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: treatmentText };
  } catch {
    treatment = { raw: treatmentText };
  }

  // Save to DB
  await db
    .update(projects)
    .set({ researchReport: { report: researchReport }, treatment })
    .where(eq(projects.id, projectId));

  await publishEvent(projectId, {
    type: "job-completed",
    jobType: "research",
    jobId: job.id!,
    data: { treatment, researchReport },
  });

  return { treatment, researchReport };
}
```

**Step 3: Create research server action**

```ts
// src/actions/research.ts
"use server";

import { auth } from "@/lib/auth";
import { researchQueue } from "@/lib/queue";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function startResearch(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
  });

  if (!project?.ideaText) throw new Error("No idea text provided");

  const user = await db.query.users.findFirst({
    where: (users, { eq: e }) => e(users.id, session.user.id),
  });

  const job = await researchQueue.add("research", {
    projectId: project.id,
    userId: session.user.id,
    ideaText: project.ideaText,
    platform: project.platform,
    targetDuration: project.targetDuration,
    locale: user?.locale ?? "de",
  });

  return { jobId: job.id };
}
```

**Step 4: Build Step 2 UI**

`step-idea.tsx`:
- Large textarea for video idea input
- "Research starten" / "Start Research" button → calls `startResearch` action
- Live progress display: animated dots + status message (via `useProjectEvents` hook)
- `ResearchReport` component: collapsible card showing research findings (markdown rendered)
- `TreatmentEditor` component: editable structured view of the treatment (core message, audience, tonality, structure sections). Each field is an editable input/textarea.
- "Bestätigen & weiter" / "Confirm & continue" button → completes step 2, advances to step 3

**Step 5: Commit**

```bash
git add src/components/wizard/steps/step-idea.tsx src/components/wizard/steps/idea/ src/actions/research.ts src/worker/processors/research.ts
git commit -m "feat: add Step 2 (Idea & Concept) with Claude Agent research and treatment generation"
```

---

### Task 14: Step 3 — Script Generation & Editor

**Files:**
- Create: `src/components/wizard/steps/step-script.tsx`, `src/components/wizard/steps/script/scene-list.tsx`, `src/components/wizard/steps/script/scene-editor.tsx`, `src/actions/script.ts`

**Step 1: Create script generation server action**

`src/actions/script.ts`:
- `generateScript(projectId)` — calls LLM (using user's preferred provider via Vercel AI SDK) to generate scene-based script from confirmed treatment. Output format: array of `{ sceneNumber, narrationText, visualDescription, estimatedDuration, mood }`. Saves scenes to DB.
- `updateScene(sceneId, data)` — update a single scene's fields
- `addScene(projectId, afterIndex)` — insert a new scene
- `deleteScene(sceneId)` — remove a scene and reorder remaining
- `reorderScenes(projectId, orderedIds)` — update orderIndex for all scenes

**Step 2: Install Vercel AI SDK**

```bash
npm install ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google
```

**Step 3: Build script generation logic**

Use the `generateObject` function from Vercel AI SDK with a Zod schema for the scene array. The prompt includes: treatment data, platform, duration, style preset info. The LLM generates a structured scene array.

**Step 4: Build Step 3 UI — Split View**

Left panel (40%): `SceneList` — vertical scrollable list of scene cards. Each shows scene number, first line of narration (truncated), duration, mood badge. Drag handle for reordering (use `@dnd-kit/core`).

Right panel (60%): `SceneEditor` — shows the selected scene with editable fields:
- Narration text (textarea, auto-resize)
- Visual description (textarea)
- Estimated duration (number input)
- Mood (select dropdown)
- "Szene löschen" / "Delete scene" button (with confirmation)

Bottom: "Szene hinzufügen" / "Add scene" button. "JSON anzeigen" / "Show JSON" toggle for raw JSON view.

**Step 5: Install dnd-kit for drag & drop**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 6: Commit**

```bash
git add src/components/wizard/steps/step-script.tsx src/components/wizard/steps/script/ src/actions/script.ts
git commit -m "feat: add Step 3 (Script Editor) with LLM generation, scene CRUD, and drag & drop"
```

---

## Milestone 4: Voice Over, Images & Prompts (Steps 4-6)

### Task 15: Step 4 — Voice Over (ElevenLabs Integration)

**Files:**
- Create: `src/components/wizard/steps/step-voice-over.tsx`, `src/components/wizard/steps/voice/voice-browser.tsx`, `src/components/wizard/steps/voice/scene-audio-list.tsx`, `src/components/wizard/steps/voice/waveform.tsx`, `src/actions/voice-over.ts`, `src/worker/processors/voice-over.ts`, `src/lib/elevenlabs.ts`

**Step 1: Create ElevenLabs API client**

```ts
// src/lib/elevenlabs.ts
export async function fetchVoices(apiKey: string) {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) throw new Error("Failed to fetch voices");
  return res.json();
}

export async function generateSpeech(
  apiKey: string,
  voiceId: string,
  text: string,
  settings: { stability: number; similarityBoost: number; style: number; speakerBoost: boolean }
): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarityBoost,
          style: settings.style,
          use_speaker_boost: settings.speakerBoost,
        },
      }),
    }
  );
  if (!res.ok) throw new Error("Failed to generate speech");
  return res.arrayBuffer();
}
```

**Step 2: Implement voice-over processor**

`src/worker/processors/voice-over.ts`:
- Decrypt user's ElevenLabs API key
- Call `generateSpeech` with scene narration text
- Upload audio buffer to MinIO (`projects/{projectId}/voice-overs/{sceneId}.mp3`)
- Extract audio duration (use a simple approach with audio metadata or FFmpeg `ffprobe`)
- Update `voiceOvers` record in DB with fileUrl, durationMs, status=completed
- Log cost in `costLogs`
- Publish SSE event

**Step 3: Create voice-over server actions**

`src/actions/voice-over.ts`:
- `getVoices()` — proxy ElevenLabs voices API (server-side, using user's key)
- `generateVoiceOver(projectId, sceneId)` — queue single scene
- `generateAllVoiceOvers(projectId)` — queue all scenes in batch
- `regenerateVoiceOver(sceneId)` — re-queue a single scene

**Step 4: Build Voice Browser component**

Grid of voice cards. Each card: voice name, category tags, play button (preview using ElevenLabs preview URL). Selected voice has violet border. Search/filter input at top.

**Step 5: Build Scene Audio List**

Vertical list of scenes. Each row: scene number, first line of narration, status indicator (pending/processing/completed), play button (for completed), duration display, regenerate button. Use `useProjectEvents` to update status in real-time.

**Step 6: Build simple Waveform component**

Use HTML `<audio>` element with custom play/pause controls styled in Dark Cinema theme. Show a simple progress bar (not a full waveform library to keep things lean). Can upgrade to WaveSurfer.js later if needed.

**Step 7: Commit**

```bash
git add src/components/wizard/steps/step-voice-over.tsx src/components/wizard/steps/voice/ src/actions/voice-over.ts src/worker/processors/voice-over.ts src/lib/elevenlabs.ts
git commit -m "feat: add Step 4 (Voice Over) with ElevenLabs integration, voice browser, and batch generation"
```

---

### Task 16: Step 5 — Image Prompt Review (Optional Step)

**Files:**
- Create: `src/components/wizard/steps/step-prompt-review.tsx`, `src/actions/prompts.ts`

**Step 1: Create prompt generation logic**

`src/actions/prompts.ts`:
- `generateImagePrompts(projectId)` — for each scene, generate an image prompt by combining: visual description from script + style preset's stylePrompt. Use LLM (user's preferred provider) to refine into an optimal image generation prompt. Save to `scenes.imagePrompt`.
- `updateImagePrompt(sceneId, prompt)` — manual edit

**Step 2: Build Step 5 UI**

Vertical list of scenes. Each scene shows:
- Scene number + narration text preview (read-only, for context)
- Image prompt (editable textarea, auto-populated)
- Style preset badge (shows which style is being applied)
- "Neu generieren" / "Regenerate prompt" button per scene

Top: toggle to "Prompts automatisch generieren" / "Auto-generate prompts" — if toggled off, skip this step entirely.

This step is conditionally rendered based on `promptReviewEnabled` in the wizard store.

**Step 3: Commit**

```bash
git add src/components/wizard/steps/step-prompt-review.tsx src/actions/prompts.ts
git commit -m "feat: add Step 5 (Image Prompt Review) with LLM-powered prompt generation"
```

---

### Task 17: Step 6 — Image Generation (Gemini / Nanobanana)

**Files:**
- Create: `src/components/wizard/steps/step-image-gen.tsx`, `src/components/wizard/steps/images/image-gallery.tsx`, `src/actions/image-gen.ts`, `src/worker/processors/image-gen.ts`, `src/lib/nanobanana.ts`

**Step 1: Create Nanobanana/Gemini image generation client**

`src/lib/nanobanana.ts`:
- Function to generate images using Gemini API with the Nanobanana JSON format
- Handle aspect ratio conversion (16:9, 9:16, etc.)
- Return image buffer

Research the current Gemini image generation API format via web search during implementation.

**Step 2: Implement image-gen processor**

`src/worker/processors/image-gen.ts`:
- Decrypt user's Gemini API key
- Build prompt with style preset + scene visual description
- Call Gemini API for image generation
- Upload image to MinIO (`projects/{projectId}/images/{sceneId}-v{variantIndex}.png`)
- Update `sceneImages` record in DB
- Log cost, publish SSE event

**Step 3: Create image generation server actions**

`src/actions/image-gen.ts`:
- `generateImages(projectId, sceneId)` — queue 2-3 variants for a single scene
- `generateAllImages(projectId)` — queue all scenes (batch)
- `selectImage(imageId)` — set `isSelected = true`, deselect others for same scene
- `regenerateImage(sceneId, customPrompt?)` — re-queue with optional custom prompt

**Step 4: Build Image Gallery component**

Per scene: horizontal row of 2-3 variant images. Click to select (violet border + checkmark overlay). Hover: subtle zoom. "Neu generieren" button opens inline prompt editor.

Overall layout: vertical scroll of scene rows. Each row: scene number label + image variants + selection state.

Loading state: skeleton shimmer matching image aspect ratio.

**Step 5: Commit**

```bash
git add src/components/wizard/steps/step-image-gen.tsx src/components/wizard/steps/images/ src/actions/image-gen.ts src/worker/processors/image-gen.ts src/lib/nanobanana.ts
git commit -m "feat: add Step 6 (Image Generation) with Gemini/Nanobanana, variant selection"
```

---

## Milestone 5: Video Generation & Audio (Steps 7-8)

### Task 18: Step 7 — Video Generation (Kling API)

**Files:**
- Create: `src/components/wizard/steps/step-video-gen.tsx`, `src/actions/video-gen.ts`, `src/worker/processors/video-gen.ts`, `src/lib/kling.ts`

**Step 1: Create Kling API client**

`src/lib/kling.ts`:
- `createVideoTask(apiKey, imageUrl, duration)` — submit image-to-video task
- `pollVideoTask(apiKey, taskId)` — poll for completion (with exponential backoff)
- `getVideoResult(apiKey, taskId)` — download completed video
- Handle async nature: submit → poll → download

Research current Kling API documentation during implementation.

**Step 2: Implement video-gen processor with Frame Continuity**

`src/worker/processors/video-gen.ts`:
- For each scene: check voice-over duration
- If duration <= ~10s: single video clip from image
- If duration > 10s: Frame Continuity Loop:
  1. Generate first clip from original image
  2. Use FFmpeg to extract last frame: `ffmpeg -sseof -1 -i clip1.mp4 -frames:v 1 lastframe.png`
  3. Generate next clip from last frame
  4. Repeat until total duration >= voice-over duration
  5. Concatenate clips with FFmpeg: `ffmpeg -f concat -i list.txt -c copy output.mp4`
- Upload final clip to MinIO
- Update DB, log cost, publish SSE events with progress

**Step 3: Create video generation server actions**

`src/actions/video-gen.ts`:
- `generateVideos(projectId)` — queue all scenes
- `regenerateVideo(sceneId)` — re-queue single scene
- `getVideoStatus(projectId)` — get status of all video clips

**Step 4: Build Step 7 UI**

Grid of scene cards. Each shows:
- Thumbnail (selected image from Step 6)
- Status: pending → processing (with progress %) → completed (with play button)
- Duration display
- Regenerate button
- For multi-clip scenes: show "Clip 1/3 fertig" / "Clip 1/3 complete" progress

Overall progress bar at top. "Alle generieren" / "Generate all" button. Estimated time remaining.

**Step 5: Commit**

```bash
git add src/components/wizard/steps/step-video-gen.tsx src/actions/video-gen.ts src/worker/processors/video-gen.ts src/lib/kling.ts
git commit -m "feat: add Step 7 (Video Generation) with Kling API and frame continuity"
```

---

### Task 19: Step 8 — Music & Audio

**Files:**
- Create: `src/components/wizard/steps/step-music.tsx`, `src/components/wizard/steps/music/music-library.tsx`, `src/components/wizard/steps/music/upload-track.tsx`, `src/components/wizard/steps/music/audio-mixer.tsx`, `src/actions/music.ts`

**Step 1: Create music server actions**

`src/actions/music.ts`:
- `getMusicTracks(userId)` — get all tracks (system + user uploaded)
- `uploadTrack(formData)` — handle file upload (MP3/WAV), extract metadata (duration, potentially BPM), save to MinIO, create DB record
- `deleteTrack(trackId)` — remove track (only if owned by user)
- `assignMusic(sceneId, trackId, settings)` — assign track to scene
- `assignGlobalMusic(projectId, trackId, settings)` — assign to entire project
- `updateMusicSettings(projectId, settings)` — update ducking/volume settings

**Step 2: Build Music Library component**

Tabbed view:
- "Bibliothek" / "Library" tab: grid of available tracks, filterable by mood/genre. Each track card: name, mood badge, BPM, duration, play button.
- "Eigene Uploads" / "My Uploads" tab: user's uploaded tracks + upload button.

**Step 3: Build Audio Mixer component**

Per-scene view showing:
- Scene narration preview (read-only)
- Assigned music track (or "Keine Musik" / "No music")
- Volume sliders: Voice volume (0-100), Music volume (0-100)
- Ducking level slider (how much music dips during narration)
- Fade In / Fade Out toggles per scene transition

Global settings section:
- Apply same track to all scenes toggle
- Global ducking level

**Step 4: Build Upload Track component**

Drag & drop zone + file picker. Accept MP3/WAV only, max 50MB. Show upload progress. After upload: auto-populate name from filename, show duration, allow mood/genre tagging.

**Step 5: Commit**

```bash
git add src/components/wizard/steps/step-music.tsx src/components/wizard/steps/music/ src/actions/music.ts
git commit -m "feat: add Step 8 (Music & Audio) with library, upload, and mixer"
```

---

## Milestone 6: Subtitles, Preview & Render (Steps 9-10)

### Task 20: Step 9 — Subtitles

**Files:**
- Create: `src/components/wizard/steps/step-subtitles.tsx`, `src/components/wizard/steps/subtitles/subtitle-editor.tsx`, `src/components/wizard/steps/subtitles/subtitle-preview.tsx`, `src/components/wizard/steps/subtitles/subtitle-style-panel.tsx`, `src/actions/subtitles.ts`

**Step 1: Create subtitle generation logic**

`src/actions/subtitles.ts`:
- `generateSubtitles(projectId)` — for each scene, create timed subtitle segments from narration text. Split narration into short phrases (based on punctuation and word count). Calculate timing based on voice-over duration proportionally.
- `updateSubtitle(subtitleId, data)` — edit text, timing
- `exportSRT(projectId)` — generate SRT file content
- `updateSubtitleStyle(projectId, style)` — save style preferences

**Step 2: Build Subtitle Editor**

Timeline-based view per scene:
- Scene audio playback at top
- Subtitle segments below with start/end times
- Click to edit text inline
- Drag handles to adjust timing
- Add/delete subtitle segments

**Step 3: Build Subtitle Style Panel**

Visual preview + controls:
- Font family (dropdown: Inter, Space Grotesk, JetBrains Mono, + system fonts)
- Font size (slider)
- Color (color picker)
- Position (bottom / center / top — visual selector)
- Background (transparent / semi-transparent / solid — visual selector)
- Animation style (word-highlight / fade-in / none — with mini preview)

Changes update a live preview mockup in real-time.

**Step 4: Add SRT export button**

"Als SRT exportieren" / "Export as SRT" button that downloads the subtitle file.

**Step 5: Commit**

```bash
git add src/components/wizard/steps/step-subtitles.tsx src/components/wizard/steps/subtitles/ src/actions/subtitles.ts
git commit -m "feat: add Step 9 (Subtitles) with auto-generation, editor, styling, and SRT export"
```

---

### Task 21: Step 10 — Preview & Final Render

**Files:**
- Create: `src/components/wizard/steps/step-render.tsx`, `src/components/wizard/steps/render/slideshow-preview.tsx`, `src/components/wizard/steps/render/render-settings.tsx`, `src/components/wizard/steps/render/render-progress.tsx`, `src/actions/render.ts`, `src/worker/processors/render.ts`

**Step 1: Implement FFmpeg render processor**

`src/worker/processors/render.ts` — the most complex processor:

1. Download all assets from MinIO (video clips, voice overs, music tracks)
2. Build FFmpeg filter complex:
   - Concatenate video clips with transitions (cut/fade/crossfade)
   - Overlay voice-over audio per scene (synchronized)
   - Mix background music with ducking (use `sidechaincompress` or volume automation)
   - Apply fade in/out for music at scene transitions
   - Burn subtitles if requested (`ass` or `srt` subtitle filter)
3. Export settings: quality (720p/1080p/4k), format (mp4 H.264 / webm VP9)
4. Upload final video to MinIO
5. Update project with `finalVideoUrl`
6. Publish progress events throughout (FFmpeg progress parsing)

Key FFmpeg commands to build:
```bash
# Concatenate with transitions
ffmpeg -i clip1.mp4 -i clip2.mp4 -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5" output.mp4

# Mix audio with ducking
ffmpeg -i video.mp4 -i voiceover.mp3 -i music.mp3 \
  -filter_complex "[2:a]volume=0.3[music];[1:a][music]amix=inputs=2:duration=longest" \
  -map 0:v -map "[out]" final.mp4

# Burn subtitles
ffmpeg -i video.mp4 -vf "subtitles=subs.srt:force_style='FontSize=24,PrimaryColour=&HFFFFFF'" output.mp4
```

Publish progress by parsing FFmpeg stderr for `time=` and calculating percentage.

**Step 2: Create render server actions**

`src/actions/render.ts`:
- `startPreview(projectId)` — returns data for client-side slideshow (image URLs + audio URLs + timings)
- `startRender(projectId, settings)` — queue render job
- `getRenderStatus(projectId)` — get current render progress
- `getExportOptions(projectId)` — available export formats

**Step 3: Build Slideshow Preview**

Client-side preview — no server rendering needed:
- Cycle through scene images based on voice-over timings
- Play voice-over audio synchronized with images
- Play background music (with client-side volume control)
- Show subtitles overlaid on images
- Custom video controls (play/pause, seek, volume)
- "Vorschau" / "Preview" badge in corner

Use `<canvas>` or layered `<div>` elements for image display + subtitle overlay. Use Web Audio API or multiple `<audio>` elements for audio mixing.

**Step 4: Build Render Settings panel**

- Quality: 720p / 1080p / 4K (radio group with visual cards)
- Format: MP4 (H.264) / WebM (radio)
- Transition: Cut / Fade / Crossfade (radio with mini preview icons)
- Subtitles: Einbrennen / Burn-in (checkbox) or separate SRT
- Estimated file size display
- Estimated render time
- Estimated cost (if applicable)

**Step 5: Build Render Progress component**

- Progress bar (0-100%) with percentage
- Current phase display ("Clips zusammenfügen..." / "Merging clips...")
- ETA countdown
- Cancel button
- On completion: download button + preview player with final video

**Step 6: Add export options**

After render completes, show export options:
- Download Video (MP4/WebM)
- Download Audio Only (MP3)
- Download Images (ZIP)
- Download Subtitles (SRT)

Each triggers a presigned URL download from MinIO.

**Step 7: Commit**

```bash
git add src/components/wizard/steps/step-render.tsx src/components/wizard/steps/render/ src/actions/render.ts src/worker/processors/render.ts
git commit -m "feat: add Step 10 (Preview & Render) with slideshow preview, FFmpeg rendering, and exports"
```

---

## Milestone 7: Settings, Admin & Polish

### Task 22: Settings Page — API Keys & User Preferences

**Files:**
- Create: `src/app/(app)/settings/page.tsx`, `src/components/settings/api-key-form.tsx`, `src/components/settings/user-preferences.tsx`, `src/components/settings/llm-provider-config.tsx`, `src/actions/settings.ts`

**Step 1: Create settings server actions**

`src/actions/settings.ts`:
- `saveApiKey(provider, key)` — encrypt + save, optionally test validity
- `testApiKey(provider)` — make a test call to verify the key works
- `deleteApiKey(provider)` — remove key
- `getApiKeyStatus(userId)` — return which providers have valid keys (without revealing keys)
- `updateUserPreferences(data)` — update name, locale, avatar
- `updateLlmPreferences(data)` — update preferred LLM provider per task type

**Step 2: Build API Key Management UI**

Tab: "API-Schlüssel" / "API Keys"

Cards for each provider (ElevenLabs, Gemini, Kling, Anthropic, OpenAI):
- Provider logo/icon + name
- Key input (password field, masked)
- Status indicator: Not configured / Valid (green) / Invalid (red) / Testing... (spinner)
- "Testen" / "Test" button
- "Speichern" / "Save" button
- "Entfernen" / "Remove" button (destructive)

**Step 3: Build LLM Provider Config**

Tab: "KI-Modelle" / "AI Models"

For each task type (Konzept & Skript, Bild-Prompts, Untertitel), show a dropdown to select the preferred LLM provider. Only show providers that have valid API keys configured.

**Step 4: Build User Preferences**

Tab: "Profil" / "Profile"
- Name (input)
- Email (read-only)
- Sprache / Language (select: DE / EN)
- Avatar (file upload — future enhancement, skip for now)

**Step 5: Commit**

```bash
git add src/app/\(app\)/settings/ src/components/settings/ src/actions/settings.ts
git commit -m "feat: add Settings page with API key management, LLM config, and user preferences"
```

---

### Task 23: Admin — Cost Tracking Dashboard

**Files:**
- Create: `src/app/(app)/settings/costs/page.tsx`, `src/components/settings/cost-dashboard.tsx`, `src/actions/costs.ts`

**Step 1: Create cost tracking server actions**

`src/actions/costs.ts`:
- `getCostSummary(userId, period?)` — total costs, grouped by provider, optionally filtered by date range
- `getCostsByProject(userId)` — costs per project
- `getCostTimeline(userId, days)` — daily cost data for chart

**Step 2: Build Cost Dashboard**

- Summary cards at top: Total (all time), This month, Per provider breakdown
- Per-project table: Project name, total cost, breakdown by provider, number of generations
- Simple bar chart for daily costs (use a lightweight chart library like `recharts` or just CSS bars)

**Step 3: Commit**

```bash
git add src/app/\(app\)/settings/costs/ src/components/settings/cost-dashboard.tsx src/actions/costs.ts
git commit -m "feat: add cost tracking dashboard with per-project and per-provider breakdown"
```

---

### Task 24: Admin — Music Library Management

**Files:**
- Create: `src/app/(app)/settings/music/page.tsx`, `src/components/settings/music-manager.tsx`

**Step 1: Build Music Library Manager**

Reuse the MusicLibrary component from Step 8, but with admin capabilities:
- Upload new tracks (drag & drop)
- Edit track metadata (name, genre, mood, BPM)
- Delete tracks (with confirmation)
- Bulk categorization
- Audio preview

**Step 2: Commit**

```bash
git add src/app/\(app\)/settings/music/ src/components/settings/music-manager.tsx
git commit -m "feat: add music library management in settings"
```

---

### Task 25: Admin — Style Preset Management

**Files:**
- Create: `src/app/(app)/settings/presets/page.tsx`, `src/components/settings/preset-manager.tsx`, `src/actions/presets.ts`

**Step 1: Create preset server actions**

`src/actions/presets.ts`:
- `getPresets()` — all presets (system + custom)
- `createPreset(data)` — create custom preset
- `updatePreset(id, data)` — edit preset
- `togglePreset(id, active)` — activate/deactivate
- `deletePreset(id)` — delete custom preset only

**Step 2: Build Preset Manager**

Grid of preset cards. Each card:
- Name (editable)
- Style Prompt (expandable textarea)
- Transition Type (select)
- Subtitle Style (mini-preview)
- Active toggle (Switch)
- Edit / Delete buttons (custom presets only, system presets are read-only)

"Neues Preset erstellen" / "Create New Preset" button at top.

**Step 3: Commit**

```bash
git add src/app/\(app\)/settings/presets/ src/components/settings/preset-manager.tsx src/actions/presets.ts
git commit -m "feat: add style preset management with create, edit, and toggle"
```

---

## Milestone 8: i18n, Security, Testing & Deployment

### Task 26: Complete i18n Setup

**Files:**
- Create/Update: `src/messages/de.json`, `src/messages/en.json`, `src/i18n/request.ts`, `src/i18n/routing.ts`

**Step 1: Set up next-intl routing**

Configure locale-based routing with `de` as default. Create `src/i18n/request.ts` and `src/i18n/routing.ts` per next-intl documentation.

**Step 2: Create comprehensive translation files**

Go through every component and extract all user-facing strings into the translation files. Organize by namespace:
- `layout` — TopBar, navigation
- `dashboard` — project cards, empty state, create dialog
- `wizard` — step names, action bar, common wizard strings
- `step1` through `step10` — per-step strings
- `settings` — all settings page strings
- `auth` — login, register, errors
- `common` — buttons (save, cancel, delete, etc.), status labels, errors

**Step 3: Add language switcher functionality**

Ensure the locale switcher in TopBar properly switches routes and persists the user's preference.

**Step 4: Commit**

```bash
git add src/messages/ src/i18n/
git commit -m "feat: complete i18n setup with DE and EN translations"
```

---

### Task 27: Security Hardening

**Files:**
- Modify: `next.config.ts`, `src/middleware.ts`
- Create: `src/lib/rate-limit.ts`

**Step 1: Add security headers**

```ts
// In next.config.ts, add headers
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ];
}
```

**Step 2: Add rate limiting**

```ts
// src/lib/rate-limit.ts
import { LRUCache } from "lru-cache";

type Options = { interval: number; uniqueTokenPerInterval: number };

export function rateLimit(options: Options) {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: (limit: number, token: string) => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0];
      tokenCount[0] += 1;
      tokenCache.set(token, tokenCount);
      const currentUsage = tokenCount[0];
      const isRateLimited = currentUsage > limit;
      return { isRateLimited, remaining: Math.max(0, limit - currentUsage) };
    },
  };
}
```

Apply rate limiting to auth endpoints (5 attempts / 15 min) and API generation endpoints.

**Step 3: Audit all server actions**

Verify every server action:
- Checks `session.user.id`
- Filters by `userId` in all DB queries (prevent IDOR)
- Validates input with Zod
- Returns generic error messages (no stack traces)

**Step 4: Install lru-cache**

```bash
npm install lru-cache
```

**Step 5: Commit**

```bash
git add next.config.ts src/lib/rate-limit.ts src/middleware.ts
git commit -m "feat: add security headers, rate limiting, and auth hardening"
```

---

### Task 28: Testing Setup & Core Tests

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`, `playwright.config.ts`, `tests/`

**Step 1: Install testing dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom playwright @playwright/test
```

**Step 2: Configure Vitest**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Step 3: Write critical unit tests**

- `src/lib/__tests__/encryption.test.ts` — test encrypt/decrypt roundtrip
- `src/stores/__tests__/wizard-store.test.ts` — test step navigation, completion, invalidation
- `src/actions/__tests__/projects.test.ts` — test project CRUD (mock DB)
- Component tests for key UI: ProjectCard render, StepRail active states, EmptyState render

**Step 4: Configure Playwright**

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
```

**Step 5: Write E2E tests**

- `tests/e2e/auth.spec.ts` — register, login, logout flow
- `tests/e2e/dashboard.spec.ts` — create project, see it in dashboard
- `tests/e2e/wizard.spec.ts` — navigate through wizard steps (basic flow)

**Step 6: Add test scripts to package.json**

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**Step 7: Commit**

```bash
git add vitest.config.ts playwright.config.ts src/test/ tests/ package.json
git commit -m "feat: add testing setup (Vitest + Playwright) with core tests"
```

---

### Task 29: Error Handling, Loading States & Empty States

**Files:**
- Create: `src/app/not-found.tsx`, `src/app/error.tsx`, `src/components/ui/loading-skeleton.tsx`, `src/components/ui/error-boundary.tsx`, `src/components/ui/empty-state.tsx`

**Step 1: Create custom 404 page**

Dark Cinema styled 404 page with: large "404" display, "Seite nicht gefunden" / "Page not found" message, FilmReel illustration, "Zurück zum Dashboard" / "Back to Dashboard" link.

**Step 2: Create custom error page**

Dark Cinema styled error page with: error icon, "Ein Fehler ist aufgetreten" / "Something went wrong" message, retry button, "Zurück" / "Go back" link. Use Next.js `error.tsx` convention with `reset()` function.

**Step 3: Create reusable skeleton components**

`LoadingSkeleton` — configurable skeleton that matches content layouts:
- `ProjectCardSkeleton` — matches dashboard card layout
- `SceneListSkeleton` — matches script editor scene list
- `ImageGallerySkeleton` — matches image gallery grid
- All with Dark Cinema styling (card background with shimmer animation)

**Step 4: Create reusable empty state component**

`EmptyState` — accepts icon, title, description, and optional CTA button. Dark Cinema styled. Used across dashboard, music library, voice browser, etc.

**Step 5: Audit all pages for missing states**

Go through every page and ensure:
- Loading: Skeleton shown while data loads (not spinners)
- Error: Error boundary catches failures, shows retry
- Empty: Empty state with CTA when no data

**Step 6: Commit**

```bash
git add src/app/not-found.tsx src/app/error.tsx src/components/ui/
git commit -m "feat: add custom error pages, skeleton loaders, and empty states"
```

---

### Task 30: Docker Production Config & Deployment Docs

**Files:**
- Create: `docker-compose.prod.yml`, `.env.production.example`, `docs/deployment.md`

**Step 1: Create production Docker Compose**

Based on `docker-compose.yml` but with:
- No volume mounts for source code
- Production environment variables
- Restart policies (`restart: unless-stopped`)
- Resource limits (memory, CPU)
- Health checks
- Traefik or Caddy reverse proxy labels for Dokploy

**Step 2: Create production env example**

`.env.production.example` with all required variables documented, including:
- Strong random AUTH_SECRET
- Strong random ENCRYPTION_KEY
- Production DB credentials
- MinIO production credentials
- Domain configuration

**Step 3: Write deployment documentation**

`docs/deployment.md`:
- Prerequisites (Hetzner VPS, Docker, Dokploy)
- Step-by-step Dokploy setup
- Environment variable configuration
- Initial DB migration & seed
- MinIO bucket setup
- SSL/domain configuration
- Backup strategy
- Monitoring recommendations

**Step 4: Commit**

```bash
git add docker-compose.prod.yml .env.production.example docs/deployment.md
git commit -m "feat: add production Docker config and deployment documentation"
```

---

## Milestone 9: Final Polish & Quality

### Task 31: Performance Optimization

**Step 1: Optimize images**

- Ensure all user-uploaded images served via MinIO presigned URLs with proper Cache-Control headers
- Use `next/image` component where applicable with proper sizing

**Step 2: Code splitting**

- Verify each wizard step is dynamically imported (`next/dynamic`)
- Heavy components (waveform, video player, chart) loaded lazily
- Target < 150KB gzipped initial JS bundle

**Step 3: Database query optimization**

- Add missing indexes identified by slow query analysis
- Ensure N+1 queries are avoided (use Drizzle's `with` for relations)

**Step 4: Commit**

```bash
git add -A
git commit -m "perf: optimize code splitting, lazy loading, and database queries"
```

---

### Task 32: Accessibility Sweep

**Step 1: Keyboard navigation**

- Verify all interactive elements are focusable
- Add visible focus indicators (violet ring)
- Ensure StepRail is keyboard-navigable
- Tab order is logical across all pages

**Step 2: ARIA attributes**

- Icon buttons have `aria-label`
- Dropdowns have `aria-expanded`
- Progress bars have `aria-valuenow`
- Toast notifications use `aria-live="polite"`
- Form inputs have associated labels

**Step 3: Color contrast**

- Verify all text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- Test muted text (#7B7B96) against backgrounds
- Ensure status badges are distinguishable without color alone

**Step 4: Reduced motion**

- All Framer Motion animations wrapped with `useReducedMotion()` check
- GSAP animations check `prefers-reduced-motion`
- Provide motion-free alternatives

**Step 5: Commit**

```bash
git add -A
git commit -m "a11y: add keyboard navigation, ARIA attributes, contrast fixes, reduced motion"
```

---

### Task 33: SEO & Meta Tags

**Step 1: Add metadata to all pages**

Use Next.js `generateMetadata` function for each page:
- Dashboard: "ReelFlow — Faceless Video Plattform"
- Project/Wizard: "Projekt: {name} — ReelFlow"
- Settings: "Einstellungen — ReelFlow"
- Login/Register: "Anmelden / Registrieren — ReelFlow"

Include Open Graph and Twitter Card meta tags.

**Step 2: Add structured data**

JSON-LD for Organization schema on the main layout.

**Step 3: Add sitemap and robots.txt**

- Sitemap: auto-generated for public pages
- robots.txt: Allow all crawlers including AI bots (GPTBot, ClaudeBot, PerplexityBot)

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add SEO meta tags, structured data, sitemap, and robots.txt"
```

---

### Task 34: README & Final Documentation

**Files:**
- Create: `README.md`

**Step 1: Write comprehensive README**

Include:
- Project description
- Screenshots (placeholder paths)
- Tech stack overview
- Prerequisites (Node 20+, Docker)
- Quick start (`docker compose up`)
- Development setup
- Environment variables reference
- Database commands (migrate, seed, studio)
- Testing commands
- Deployment guide link
- Project structure overview
- License

**Step 2: Final commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README with setup instructions"
```

---

## Summary

| Milestone | Tasks | Description |
|-----------|-------|-------------|
| 1 | Tasks 1-8 | Foundation: scaffold, Docker, DB, auth, design system, storage, queues, SSE |
| 2 | Tasks 9-10 | Dashboard & project management |
| 3 | Tasks 11-14 | Wizard framework & Steps 1-3 (setup, idea/agent, script) |
| 4 | Tasks 15-17 | Steps 4-6 (voice over, prompt review, image generation) |
| 5 | Tasks 18-19 | Steps 7-8 (video generation, music & audio) |
| 6 | Tasks 20-21 | Steps 9-10 (subtitles, preview & render) |
| 7 | Tasks 22-25 | Settings & admin (API keys, costs, music, presets) |
| 8 | Tasks 26-30 | i18n, security, testing, error handling, deployment |
| 9 | Tasks 31-34 | Performance, accessibility, SEO, documentation |

**Total: 34 Tasks across 9 Milestones**

Each milestone is independently deployable and testable. The app is functional (with reduced features) after Milestone 3.
