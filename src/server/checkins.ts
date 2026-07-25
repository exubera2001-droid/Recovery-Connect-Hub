/**
 * Thriver check-in server functions — called from client components.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyJwt } from "../auth";
import {
  getUserById,
  getTodayCheckin,
  createCheckin as dbCreateCheckin,
  updateCheckin as dbUpdateCheckin,
  getCheckinDates,
} from "../db";

/* ============================================
   HELPERS
   ============================================ */

function authenticate(token: unknown): { userId: number; email: string } {
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
  return { userId: user.id, email: user.email };
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // The most recent check-in must be today or yesterday for streak to be active
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
   GET TODAY'S CHECK-IN
   ============================================ */

export const getTodayCheckinFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);
    const checkin = getTodayCheckin(userId);
    const dates = getCheckinDates(userId, 60);
    const streak = calculateStreak(dates);

    return {
      checkin: checkin
        ? {
            id: checkin.id,
            mood: checkin.mood,
            notes: checkin.notes,
            createdAt: checkin.created_at,
          }
        : null,
      streak,
    };
  });

/* ============================================
   CREATE / UPDATE CHECK-IN
   ============================================ */

export const saveCheckinFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as {
      token?: string;
      mood?: string;
      notes?: string | null;
    };

    if (!d.mood || typeof d.mood !== "string") {
      throw new Error("Please select how you're feeling");
    }

    const validMoods = [
      "Hopeful",
      "Grateful",
      "Tired",
      "Overwhelmed",
      "Peaceful",
      "Anxious",
    ];
    if (!validMoods.includes(d.mood)) {
      throw new Error("Invalid mood selection");
    }

    const notes =
      d.notes && typeof d.notes === "string" && d.notes.trim().length > 0
        ? d.notes.trim()
        : null;

    return { token: d.token ?? null, mood: d.mood, notes };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);

    // Check if user already checked in today
    const existing = getTodayCheckin(userId);

    let checkin;
    if (existing) {
      checkin = dbUpdateCheckin(existing.id, data.mood, data.notes);
    } else {
      checkin = dbCreateCheckin(userId, data.mood, data.notes);
    }

    const dates = getCheckinDates(userId, 60);
    const streak = calculateStreak(dates);

    return {
      checkin: {
        id: checkin.id,
        mood: checkin.mood,
        notes: checkin.notes,
        createdAt: checkin.created_at,
      },
      streak,
    };
  });
