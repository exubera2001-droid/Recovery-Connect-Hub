/**
 * Thriver tier management server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyJwt } from "../auth";
import { getUserById } from "../db";

/* ============================================
   HELPERS
   ============================================ */

function authenticate(token: unknown): {
  userId: number;
  email: string;
  tier: "free" | "thrive" | "organization";
} {
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

/* ============================================
   GET USER TIER
   ============================================ */

export const getUserTierFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    const { userId, email, tier } = authenticate(data.token);

    const features = {
      dailyCheckin: true,
      conversations: true,
      unlimitedConversations: tier !== "free",
      aiCompanion: tier !== "free",
      unlimitedPathways: tier !== "free",
      progressDashboard: tier !== "free",
      conversationMemory: tier !== "free",
      weeklyConversationLimit: tier === "free" ? 5 : null,
      thriveComplete: tier === "thrive_complete",
      contentLibrary: tier === "thrive_complete",
      healingQuizzes: tier === "thrive_complete",
      personalizedPath: tier === "thrive_complete",
      conversationCoach: tier === "thrive_complete",
      boundaryPractice: tier === "thrive_complete",
      victoryJournal: tier === "thrive_complete",
      futureSelfLetters: tier === "thrive_complete",
      resetLibrary: tier !== "free",
    };

    return {
      user: { id: userId, email, tier },
      features,
    };
  });
