import { create } from "zustand";
import { TOTAL_STEPS } from "@/lib/wizard-steps";
import type {
  Treatment,
  ResearchReport,
  VoiceSettings,
  MusicSettings,
  SubtitleStyle,
  RenderSettings,
} from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StepStatus = "locked" | "available" | "current" | "completed";

/** Scene data as returned from the DB (with related assets). */
export interface SceneData {
  id: string;
  projectId: string;
  orderIndex: number;
  narrationText: string | null;
  visualDescription: string | null;
  imagePrompt: string | null;
  estimatedDuration: number | null;
  mood: "motivating" | "informative" | "dramatic" | "calm" | "energetic" | "melancholic" | "mysterious" | "uplifting";
  createdAt: Date;
  updatedAt: Date;
}

/** Full project data hydrated from the server. */
export interface ProjectData {
  id: string;
  userId: string;
  name: string;
  platform: "youtube" | "shorts" | "reels" | "tiktok" | "custom";
  aspectRatio: string;
  targetDuration: number;
  stylePresetId: string | null;
  currentStep: number;
  status: "draft" | "in_progress" | "rendering" | "completed";
  ideaText: string | null;
  treatment: Treatment | null;
  researchReport: ResearchReport | null;
  voiceId: string | null;
  voiceSettings: VoiceSettings | null;
  musicSettings: MusicSettings | null;
  subtitleStyle: SubtitleStyle | null;
  renderSettings: RenderSettings | null;
  promptReviewEnabled: boolean;
  llmProvider: "elevenlabs" | "gemini" | "kling" | "anthropic" | "openai";
  thumbnailUrl: string | null;
  finalVideoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  scenes: SceneData[];
}

// ---------------------------------------------------------------------------
// Wizard state shape
// ---------------------------------------------------------------------------

interface WizardState {
  // Project data (loaded from DB)
  projectId: string | null;
  projectData: ProjectData | null;

  // Wizard navigation
  currentStep: number;
  maxReachedStep: number;

  // Step completion status
  stepStatus: Record<number, StepStatus>;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Auto-save indicator
  lastSavedAt: Date | null;

  // Actions
  setProject: (project: ProjectData) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepCompleted: (step: number) => void;
  setStepStatus: (step: number, status: StepStatus) => void;
  setSaving: (saving: boolean) => void;
  setLoading: (loading: boolean) => void;
  setLastSavedAt: (date: Date) => void;
  updateProjectData: (partial: Partial<ProjectData>) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute step statuses based on current step and max reached step.
 * - Steps before currentStep that were reached: "completed"
 * - The current step: "current"
 * - Steps up to maxReachedStep (but not current): "available"
 * - All others: "locked"
 */
function computeStepStatuses(
  currentStep: number,
  maxReachedStep: number,
  completedSteps: Set<number>
): Record<number, StepStatus> {
  const statuses: Record<number, StepStatus> = {};

  for (let i = 1; i <= TOTAL_STEPS; i++) {
    if (i === currentStep) {
      statuses[i] = "current";
    } else if (completedSteps.has(i)) {
      statuses[i] = "completed";
    } else if (i <= maxReachedStep) {
      statuses[i] = "available";
    } else {
      statuses[i] = "locked";
    }
  }

  return statuses;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: Omit<
  WizardState,
  | "setProject"
  | "goToStep"
  | "nextStep"
  | "prevStep"
  | "markStepCompleted"
  | "setStepStatus"
  | "setSaving"
  | "setLoading"
  | "setLastSavedAt"
  | "updateProjectData"
  | "reset"
> = {
  projectId: null,
  projectData: null,
  currentStep: 1,
  maxReachedStep: 1,
  stepStatus: computeStepStatuses(1, 1, new Set()),
  isLoading: true,
  isSaving: false,
  lastSavedAt: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

// Internal tracker for completed steps (not exposed in state to keep it clean)
let completedStepsSet = new Set<number>();

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initialState,

  setProject: (project: ProjectData) => {
    const currentStep = project.currentStep;
    // When loading from DB, consider all steps before current as completed
    const completed = new Set<number>();
    for (let i = 1; i < currentStep; i++) {
      completed.add(i);
    }
    completedStepsSet = completed;

    const maxReachedStep = Math.max(currentStep, ...Array.from(completed));
    const stepStatus = computeStepStatuses(currentStep, maxReachedStep, completed);

    set({
      projectId: project.id,
      projectData: project,
      currentStep,
      maxReachedStep,
      stepStatus,
      isLoading: false,
    });
  },

  goToStep: (step: number) => {
    const { maxReachedStep, stepStatus } = get();

    // Validate: can only go to available, completed, or current steps
    if (step < 1 || step > TOTAL_STEPS) return;

    const targetStatus = stepStatus[step];
    if (targetStatus === "locked") return;

    const newStepStatus = computeStepStatuses(step, maxReachedStep, completedStepsSet);

    set({
      currentStep: step,
      stepStatus: newStepStatus,
    });
  },

  nextStep: () => {
    const { currentStep, maxReachedStep } = get();
    const nextStep = currentStep + 1;

    if (nextStep > TOTAL_STEPS) return;

    const newMaxReached = Math.max(maxReachedStep, nextStep);
    const newStepStatus = computeStepStatuses(nextStep, newMaxReached, completedStepsSet);

    set({
      currentStep: nextStep,
      maxReachedStep: newMaxReached,
      stepStatus: newStepStatus,
    });
  },

  prevStep: () => {
    const { currentStep, maxReachedStep } = get();
    const prevStep = currentStep - 1;

    if (prevStep < 1) return;

    const newStepStatus = computeStepStatuses(prevStep, maxReachedStep, completedStepsSet);

    set({
      currentStep: prevStep,
      stepStatus: newStepStatus,
    });
  },

  markStepCompleted: (step: number) => {
    if (step < 1 || step > TOTAL_STEPS) return;

    completedStepsSet.add(step);

    const { currentStep, maxReachedStep } = get();
    const newStepStatus = computeStepStatuses(currentStep, maxReachedStep, completedStepsSet);

    set({ stepStatus: newStepStatus });
  },

  setStepStatus: (step: number, status: StepStatus) => {
    if (step < 1 || step > TOTAL_STEPS) return;

    if (status === "completed") {
      completedStepsSet.add(step);
    } else {
      completedStepsSet.delete(step);
    }

    set((state) => ({
      stepStatus: {
        ...state.stepStatus,
        [step]: status,
      },
    }));
  },

  setSaving: (saving: boolean) => {
    set({
      isSaving: saving,
      ...(saving === false ? { lastSavedAt: new Date() } : {}),
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setLastSavedAt: (date: Date) => {
    set({ lastSavedAt: date });
  },

  updateProjectData: (partial: Partial<ProjectData>) => {
    const { projectData } = get();
    if (!projectData) return;

    set({
      projectData: { ...projectData, ...partial },
    });
  },

  reset: () => {
    completedStepsSet = new Set<number>();
    set({ ...initialState });
  },
}));
