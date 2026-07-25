/**
 * Thriver dashboard server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyJwt } from "../auth";
import {
  getUserById,
  getTodayCheckin,
  getCheckinDates,
  getConversationCountThisWeek,
  getPathwaysByUser,
  getJournalEntriesByUser,
  getCheckinsByUser,
} from "../db";

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

function getWeekDayDates(): { date: string; dayLabel: string }[] {
  const days: { date: string; dayLabel: string }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const labels = ["S", "M", "T", "W", "T", "F", "S"];
    days.push({ date: iso, dayLabel: labels[d.getUTCDay()]! });
  }

  return days;
}

/* ============================================
   GET DASHBOARD
   ============================================ */

export const getDashboardFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    const { userId, tier } = authenticate(data.token);

    // Today's check-in
    const todayCheckin = getTodayCheckin(userId);

    // Streak
    const dates = getCheckinDates(userId, 60);
    const streak = calculateStreak(dates);

    // Conversations this week
    const journalCount = getConversationCountThisWeek(userId);

    // Active pathways
    const allPathways = getPathwaysByUser(userId);
    const pathways = allPathways.map((p) => {
      let steps: { text: string; done: boolean }[] = [];
      try {
        steps = JSON.parse(p.steps_json);
      } catch {
        // fallback
      }
      const completedSteps = steps.filter((s) => s.done).length;
      return {
        id: p.id,
        title: p.title,
        currentStep: p.current_step,
        completed: p.completed === 1,
        totalSteps: steps.length,
        completedSteps,
      };
    });

    // Recent journal entries (last 3)
    const recentEntries = getJournalEntriesByUser(userId, 3);
    const entries = recentEntries.map((e) => ({
      id: e.id,
      prompt: e.prompt,
      snippet:
        e.content.length > 120
          ? e.content.slice(0, 120).trimEnd() + "…"
          : e.content,
      createdAt: e.created_at,
    }));

    // Week day dot grid
    const weekDays = getWeekDayDates();
    const checkedInDates = new Set(dates);
    const todayStr = new Date().toISOString().slice(0, 10);

    const weekGrid = weekDays.map((d) => ({
      ...d,
      checkedIn: checkedInDates.has(d.date),
      isToday: d.date === todayStr,
    }));

    return {
      tier,
      checkedInToday: !!todayCheckin,
      todayMood: todayCheckin?.mood ?? null,
      streak,
      journalCount,
      pathways,
      recentEntries: entries,
      weekGrid,
    };
  });

/* ============================================
   GET WEEKLY SUMMARY (Sunday–Monday only)
   ============================================ */

export const getWeeklySummaryFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);

    // Only return summary on Sunday (0) or Monday (1)
    const today = new Date();
    const dayOfWeek = today.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 1) {
      return { summary: null, isWeekend: false };
    }

    // Get this week's check-ins (Monday–Sunday)
    // If today is Sunday/Monday, "this week" means the just-completed week
    const checkins = getCheckinsByUser(userId, 100);

    // Filter to the prior Monday–Sunday period
    const weekStart = new Date(today);
    weekStart.setUTCDate(today.getUTCDate() - today.getUTCDay() - 6);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const weekEnd = new Date(today);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const weekCheckins = checkins.filter((c) => {
      const d = c.created_at.slice(0, 10);
      return d >= weekStartStr && d <= weekEndStr;
    });

    const daysCheckedIn = new Set(weekCheckins.map((c) => c.created_at.slice(0, 10))).size;

    // Most common mood
    const moodCounts: Record<string, number> = {};
    for (const c of weekCheckins) {
      moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
    }
    let mostCommonMood = "";
    let maxCount = 0;
    for (const [mood, count] of Object.entries(moodCounts)) {
      if (count > maxCount) {
        mostCommonMood = mood;
        maxCount = count;
      }
    }

    // Pathway progress this week
    const pathways = getPathwaysByUser(userId);
    let completedSteps = 0;
    for (const p of pathways) {
      let steps: { text: string; done: boolean }[] = [];
      try { steps = JSON.parse(p.steps_json); } catch {}
      completedSteps += steps.filter((s) => s.done).length;
    }

    // Journal/conversation count (already using getConversationCountThisWeek but it
    // uses 'weekday 0' — for our summary, approximate)
    const journalCount = getConversationCountThisWeek(userId);

    // Try to find one meaningful journal entry to reference
    const recentEntries = getJournalEntriesByUser(userId, 20);
    const weekEntry = recentEntries.find((e) => {
      const d = e.created_at.slice(0, 10);
      return d >= weekStartStr && d <= weekEndStr;
    });

    // Build the summary
    const parts: string[] = [];
    if (daysCheckedIn > 0) {
      parts.push(`This week you showed up ${daysCheckedIn} time${daysCheckedIn === 1 ? "" : "s"}.`);
    } else {
      parts.push("This week was quiet — and that's okay.");
    }
    if (mostCommonMood) {
      parts.push(`You felt ${mostCommonMood.toLowerCase()} most often.`);
    }
    if (completedSteps > 0) {
      parts.push(`You completed ${completedSteps} pathway step${completedSteps === 1 ? "" : "s"}.`);
    }
    if (weekEntry && weekEntry.content.length > 20) {
      // Extract a short snippet from the journal entry
      const snippet = weekEntry.content.slice(0, 80).trimEnd();
      parts.push(`You wrote about ${snippet}…`);
    }

    const summaryText = parts.join(" ") + " Here's to another week of becoming.";

    const streak = calculateStreak(getCheckinDates(userId, 60));

    return {
      summary: {
        text: summaryText,
        daysCheckedIn,
        mostCommonMood,
        completedSteps,
        journalCount,
        streak,
      },
      isWeekend: true,
    };
  });
