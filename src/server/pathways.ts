/**
 * Thriver pathways server functions — called from client components.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyJwt } from "../auth";
import {
  getUserById,
  getPathwaysByUser,
  createPathway,
  getPathwayById,
  updatePathwaySteps,
} from "../db";

/* ============================================
   TYPES
   ============================================ */

interface PathwayStep {
  text: string;
  done: boolean;
}

interface PathwayData {
  id: number;
  title: string;
  steps: PathwayStep[];
  currentStep: number;
  completed: boolean;
  totalSteps: number;
  completedSteps: number;
}

/* ============================================
   HELPERS
   ============================================ */

function authenticate(token: unknown): { userId: number; email: string; tier: string } {
  if (typeof token !== "string" || !token) {
    throw new Error("Authentication required");
  }
  const payload = verifyJwt(token);
  if (!payload) {
    throw new Error("Invalid or expired token");
  }
  const user = getUserById(payload.sub);
  if (!user) {
    throw new Error("User not found");
  }
  return { userId: user.id, email: user.email, tier: user.tier };
}

function parseSteps(json: string): PathwayStep[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      // Support both formats: ["text"] and [{"text":"...","done":false}]
      return parsed.map((item: string | PathwayStep) => {
        if (typeof item === "string") {
          return { text: item, done: false };
        }
        return { text: item.text, done: item.done ?? false };
      });
    }
  } catch {
    // fall through
  }
  return [];
}

function formatPathway(row: {
  id: number;
  title: string;
  steps_json: string;
  current_step: number;
  completed: number;
}): PathwayData {
  const steps = parseSteps(row.steps_json);
  return {
    id: row.id,
    title: row.title,
    steps,
    currentStep: row.current_step,
    completed: row.completed === 1,
    totalSteps: steps.length,
    completedSteps: steps.filter((s) => s.done).length,
  };
}

/* ============================================
   DEFAULT PATHWAYS
   ============================================ */

const DEFAULT_PATHWAYS: { title: string; steps: string[] }[] = [
  {
    title: "Rebuilding Self-Worth",
    steps: [
      "Notice one kind thing about yourself today",
      "Write down a compliment you received and believe it",
      "Set one small boundary this week",
      "Identify one negative belief and challenge it gently",
      "Celebrate a moment you chose yourself",
    ],
  },
  {
    title: "Setting Boundaries",
    steps: [
      "Identify where you feel drained",
      "Practice saying no to one small thing",
      "Communicate a need clearly to someone safe",
      "Protect your time without guilt",
      "Honor your limits as an act of self-love",
    ],
  },
  {
    title: "Finding Your Voice",
    steps: [
      "Write down one thing you wanted to say but didn't",
      "Share one honest opinion this week",
      "Express a feeling without apologizing",
      "Ask for what you need directly",
      "Trust that your voice matters",
    ],
  },
];

/* ============================================
   GET PATHWAYS
   ============================================ */

export const getPathwaysFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    const { userId, tier } = authenticate(data.token);

    let pathways = getPathwaysByUser(userId);

    // Auto-create default pathways if user has none
    if (pathways.length === 0) {
      for (const p of DEFAULT_PATHWAYS) {
        const stepsJson = JSON.stringify(
          p.steps.map((text) => ({ text, done: false }))
        );
        createPathway(userId, p.title, stepsJson);
      }
      pathways = getPathwaysByUser(userId);
    }

    const formatted = pathways.map(formatPathway);

    // Free users: only return the first pathway with a note
    if (tier === "free" && formatted.length > 1) {
      return {
        pathways: formatted.slice(0, 1),
        tierNote: "Upgrade to Thrive for unlimited pathways",
      };
    }

    return {
      pathways: formatted,
    };
  });

/* ============================================
   TOGGLE PATHWAY STEP
   ============================================ */

export const togglePathwayStepFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as {
      token?: string;
      pathwayId?: number;
      stepIndex?: number;
    };

    if (typeof d.pathwayId !== "number") {
      throw new Error("Pathway ID is required");
    }
    if (typeof d.stepIndex !== "number") {
      throw new Error("Step index is required");
    }

    return {
      token: d.token ?? null,
      pathwayId: d.pathwayId,
      stepIndex: d.stepIndex,
    };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);

    const pathway = getPathwayById(data.pathwayId);
    if (!pathway || pathway.user_id !== userId) {
      throw new Error("Pathway not found");
    }

    const steps = parseSteps(pathway.steps_json);
    if (data.stepIndex < 0 || data.stepIndex >= steps.length) {
      throw new Error("Invalid step index");
    }

    // Toggle the step
    const step = steps[data.stepIndex]!;
    step.done = !step.done;

    // Recalculate current_step and completed
    const firstIncomplete = steps.findIndex((s) => !s.done);
    const allDone = steps.every((s) => s.done);

    const newCurrentStep = allDone
      ? steps.length - 1
      : firstIncomplete === -1
        ? data.stepIndex
        : firstIncomplete;

    const updated = updatePathwaySteps(
      data.pathwayId,
      JSON.stringify(steps),
      newCurrentStep,
      allDone
    );

    return {
      pathway: formatPathway(updated),
    };
  });

/* ============================================
   RESET PATHWAY
   ============================================ */

export const resetPathwayFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { token?: string; pathwayId?: number };

    if (typeof d.pathwayId !== "number") {
      throw new Error("Pathway ID is required");
    }

    return {
      token: d.token ?? null,
      pathwayId: d.pathwayId,
    };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);

    const pathway = getPathwayById(data.pathwayId);
    if (!pathway || pathway.user_id !== userId) {
      throw new Error("Pathway not found");
    }

    const steps = parseSteps(pathway.steps_json);
    const resetSteps = steps.map((s) => ({ text: s.text, done: false }));

    const updated = updatePathwaySteps(
      data.pathwayId,
      JSON.stringify(resetSteps),
      0,
      false
    );

    return {
      pathway: formatPathway(updated),
    };
  });
