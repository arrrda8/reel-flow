import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { users, stylePresets, type SubtitleStyle } from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// ---------------------------------------------------------------------------
// Style presets
// ---------------------------------------------------------------------------

const defaultSubtitleStyle: SubtitleStyle = {
  fontFamily: "Inter",
  fontSize: 24,
  color: "#FFFFFF",
  position: "bottom",
  background: "rgba(0,0,0,0.6)",
  animation: "fade",
};

const presets: (typeof stylePresets.$inferInsert)[] = [
  {
    name: "Cinematic",
    nameEn: "Cinematic",
    stylePrompt:
      "cinematic style, film-like composition, dramatic lighting, shallow depth of field, letterbox framing, anamorphic lens flare, color graded with teal and orange tones, professional cinematography, 35mm film grain, wide angle establishing shots",
    transitionType: "fade",
    subtitleStyle: {
      ...defaultSubtitleStyle,
      fontFamily: "Playfair Display",
      fontSize: 28,
      background: "rgba(0,0,0,0.7)",
      animation: "fade",
    },
  },
  {
    name: "Minimalistisch",
    nameEn: "Minimalist",
    stylePrompt:
      "minimalist style, clean composition, generous whitespace, soft muted tones, simple geometric forms, subtle shadows, neutral color palette, elegant simplicity, uncluttered framing, modern design aesthetic",
    transitionType: "fade",
    subtitleStyle: {
      ...defaultSubtitleStyle,
      fontFamily: "Helvetica Neue",
      fontSize: 22,
      color: "#333333",
      background: "rgba(255,255,255,0.85)",
      animation: "fade",
    },
  },
  {
    name: "Dark & Moody",
    nameEn: "Dark & Moody",
    stylePrompt:
      "dark moody atmosphere, high contrast chiaroscuro lighting, deep shadows, noir aesthetic, rich blacks, dramatic single-source lighting, desaturated color palette, cinematic tension, mysterious ambiance, low-key lighting",
    transitionType: "fade",
    subtitleStyle: {
      ...defaultSubtitleStyle,
      fontFamily: "Roboto Condensed",
      fontSize: 26,
      color: "#E0E0E0",
      background: "rgba(0,0,0,0.8)",
      animation: "slide",
    },
  },
  {
    name: "Natur-Dokumentation",
    nameEn: "Nature Documentary",
    stylePrompt:
      "nature documentary style, natural colors, soft golden hour lighting, sharp focus on subject with soft background bokeh, lush greens and earth tones, macro detail shots, sweeping landscape compositions, David Attenborough aesthetic, wildlife photography style",
    transitionType: "fade",
    subtitleStyle: {
      ...defaultSubtitleStyle,
      fontFamily: "Source Sans Pro",
      fontSize: 24,
      color: "#FFFFFF",
      background: "rgba(34,70,34,0.65)",
      animation: "fade",
    },
  },
  {
    name: "Neon / Cyberpunk",
    nameEn: "Neon / Cyberpunk",
    stylePrompt:
      "neon cyberpunk aesthetic, vibrant purple and cyan neon glow, futuristic cityscape, rain-slicked surfaces with reflections, holographic elements, dark background with bright neon accents, synthwave color palette, high-tech dystopian, electric blue and hot pink highlights",
    transitionType: "fade",
    subtitleStyle: {
      ...defaultSubtitleStyle,
      fontFamily: "Orbitron",
      fontSize: 24,
      color: "#00FFFF",
      background: "rgba(20,0,40,0.75)",
      animation: "slide",
    },
  },
  {
    name: "Vintage / Retro",
    nameEn: "Vintage / Retro",
    stylePrompt:
      "vintage retro style, nostalgic film grain, warm faded tones, slight vignette, 70s color palette with warm oranges and browns, soft light leaks, analog photography feel, muted saturation, cross-processed look, polaroid aesthetic",
    transitionType: "fade",
    subtitleStyle: {
      ...defaultSubtitleStyle,
      fontFamily: "Courier New",
      fontSize: 22,
      color: "#F5E6D3",
      background: "rgba(60,40,20,0.7)",
      animation: "typewriter",
    },
  },
  {
    name: "Abstrakt / Kuenstlerisch",
    nameEn: "Abstract / Artistic",
    stylePrompt:
      "abstract artistic style, bold expressive brush strokes, mixed media collage, vibrant saturated colors, painterly texture, impressionist influence, creative composition breaking traditional rules, artistic interpretation, watercolor and oil paint blend, gallery-worthy aesthetic",
    transitionType: "fade",
    subtitleStyle: {
      ...defaultSubtitleStyle,
      fontFamily: "Georgia",
      fontSize: 26,
      color: "#FFFFFF",
      background: "rgba(80,20,80,0.65)",
      animation: "fade",
    },
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log("--- ReelFlow Database Seed ---\n");

  // 1. Style presets
  console.log("Seeding default style presets...");
  await db.insert(stylePresets).values(presets).onConflictDoNothing();
  console.log(`  -> ${presets.length} style presets seeded.\n`);

  // 2. Test admin user
  console.log("Seeding test admin user...");
  const passwordHash = await bcrypt.hash("password123", 12);
  await db
    .insert(users)
    .values({
      email: "admin@reelflow.com",
      passwordHash,
      name: "Admin",
      locale: "de",
    })
    .onConflictDoNothing();
  console.log("  -> Test user: admin@reelflow.com / password123\n");

  console.log("Seeding complete.");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
