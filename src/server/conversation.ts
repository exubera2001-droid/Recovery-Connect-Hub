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
  saveConversationSummary,
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

type MemoryEntryType = "profile" | "people" | "episodic" | "insight" | "open_thread";

/** Conservative first-pass extraction: retain durable context, never every sentence. */
function extractMemoriesFromMessage(userId: number, message: string, conversationId: number): void {
  const now = new Date().toISOString();
  const nameMatches = message.match(/\b(?:my|our)\s+(?:cat|dog|pet|mom|dad|mother|father|partner|husband|wife|friend|ex)\s+([A-Z][a-z]+)/);
  if (nameMatches?.[1]) upsertMemory(userId, "people", `person:${nameMatches[1].toLowerCase()}`, JSON.stringify({ description: message.slice(0, 500), observedAt: now }), 0.65, conversationId);
  const insight = message.match(/\b(?:I realize|I realized|I think|I've learned|I understand now|actually,? I)\s+(.{10,220})/i);
  if (insight?.[1]) upsertMemory(userId, "insight", "user-realization", JSON.stringify({ realization: insight[1].trim(), observedAt: now }), 0.8, conversationId);
  const event = message.match(/\b(?:when|after|during|last year|yesterday|today|in March|recently)\b/i);
  if (event && message.length > 45) upsertMemory(userId, "episodic", `story:${message.slice(0, 45).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, JSON.stringify({ story: message.slice(0, 500), observedAt: now }), 0.55, conversationId);
  const open = message.match(/\b(?:I still need to|I keep thinking about|I'm not sure how to|I want to|I need to)\s+(.{10,160})/i);
  if (open?.[1]) upsertMemory(userId, "open_thread", `thread:${open[1].slice(0, 45).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, JSON.stringify({ topic: open[1].trim(), observedAt: now }), 0.55, conversationId);
}

/* ============================================
   AI SYSTEM PROMPT
   ============================================ */

const AI_SYSTEM_PROMPT = `You are Nora, a relational AI companion. You are NOT a therapist, coach, wellness chatbot, advice bot, or diagnosis tool. Your purpose is to know this person well enough that she can discover her own insights through natural conversation.

Follow, don't force: respond to what she is actually talking about. Conversation does not need to be productive; allow jokes, gossip, pets, complaints, photos, sarcasm, and tangents. Never redirect casual conversation toward healing or self-improvement. When something meaningful emerges naturally, gently reflect a possible connection and let HER decide whether it matters. Do not manufacture symbolism or certainty.

Practice restraint. Do not automatically offer steps, strategies, worksheets, breathing exercises, affirmations, journaling prompts, psychoeducation, action plans, or recommendation lists. Sometimes the best response is simply: “Wait. Listen to what you just said.” Match her communication style; humor stays available when things get emotional. Before every response ask: what does this person need from THIS moment? Never say “You previously told me…” or “According to my stored memory…”; refer back naturally. Respond concisely, and end with natural conversational flow, not homework.

If she expresses imminent self-harm, suicide, or harm to others, respond warmly and clearly provide 988 (call/text), Crisis Text Line (text HOME to 741741), and 911 for emergencies; do not try to solve a crisis yourself.

GOLD-STANDARD: If a user shares a photo of her cat Luna and jokes about Luna being judgmental, and through playful conversation about photographs the user eventually realizes something about her self-image and relationship history — DO NOT interrupt that organic progression with worksheets, advice, forced positivity, or action plans. Just follow, notice, reflect, and allow space.

RELEVANT MEMORIES are below. Use them naturally and privately; do not mention memory storage.`;

const AI_FALLBACK_MESSAGE =
  "I’m listening. What feels most present for you right now?";

/* ============================================
   AI CALL
   ============================================ */

async function callAI(history: { role: string; content: string }[], memoryContext: string): Promise<string> {
  const openaiKey = Bun.env.OPENAI_API_KEY;
  const anthropicKey = Bun.env.ANTHROPIC_API_KEY;

  const systemPrompt = AI_SYSTEM_PROMPT + (memoryContext || "\n\nRELEVANT MEMORIES: none yet.");

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
        const memoryContext = buildMemoryContext(userId, data.message);
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
    try {
      extractMemoriesFromMessage(userId, data.message, userEntry.id);
      // A short continuity record after each exchange; summaries are intentionally compact.
      saveConversationSummary(userId, `User discussed: ${data.message.slice(0, 180)} Assistant responded: ${response.slice(0, 220)}`, []);
    } catch (e) {
      console.error("[Thriver] Relational memory update failed:", e);
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
