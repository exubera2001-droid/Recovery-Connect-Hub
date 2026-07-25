/**
 * Thriver conversation server functions — chat-based AI companion.
 * Replaces the journal-based reflection model with a conversation-first experience.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyJwt } from "../auth";
import {
  getUserById,
  saveConversationExchange,
  updateConversationResponse,
  getRecentConversations,
  getConversationCountThisWeek,
  getConversationDates,
  hasAnyConversations,
  buildMemoryContext,
  upsertMemory,
} from "../db";
import { Database } from "bun:sqlite";

/* ============================================
   REMEMBER WHEN — PAST CONVERSATION SURFACING
   ============================================ */

// Feeling words to detect emotional content
const FEELING_WORDS = [
  "anxious", "overwhelmed", "grateful", "hopeful", "peaceful",
  "sad", "angry", "scared", "lonely", "proud", "confused",
  "hurt", "loved", "exhausted", "happy", "frustrated",
  "guilty", "ashamed", "excited", "nervous", "calm",
  "worried", "stressed", "grief", "relief", "afraid",
];

function getWeekNumber(date: Date): string {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
  const weekNum = Math.ceil((days + yearStart.getDay() + 1) / 7);
  return `${date.getFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

function findEmotionalConversation(userId: number): {
  message: string;
  createdAt: string;
} | null {
  const db = new Database("data/thriver.db", { readonly: true });

  try {
    // Look at conversations from 14-28 days ago (2-4 weeks)
    const rows = db.prepare(
      `SELECT message, created_at FROM conversations
       WHERE user_id = ?
         AND date(created_at) >= date('now', '-28 days')
         AND date(created_at) <= date('now', '-14 days')
         AND response IS NOT NULL
         AND length(message) > 30
       ORDER BY created_at DESC
       LIMIT 20`
    ).all(userId) as { message: string; created_at: string }[];

    // Filter for ones with emotional words, or longer text (suggesting depth)
    const emotional = rows.filter((r) => {
      const lower = r.message.toLowerCase();
      return FEELING_WORDS.some((w) => lower.includes(w)) || r.message.length > 100;
    });

    if (emotional.length === 0) return null;

    // Pick a random one
    const idx = Math.floor(Math.random() * emotional.length);
    return {
      message: emotional[idx]!.message,
      createdAt: emotional[idx]!.created_at,
    };
  } finally {
    db.close();
  }
}

function generateRememberWhenMessage(conversation: { message: string; createdAt: string }): string {
  // Extract a short topic from the message
  let topic = conversation.message;
  if (topic.length > 80) {
    topic = topic.slice(0, 80).trimEnd() + "…";
  }

  const weeksAgo = Math.round(
    (Date.now() - new Date(conversation.createdAt + "Z").getTime()) /
      (1000 * 60 * 60 * 24 * 7)
  );

  const timePhrase = weeksAgo <= 2 ? "a couple weeks ago" :
    weeksAgo <= 3 ? "a few weeks ago" : "about a month ago";

  // Gentle observation messages — pick one at random
  const templates = [
    `💭 Remember when you mentioned "${topic}" ${timePhrase}? I notice you've been showing up for yourself since then. How does that feel now?`,
    `💭 I was thinking about something you shared ${timePhrase} about "${topic}" — it takes courage to name those things. Have your feelings shifted?`,
    `💭 You brought up "${topic}" ${timePhrase} ago. Looking back, do you see your own growth since then?`,
    `💭 Back when you talked about "${topic}" ${timePhrase}, you were working through something real. How's your heart holding that now?`,
  ];

  return templates[Math.floor(Math.random() * templates.length)]!;
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

function isAIEnabled(): boolean {
  return !!(Bun.env.OPENAI_API_KEY || Bun.env.ANTHROPIC_API_KEY);
}

/* ============================================
   MEMORY EXTRACTION
   ============================================ */

// Theme keywords for pattern detection
const THEME_PATTERNS: Record<string, { type: MemoryEntryType; keywords: string[] }> = {
  boundaries: {
    type: "theme",
    keywords: ["boundary", "boundaries", "said no", "saying no", "people pleasing", "overcommit", "can't say no", "standing up for", "stood up for"],
  },
  self_worth: {
    type: "theme",
    keywords: ["self-worth", "not good enough", "not worthy", "don't deserve", "self-esteem", "self worth", "confidence", "believe in myself", "self-doubt"],
  },
  anxiety: {
    type: "struggle",
    keywords: ["anxious", "anxiety", "panic", "overthinking", "can't stop thinking", "racing thoughts", "worried", "nervous", "on edge"],
  },
  burnout: {
    type: "struggle",
    keywords: ["burnout", "exhausted", "drained", "overwhelmed", "no energy", "running on empty", "depleted", "tired all the time"],
  },
  grief: {
    type: "struggle",
    keywords: ["grief", "loss", "miss them", "missing", "died", "gone", "mourning", "bereavement"],
  },
  relationships: {
    type: "relationship",
    keywords: ["my partner", "my husband", "my wife", "my boyfriend", "my girlfriend", "my ex", "my mom", "my dad", "my mother", "my father", "my friend", "relationship"],
  },
  growth: {
    type: "breakthrough",
    keywords: ["proud of myself", "I did it", "I finally", "progress", "getting better", "healing", "growth", "I chose myself", "I set a boundary", "first time"],
  },
};

type MemoryEntryType = "goal" | "theme" | "relationship" | "preference" | "breakthrough" | "struggle" | "fact";

function extractMemoriesFromMessage(userId: number, message: string, conversationId: number): void {
  const lower = message.toLowerCase();

  for (const [key, pattern] of Object.entries(THEME_PATTERNS)) {
    const matched = pattern.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      const label =
        key === "boundaries" ? "Boundaries" :
        key === "self_worth" ? "Self-worth" :
        key === "anxiety" ? "Anxiety & overthinking" :
        key === "burnout" ? "Burnout" :
        key === "grief" ? "Grief & loss" :
        key === "relationships" ? "Important relationships" :
        key === "growth" ? "Growth moments" : key;

      upsertMemory(
        userId,
        pattern.type,
        `theme:${key}`,
        JSON.stringify({ label, lastObserved: new Date().toISOString() }),
        0.6,
        conversationId
      );
    }
  }

  // Goal detection — if message mentions wanting to do something
  const goalPatterns = [/I want to\s+(.+)/i, /my goal is to\s+(.+)/i, /I'm working on\s+(.+)/i, /I'm trying to\s+(.+)/i];
  for (const pattern of goalPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 3) {
      const goalText = match[1].slice(0, 50).trim();
      const key = `goal:${goalText.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
      upsertMemory(
        userId,
        "goal",
        key,
        JSON.stringify({ goal: goalText, firstObserved: new Date().toISOString() }),
        0.5,
        conversationId
      );
      break; // One goal per message max
    }
  }
}

/* ============================================
   AI SYSTEM PROMPT
   ============================================ */

const AI_SYSTEM_PROMPT = `You are Thriver, an intelligent personal growth companion. You are not a therapist, not a chatbot, not a motivational quote machine. You are a trusted guide who helps people recognize patterns, organize their thoughts, reduce overwhelm, and identify their next best step.

CRITICAL RESPONSE RULES (follow these in every message):
1. First, ACKNOWLEDGE what the user actually said. If they mention a birthday, grief, an ex, anxiety — name it back. Never respond with a generic greeting that ignores their message.
2. Then, REFLECT — show you heard them. "Birthdays can bring up a lot after a loss." "That sounds really heavy." "It makes sense you feel that way."
3. Ask ONE meaningful follow-up question. Not three. One.
4. End with ONE practical next step — a single action they can take right now. Examples: write down one thought, take a five-minute walk, delay that text for 24 hours, breathe for 60 seconds, drink water, check back in tomorrow. Be specific to their situation.
5. Keep responses warm but concise — 2-4 sentences max.

Your voice: warm, intelligent, calm, curious. Never robotic, never scripted, never generic. Never say "I'm here with you" — show it by responding to what they actually said. Never repeat yourself across responses. Every response should feel like it could only be said to THIS person in THIS moment.

Reference prior conversations naturally when the memory context provides relevant information — like continuing a conversation with someone who knows you.

HARD SAFETY RULE: If a user expresses thoughts of suicide, self-harm, harming others, or appears to be in crisis:
1. Respond with warmth and care.
2. Clearly provide: 988 Suicide & Crisis Lifeline (call or text 988), Crisis Text Line (text HOME to 741741), 911 for emergencies.
3. Do not attempt to counsel or solve the crisis yourself.

You are a companion alongside therapy, friends, and community. Never a replacement for professional care.`;

const AI_FALLBACK_MESSAGE =
  "I'm here with you. Sometimes the quiet moments are where the real healing happens. 💛 What's on your heart today?";

/* ============================================
   AI CALL
   ============================================ */

async function callAI(history: { role: string; content: string }[], memoryContext: string): Promise<string> {
  const openaiKey = Bun.env.OPENAI_API_KEY;
  const anthropicKey = Bun.env.ANTHROPIC_API_KEY;

  const systemPrompt = AI_SYSTEM_PROMPT + memoryContext;

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
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
        ],
        max_tokens: 400,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${err}`);
    }

    const json = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    return json.choices[0]!.message.content.trim();
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
        max_tokens: 400,
        system: systemPrompt,
        messages: history.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const json = (await response.json()) as {
      content: { text: string }[];
    };
    return json.content[0]!.text.trim();
  }

  // Fallback
  return AI_FALLBACK_MESSAGE;
}

/* ============================================
   GET CONVERSATION
   ============================================ */

export const getConversationFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    const { userId, tier } = authenticate(data.token);

    const conversations = getRecentConversations(userId, 50);
    const isFirstConversation = !hasAnyConversations(userId);
    const weeklyCount = getConversationCountThisWeek(userId);

    // Build conversation history for the AI context
    const history = conversations.map((c) => [
      { role: "user" as const, content: c.message },
      ...(c.response ? [{ role: "assistant" as const, content: c.response }] : []),
    ]).flat();

    // Generate greeting if this is the first conversation or returning user
    let greeting: string | null = null;

    if (!isAIEnabled()) {
      greeting = isFirstConversation
        ? "Hi, I'm Thriver. 💛 I'm here to walk alongside you — no judgment, no pressure. How are you feeling today?"
        : "Welcome back. 💛 How are you feeling today?";
    }

    // Remember When — surface a past conversation once per week
    let rememberWhen: string | null = null;
    const now = new Date();
    const currentWeek = getWeekNumber(now);

    // Try to find an emotional conversation from 2-4 weeks ago
    if (!isFirstConversation) {
      const emotionalConv = findEmotionalConversation(userId);
      if (emotionalConv) {
        rememberWhen = generateRememberWhenMessage(emotionalConv);
      }
    }

    const isThrive = tier === "thrive" || tier === "organization";
    const weeklyLimit = 5;
    const conversationsRemaining = isThrive ? null : Math.max(0, weeklyLimit - weeklyCount);

    return {
      messages: conversations.map((c) => ({
        id: c.id,
        message: c.message,
        response: c.response,
        createdAt: c.created_at,
      })),
      history,
      isFirstConversation,
      greeting,
      rememberWhen,
      tier,
      isThrive,
      weeklyLimit,
      weeklyCount,
      conversationsRemaining,
    };
  });

/* ============================================
   SEND MESSAGE
   ============================================ */

export const sendMessageFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as {
      token?: string;
      message?: string;
    };

    if (!d.message || typeof d.message !== "string" || d.message.trim().length === 0) {
      throw new Error("Please type a message");
    }

    return {
      token: d.token ?? null,
      message: d.message.trim(),
    };
  })
  .handler(async ({ data }) => {
    console.log("[Thriver] AI enabled:", isAIEnabled(), "Key present:", !!Bun.env.OPENAI_API_KEY);
    const { userId, tier } = authenticate(data.token);

    // Check weekly limits for free users
    const isThrive = tier === "thrive" || tier === "organization";
    if (!isThrive) {
      const weeklyCount = getConversationCountThisWeek(userId);
      if (weeklyCount >= 5) {
        return {
          error: "You've used your conversations for this week. Upgrade to Thrive for unlimited conversations and full memory. Your conversations reset on Sunday.",
          code: "WEEKLY_LIMIT_REACHED",
        };
      }
    }

    // First save the user message
    const userEntry = saveConversationExchange(userId, data.message, null);

    // Build conversation history for AI context
    const conversations = getRecentConversations(userId, 50);
    const history: { role: string; content: string }[] = [];

    // For Thrive users, include full history for memory
    const contextConversations = isThrive ? conversations : conversations.slice(-6);

    for (const c of contextConversations) {
      if (c.response) {
        history.push({ role: "user", content: c.message });
        history.push({ role: "assistant", content: c.response });
      }
    }

    // Add the user's current message to history (it was saved but has no response yet)
    history.push({ role: "user", content: data.message });

    // Get AI response
    let response: string;
    if (!isAIEnabled()) {
      console.log("[Thriver] AI not enabled — using fallback");
      response = AI_FALLBACK_MESSAGE;
    } else {
      try {
        // Build memory context for this user
        const memoryContext = isThrive ? buildMemoryContext(userId) : "";
        console.log("[Thriver] Calling AI with history length:", history.length, "memory:", !!memoryContext);
        response = await callAI(history, memoryContext);
        console.log("[Thriver] AI response received:", response.slice(0, 50) + "...");
      } catch (err) {
        console.error("[Thriver] AI call failed:", err);
        response = AI_FALLBACK_MESSAGE;
      }
    }

    // Save the AI response
    updateConversationResponse(userEntry.id, response);

    userEntry.response = response;

    // Memory extraction — fire and forget for Thrive users
    if (isThrive) {
      try {
        extractMemoriesFromMessage(userId, data.message, userEntry.id);
      } catch (e) {
        // Silent failure — memory extraction should never break the conversation
        console.error("[Thriver] Memory extraction failed:", e);
      }
    }

    const newWeeklyCount = getConversationCountThisWeek(userId);
    const conversationsRemaining = isThrive ? null : Math.max(0, 5 - newWeeklyCount);

    return {
      message: {
        id: userEntry.id,
        message: userEntry.message,
        response,
        createdAt: userEntry.created_at,
      },
      conversationsRemaining,
    };
  });

/* ============================================
   GET CONVERSATION HISTORY (dates/previews)
   ============================================ */

export const getConversationHistoryFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);
    const dates = getConversationDates(userId, 30);
    return { dates };
  });
