/**
 * Thriver journal server functions — called from client components.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyJwt } from "../auth";
import {
  getUserById,
  createJournalEntry,
  getJournalEntriesByUser,
  getJournalEntryById,
  updateJournalReflection,
} from "../db";

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

/* ============================================
   GET RECENT JOURNAL ENTRIES
   ============================================ */

export const getJournalEntriesFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);
    const entries = getJournalEntriesByUser(userId, 30);

    return {
      entries: entries.map((e) => ({
        id: e.id,
        prompt: e.prompt,
        content: e.content,
        aiReflection: e.ai_reflection,
        createdAt: e.created_at,
      })),
    };
  });

/* ============================================
   SAVE JOURNAL ENTRY
   ============================================ */

export const saveJournalEntryFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as {
      token?: string;
      prompt?: string;
      content?: string;
    };

    if (!d.prompt || typeof d.prompt !== "string" || d.prompt.trim().length === 0) {
      throw new Error("Please select a journal prompt");
    }
    if (!d.content || typeof d.content !== "string" || d.content.trim().length === 0) {
      throw new Error("Please write something before saving");
    }

    return {
      token: d.token ?? null,
      prompt: d.prompt.trim(),
      content: d.content.trim(),
    };
  })
  .handler(async ({ data }) => {
    const { userId, tier } = authenticate(data.token);
    const entry = createJournalEntry(userId, data.prompt, data.content);

    return {
      entry: {
        id: entry.id,
        prompt: entry.prompt,
        content: entry.content,
        aiReflection: entry.ai_reflection,
        createdAt: entry.created_at,
      },
      tierNote: tier === "free"
        ? "AI reflections are available on the Thrive plan"
        : null,
    };
  });

/* ============================================
   GET AI REFLECTION
   ============================================ */

const AI_SYSTEM_PROMPT = `You are Maravae — a calm, warm, emotionally intelligent companion helping a woman reflect on her journal entry. She is rebuilding after survival mode: emotionally unhealthy relationships, chronic self-abandonment, burnout, divorce, grief, or major life transitions. She is not looking to be fixed. She is looking to remember who she is and rebuild with confidence.

Your voice: calm, warm, encouraging, empowering, reflective, compassionate. Never clinical, never robotic, never preachy, never manipulative, never shame. You do not diagnose, minimize, or give unsolicited advice. You help her remember who she is — you never tell her who to become.

Core truths you embody:
- Healing isn't becoming someone new — it's remembering who you were before survival.
- Small steps create lasting transformation.
- She is not behind. She is becoming.
- Progress over perfection.
- She deserves to choose herself.

When you respond: reflect back what she expressed with genuine warmth. Validate her feelings without judgment. Gently notice any strength, courage, or growth in her words — even if she can't see it herself. Keep it to 3-5 sentences. End with a gentle question that invites her deeper, never demands an answer.`;

const AI_FALLBACK_MESSAGE =
  "Thank you for sharing this. Take a moment to re-read what you wrote — your own words often hold more wisdom than you expect. 💛";

function isAIEnabled(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

async function callAI(content: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

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
          { role: "system", content: AI_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Here is my journal entry. Please offer a compassionate reflection:\n\n${content}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
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
        max_tokens: 300,
        system: AI_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Here is my journal entry. Please offer a compassionate reflection:\n\n${content}`,
          },
        ],
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

  // Fallback (shouldn't reach here due to isAIEnabled check)
  return AI_FALLBACK_MESSAGE;
}

export const getAIReflectionFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as {
      token?: string;
      entryId?: number;
      content?: string;
    };

    if (!d.entryId || typeof d.entryId !== "number") {
      throw new Error("Entry ID is required");
    }
    if (!d.content || typeof d.content !== "string") {
      throw new Error("Journal content is required");
    }

    return {
      token: d.token ?? null,
      entryId: d.entryId,
      content: d.content,
    };
  })
  .handler(async ({ data }) => {
    const { userId, tier } = authenticate(data.token);

    // Free tier users cannot access AI reflections
    if (tier === "free") {
      return {
        error: "AI reflections are a Thrive feature",
        code: "UPGRADE_REQUIRED",
      };
    }

    // Verify the entry belongs to this user
    const entry = getJournalEntryById(data.entryId);
    if (!entry || entry.user_id !== userId) {
      throw new Error("Journal entry not found");
    }

    // If AI is not configured, return the warm fallback
    if (!isAIEnabled()) {
      const updated = updateJournalReflection(data.entryId, AI_FALLBACK_MESSAGE);
      return {
        reflection: AI_FALLBACK_MESSAGE,
        entry: {
          id: updated.id,
          prompt: updated.prompt,
          content: updated.content,
          aiReflection: updated.ai_reflection,
          createdAt: updated.created_at,
        },
      };
    }

    // AI is enabled — call the API
    let reflection: string;
    try {
      reflection = await callAI(data.content);
    } catch {
      // If the API call fails, fall back gracefully
      reflection = AI_FALLBACK_MESSAGE;
    }

    // Save the reflection to the database
    const updated = updateJournalReflection(data.entryId, reflection);

    return {
      reflection,
      entry: {
        id: updated.id,
        prompt: updated.prompt,
        content: updated.content,
        aiReflection: updated.ai_reflection,
        createdAt: updated.created_at,
      },
    };
  });
