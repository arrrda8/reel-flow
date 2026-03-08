import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

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
  "nanobanana",
  "kie",
]);

export const localeEnum = pgEnum("locale", ["de", "en"]);

// ---------------------------------------------------------------------------
// JSONB type definitions
// ---------------------------------------------------------------------------

export type SubtitleStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  position: "top" | "center" | "bottom" | "custom";
  customX?: number; // 0-100 percent from left
  customY?: number; // 0-100 percent from top
  background: "none" | "solid" | "semi-transparent" | "blur" | "custom";
  backgroundColor?: string; // hex color when background is "custom"
  animation: "none" | "fade" | "slide" | "typewriter";
};

export type VoiceSettings = {
  stability: number;
  similarityBoost: number;
  speed: number;
};

export type MusicSettings = {
  trackId: string | null;
  volume: number;
  fadeIn: boolean;
  fadeOut: boolean;
};

export type RenderSettings = {
  resolution: string;
  fps: number;
  format: string;
  quality: string;
};

export type Treatment = {
  title: string;
  hook: string;
  scenes: {
    narration: string;
    visual: string;
  }[];
  cta: string;
};

export type ResearchReport = {
  topic: string;
  keyPoints: string[];
  sources: string[];
  summary: string;
};

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

// 1. users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  locale: localeEnum("locale").default("de").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 2. apiKeys
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: apiProviderEnum("provider").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    iv: text("iv").notNull(),
    isValid: boolean("is_valid").default(true).notNull(),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("api_keys_user_provider_idx").on(table.userId, table.provider),
  ]
);

// 3. stylePresets
export const stylePresets = pgTable("style_presets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  stylePrompt: text("style_prompt").notNull(),
  transitionType: varchar("transition_type", { length: 50 })
    .default("fade")
    .notNull(),
  subtitleStyle: jsonb("subtitle_style")
    .$type<SubtitleStyle>()
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 4. projects
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 500 }).notNull(),
    platform: platformEnum("platform").notNull(),
    aspectRatio: varchar("aspect_ratio", { length: 10 })
      .default("16:9")
      .notNull(),
    targetDuration: integer("target_duration").notNull(),
    stylePresetId: uuid("style_preset_id").references(() => stylePresets.id),
    currentStep: integer("current_step").default(1).notNull(),
    status: projectStatusEnum("status").default("draft").notNull(),
    ideaText: text("idea_text"),
    treatment: jsonb("treatment").$type<Treatment>(),
    researchReport: jsonb("research_report").$type<ResearchReport>(),
    voiceId: varchar("voice_id", { length: 255 }),
    voiceSettings: jsonb("voice_settings").$type<VoiceSettings>(),
    musicSettings: jsonb("music_settings").$type<MusicSettings>(),
    subtitleStyle: jsonb("subtitle_style").$type<SubtitleStyle>(),
    renderSettings: jsonb("render_settings").$type<RenderSettings>(),
    promptReviewEnabled: boolean("prompt_review_enabled")
      .default(false)
      .notNull(),
    llmProvider: apiProviderEnum("llm_provider").default("anthropic").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    finalVideoUrl: text("final_video_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("projects_user_id_idx").on(table.userId),
    index("projects_status_idx").on(table.status),
  ]
);

// 5. scenes
export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    narrationText: text("narration_text"),
    visualDescription: text("visual_description"),
    imagePrompt: text("image_prompt"),
    estimatedDuration: integer("estimated_duration"),
    mood: moodEnum("mood").default("calm").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("scenes_project_id_idx").on(table.projectId),
    index("scenes_project_order_idx").on(table.projectId, table.orderIndex),
  ]
);

// 6. voiceOvers
export const voiceOvers = pgTable(
  "voice_overs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    fileUrl: text("file_url"),
    durationMs: integer("duration_ms"),
    status: assetStatusEnum("status").default("pending").notNull(),
    costCents: integer("cost_cents"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("voice_overs_scene_id_idx").on(table.sceneId)]
);

// 7. sceneImages
export const sceneImages = pgTable(
  "scene_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    fileUrl: text("file_url"),
    variantIndex: integer("variant_index").notNull(),
    isSelected: boolean("is_selected").default(false).notNull(),
    promptUsed: text("prompt_used"),
    status: assetStatusEnum("status").default("pending").notNull(),
    costCents: integer("cost_cents"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("scene_images_scene_id_idx").on(table.sceneId)]
);

// 8. videoClips
export const videoClips = pgTable(
  "video_clips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    fileUrl: text("file_url"),
    clipIndex: integer("clip_index").notNull(),
    durationMs: integer("duration_ms"),
    status: assetStatusEnum("status").default("pending").notNull(),
    costCents: integer("cost_cents"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("video_clips_scene_id_idx").on(table.sceneId)]
);

// 9. musicTracks
export const musicTracks = pgTable("music_tracks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  genre: varchar("genre", { length: 100 }),
  mood: varchar("mood", { length: 100 }),
  bpm: integer("bpm"),
  durationMs: integer("duration_ms"),
  uploadedBy: uuid("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 10. sceneMusic
export const sceneMusic = pgTable("scene_music", {
  id: uuid("id").defaultRandom().primaryKey(),
  sceneId: uuid("scene_id")
    .notNull()
    .references(() => scenes.id, { onDelete: "cascade" }),
  trackId: uuid("track_id")
    .notNull()
    .references(() => musicTracks.id, { onDelete: "cascade" }),
  volume: integer("volume").default(50).notNull(),
  fadeIn: boolean("fade_in").default(false).notNull(),
  fadeOut: boolean("fade_out").default(false).notNull(),
});

// 11. costLogs
export const costLogs = pgTable(
  "cost_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    provider: apiProviderEnum("provider").notNull(),
    operation: varchar("operation", { length: 255 }).notNull(),
    costCents: integer("cost_cents").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("cost_logs_user_id_idx").on(table.userId),
    index("cost_logs_project_id_idx").on(table.projectId),
  ]
);

// 12. jobs
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    status: assetStatusEnum("status").default("pending").notNull(),
    progress: integer("progress").default(0).notNull(),
    result: jsonb("result"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("jobs_project_id_idx").on(table.projectId),
    index("jobs_status_idx").on(table.status),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  apiKeys: many(apiKeys),
  costLogs: many(costLogs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const stylePresetsRelations = relations(stylePresets, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [stylePresets.createdBy],
    references: [users.id],
  }),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  stylePreset: one(stylePresets, {
    fields: [projects.stylePresetId],
    references: [stylePresets.id],
  }),
  scenes: many(scenes),
  costLogs: many(costLogs),
  jobs: many(jobs),
}));

export const scenesRelations = relations(scenes, ({ one, many }) => ({
  project: one(projects, {
    fields: [scenes.projectId],
    references: [projects.id],
  }),
  voiceOvers: many(voiceOvers),
  images: many(sceneImages),
  videoClips: many(videoClips),
  music: many(sceneMusic),
}));

export const voiceOversRelations = relations(voiceOvers, ({ one }) => ({
  scene: one(scenes, {
    fields: [voiceOvers.sceneId],
    references: [scenes.id],
  }),
}));

export const sceneImagesRelations = relations(sceneImages, ({ one }) => ({
  scene: one(scenes, {
    fields: [sceneImages.sceneId],
    references: [scenes.id],
  }),
}));

export const videoClipsRelations = relations(videoClips, ({ one }) => ({
  scene: one(scenes, {
    fields: [videoClips.sceneId],
    references: [scenes.id],
  }),
}));

export const musicTracksRelations = relations(musicTracks, ({ one, many }) => ({
  uploadedByUser: one(users, {
    fields: [musicTracks.uploadedBy],
    references: [users.id],
  }),
  sceneMusic: many(sceneMusic),
}));

export const sceneMusicRelations = relations(sceneMusic, ({ one }) => ({
  scene: one(scenes, {
    fields: [sceneMusic.sceneId],
    references: [scenes.id],
  }),
  track: one(musicTracks, {
    fields: [sceneMusic.trackId],
    references: [musicTracks.id],
  }),
}));

export const costLogsRelations = relations(costLogs, ({ one }) => ({
  user: one(users, {
    fields: [costLogs.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [costLogs.projectId],
    references: [projects.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [jobs.projectId],
    references: [projects.id],
  }),
}));
