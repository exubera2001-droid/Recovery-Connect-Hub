/**
 * Thriver daily affirmation — personalized or curated.
 * Uses AI if available, otherwise rotates through a curated list.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyJwt } from "../auth";
import {
  getUserById,
  getCheckinDates,
  getRecentConversations,
  getCheckinsByUser,
} from "../db";

/* ============================================
   CURATED AFFIRMATIONS (fallback when no AI)
   ============================================ */

const CURATED_AFFIRMATIONS = [
  "You are learning to protect your peace.",
  "Your feelings deserve space to breathe.",
  "What you need matters, too.",
  "You are allowed to rest without guilt.",
  "Small steps are still forward motion.",
  "You're doing better than you think.",
  "Your voice deserves to be heard.",
  "Healing happens in gentle moments.",
  "You are worthy of kindness — especially your own.",
  "Let today be gentle with you.",
  "Peace is something you practice, not something you earn.",
  "You are not the hard things that happened.",
  "Showing up for yourself is brave.",
  "There is no finish line for becoming.",
  "You belong to yourself first.",
  "Your boundaries are an act of love.",
  "Rest is part of the work.",
  "You are whole — even while healing.",
  "One kind thought toward yourself is progress.",
  "You are allowed to change your mind.",
];

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

function isAIEnabled(): boolean {
  return !!(Bun.env.OPENAI_API_KEY || Bun.env.ANTHROPIC_API_KEY);
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/* ============================================
   AI AFFIRMATION GENERATION
   ============================================ */

async function generateAffirmation(
  recentMoods: string[],
  conversationTopics: string
): Promise<string> {
  const openaiKey = Bun.env.OPENAI_API_KEY;
  const anthropicKey = Bun.env.ANTHROPIC_API_KEY;

  const systemPrompt =
    "Based on this woman's recent check-ins and conversations, generate ONE short, warm affirmation. " +
    "4th-5th grade reading level. Never toxic positivity. Ground it in what she's actually experiencing. " +
    "Max 12 words. Just the affirmation, no preamble. No quotes around it.";

  const userPrompt =
    `Recent moods: ${recentMoods.join(", ") || "no data"}. ` +
    `Recent conversation topics: ${conversationTopics || "no data"}.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  // Try OpenAI first
  if (openaiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 50,
        temperature: 0.9,
      }),
    });

    if (response.ok) {
      const json = (await response.json()) as {
        choices: { message: { content: string } }[];
      };
      return json.choices[0]!.message.content.trim();
    }
  }

  // Try Anthropic
  if (anthropicKey) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 50,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (response.ok) {
      const json = (await response.json()) as {
        content: { text: string }[];
      };
      return json.content[0]!.text.trim();
    }
  }

  // Fallback: pick from curated list
  const dayOfYear = getDayOfYear();
  return CURATED_AFFIRMATIONS[dayOfYear % CURATED_AFFIRMATIONS.length]!;
}

/* ============================================
   GET DAILY AFFIRMATION
   ============================================ */

export const getDailyAffirmationFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);

    if (!isAIEnabled()) {
      const dayOfYear = getDayOfYear();
      return {
        affirmation: CURATED_AFFIRMATIONS[dayOfYear % CURATED_AFFIRMATIONS.length]!,
        personalized: false,
      };
    }

    try {
      // Gather recent context
      const recentCheckins = getCheckinsByUser(userId, 7);
      const recentMoods = recentCheckins.map((c) => c.mood);

      const recentConversations = getRecentConversations(userId, 10);
      const topics = recentConversations
        .map((c) => c.message)
        .filter((m) => m.length > 10)
        .slice(0, 5)
        .join("; ");

      const affirmation = await generateAffirmation(recentMoods, topics);

      // Safety: if AI hallucinates a very long response, truncate
      const clean = affirmation.length > 80 ? affirmation.slice(0, 77) + "…" : affirmation;

      return { affirmation: clean, personalized: true };
    } catch {
      // Fallback to curated on error
      const dayOfYear = getDayOfYear();
      return {
        affirmation: CURATED_AFFIRMATIONS[dayOfYear % CURATED_AFFIRMATIONS.length]!,
        personalized: false,
      };
    }
  });
