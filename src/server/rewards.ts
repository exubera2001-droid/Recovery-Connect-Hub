/**
 * Thriver rewards system — gentle celebration badges and unlocks.
 * No leaderboards, no scores, no competition.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyJwt } from "../auth";
import {
  getUserById,
  getCheckinDates,
  getUserBadges,
  awardBadge,
  getTotalCheckinCount,
  getCompletedPathwaysCount,
  getPathwaysByUser,
  createPathway,
} from "../db";

/* ============================================
   TYPES
   ============================================ */

export interface BadgeDef {
  key: string;
  name: string;
  message: string;
  emoji: string;
}

export interface EarnedBadge {
  key: string;
  name: string;
  message: string;
  emoji: string;
  earnedAt: string;
}

export interface Unlock {
  type: "pathway" | "store" | "badge";
  title?: string;
  message: string;
  pathwayTitle?: string;
  pathwaySteps?: string[];
  storeUrl?: string;
  badge?: BadgeDef;
}

export interface RewardsResult {
  streak: number;
  badges: EarnedBadge[];
  newlyEarned: EarnedBadge[];
  unlocks: Unlock[];
}

/* ============================================
   BADGE DEFINITIONS
   ============================================ */

const BADGE_DEFS: Record<string, BadgeDef> = {
  first_step: {
    key: "first_step",
    name: "First Step",
    message: "You started. That's everything.",
    emoji: "🌱",
  },
  streak_7: {
    key: "streak_7",
    name: "7 Days Strong",
    message: "One week of choosing yourself.",
    emoji: "🌸",
  },
  streak_30: {
    key: "streak_30",
    name: "30 Days of Choosing Yourself",
    message: "A whole month. You're becoming.",
    emoji: "✨",
  },
  checkins_50: {
    key: "checkins_50",
    name: "50 Check-ins",
    message: "50 moments you showed up for yourself.",
    emoji: "💫",
  },
  checkins_100: {
    key: "checkins_100",
    name: "100 Check-ins",
    message: "100 days of becoming.",
    emoji: "🌟",
  },
  pathway_complete: {
    key: "pathway_complete",
    name: "Celebration",
    message: "You completed your first pathway. You're doing the work.",
    emoji: "🎉",
  },
};

/** Order for display (earned badges sorted by this order, locked by the same) */
const BADGE_DISPLAY_ORDER = [
  "first_step",
  "streak_7",
  "streak_30",
  "checkins_50",
  "checkins_100",
  "pathway_complete",
];

/* ============================================
   HELPERS
   ============================================ */

function authenticate(token: unknown): {
  userId: number;
  email: string;
  tier: string;
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

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  const mostRecent = dates[0]!;
  const mostRecentDate = new Date(mostRecent + "T00:00:00Z");
  const daysSinceMostRecent = Math.floor(
    (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
      mostRecentDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysSinceMostRecent > 1) return 0;

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i]! + "T00:00:00Z");
    const prev = new Date(dates[i + 1]! + "T00:00:00Z");
    const diff =
      (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/* ============================================
   GET REWARDS
   ============================================ */

export const getRewardsFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }): Promise<RewardsResult> => {
    const { userId } = authenticate(data.token);

    // Streak
    const dates = getCheckinDates(userId, 60);
    const streak = calculateStreak(dates);

    // Total check-ins
    const totalCheckins = getTotalCheckinCount(userId);

    // Completed pathways
    const completedPathways = getCompletedPathwaysCount(userId);

    // Existing badges from DB
    const existingBadgeKeys = new Set(
      getUserBadges(userId).map((b) => b.badge_key)
    );

    const newlyEarned: EarnedBadge[] = [];
    const unlocks: Unlock[] = [];

    // Helper: try to award a badge, return it if newly earned
    function tryAward(key: string): EarnedBadge | null {
      if (existingBadgeKeys.has(key)) return null;
      const def = BADGE_DEFS[key];
      if (!def) return null;
      const result = awardBadge(userId, key);
      if (result) {
        return {
          key: def.key,
          name: def.name,
          message: def.message,
          emoji: def.emoji,
          earnedAt: result.earned_at,
        };
      }
      return null;
    }

    // 1. First check-in badge
    if (totalCheckins >= 1) {
      const b = tryAward("first_step");
      if (b) newlyEarned.push(b);
    }

    // 2. 7-day streak
    if (streak >= 7) {
      const b = tryAward("streak_7");
      if (b) newlyEarned.push(b);

      // Unlock: "You Are Not Behind" pathway (only if not already created)
      const existingPathways = getPathwaysByUser(userId);
      const hasPathway = existingPathways.some(
        (p) => p.title === "You Are Not Behind"
      );
      if (!hasPathway) {
        const stepsJson = JSON.stringify([
          { text: "Write down one thing you're proud of — no matter how small", done: false },
          { text: "Notice when you compare yourself to others and pause", done: false },
          { text: "Remind yourself: your timeline is your own", done: false },
          { text: "Do one thing today that's just for you", done: false },
          { text: "Reflect on how far you've come, not how far you have to go", done: false },
        ]);
        createPathway(userId, "You Are Not Behind", stepsJson);
        unlocks.push({
          type: "pathway",
          title: "You Are Not Behind",
          message: "This pathway reminds you that your journey is exactly what it should be.",
          pathwayTitle: "You Are Not Behind",
        });
      }
    }

    // 3. 30-day streak
    if (streak >= 30) {
      const b = tryAward("streak_30");
      if (b) newlyEarned.push(b);

      // Unlock: Store card
      unlocks.push({
        type: "store",
        title: "Self-Worth Printable",
        message: "You've earned the Maravae Self-Worth Printable. Visit the store →",
        storeUrl: "https://maravae.com/collections/digital-downloads",
      });
    }

    // 4. 50 total check-ins
    if (totalCheckins >= 50) {
      const b = tryAward("checkins_50");
      if (b) newlyEarned.push(b);
    }

    // 5. 100 total check-ins
    if (totalCheckins >= 100) {
      const b = tryAward("checkins_100");
      if (b) newlyEarned.push(b);
    }

    // 6. First pathway completed
    if (completedPathways >= 1) {
      const b = tryAward("pathway_complete");
      if (b) newlyEarned.push(b);
    }

    // Build earned badges list (sorted by display order)
    const allBadges = getUserBadges(userId);
    const earnedBadges: EarnedBadge[] = [];
    for (const orderKey of BADGE_DISPLAY_ORDER) {
      const def = BADGE_DEFS[orderKey];
      if (!def) continue;
      const dbBadge = allBadges.find((b) => b.badge_key === orderKey);
      if (dbBadge) {
        earnedBadges.push({
          key: def.key,
          name: def.name,
          message: def.message,
          emoji: def.emoji,
          earnedAt: dbBadge.earned_at,
        });
      }
    }

    return {
      streak,
      badges: earnedBadges,
      newlyEarned,
      unlocks,
    };
  });
