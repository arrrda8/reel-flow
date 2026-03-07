import type { Icon } from "@phosphor-icons/react";
import {
  GearSix,
  Lightbulb,
  TextAlignLeft,
  Microphone,
  Image,
  FilmStrip,
  MusicNotes,
  Subtitles,
  Play,
  Export,
} from "@phosphor-icons/react";

// ---------------------------------------------------------------------------
// Step definition type
// ---------------------------------------------------------------------------

export interface StepDefinition {
  id: number;
  key: string;
  title: string;
  description: string;
  icon: Icon;
}

// ---------------------------------------------------------------------------
// All 10 wizard steps
// ---------------------------------------------------------------------------

export const WIZARD_STEPS: StepDefinition[] = [
  {
    id: 1,
    key: "project-setup",
    title: "Project Setup",
    description:
      "Configure your project name, platform, duration, and style preset.",
    icon: GearSix,
  },
  {
    id: 2,
    key: "idea-concept",
    title: "Idea & Concept",
    description:
      "Enter your video idea and let AI research and generate a concept.",
    icon: Lightbulb,
  },
  {
    id: 3,
    key: "script",
    title: "Script & Storyboard",
    description:
      "Generate an AI script and edit your scene-by-scene storyboard.",
    icon: TextAlignLeft,
  },
  {
    id: 4,
    key: "voice-over",
    title: "Voice Over",
    description:
      "Select a voice and generate AI voice-over for each scene.",
    icon: Microphone,
  },
  {
    id: 5,
    key: "images",
    title: "Image Generation",
    description:
      "Generate AI images for each scene with multiple variants to choose from.",
    icon: Image,
  },
  {
    id: 6,
    key: "video",
    title: "Video Generation",
    description:
      "Transform your images into video clips using image-to-video AI.",
    icon: FilmStrip,
  },
  {
    id: 7,
    key: "music",
    title: "Music & Sound",
    description:
      "Select background music and configure audio settings for your video.",
    icon: MusicNotes,
  },
  {
    id: 8,
    key: "subtitles",
    title: "Subtitles",
    description:
      "Configure subtitle style, font, color, position, and animation.",
    icon: Subtitles,
  },
  {
    id: 9,
    key: "preview",
    title: "Preview",
    description:
      "Preview your complete video with timeline, audio, and effects.",
    icon: Play,
  },
  {
    id: 10,
    key: "render",
    title: "Render & Export",
    description:
      "Render your final video and download or publish it to your platform.",
    icon: Export,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const TOTAL_STEPS = WIZARD_STEPS.length;

export function getStepById(id: number): StepDefinition | undefined {
  return WIZARD_STEPS.find((s) => s.id === id);
}

export function getStepByKey(key: string): StepDefinition | undefined {
  return WIZARD_STEPS.find((s) => s.key === key);
}
