/**
 * Thriver Community Circles server functions.
 * Private, intimate support circles of 3-8 women.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyJwt } from "../auth";
import {
  getUserById,
  createGroup,
  getGroupByInviteCode,
  getGroupById,
  getUserGroups,
  addGroupMember,
  getGroupMembers,
  getGroupMemberCount,
  isGroupMember,
  sendGroupMessage,
  getGroupMessages,
  getUserMessageCountToday,
  removeGroupMember,
  getGroupWithMemberInfo,
  generateInviteCode,
  getCircleColors,
  getUserGroupCount,
  getTodaysPrompt,
} from "../db";

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

function getMaxGroups(tier: string): number {
  if (tier === "thrive" || tier === "organization") return 5;
  return 3;
}

function getNextUnusedColor(usedColors: string[]): string {
  const palette = getCircleColors();
  for (const color of palette) {
    if (!usedColors.includes(color)) return color;
  }
  // If all colors are somehow taken, cycle through
  return palette[usedColors.length % palette.length]!;
}

const CRISIS_KEYWORDS = [
  "suicide",
  "kill myself",
  "end my life",
  "want to die",
  "don't want to live",
  "self-harm",
  "self harm",
  "hurting myself",
  "hurt myself",
  "abuse",
  "being abused",
  "being hurt",
  "violence",
  "suicidal",
];

function detectCrisis(content: string): boolean {
  const lower = content.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

const SAFETY_RESOURCES = {
  showResources: true,
  message:
    "We care about your safety. If you need immediate support, please reach out: call or text 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line). You are not alone 💛",
} as const;

/* ============================================
   CURATED DAILY PROMPTS (fallback list)
   ============================================ */

const CURATED_PROMPTS: Record<string, string[]> = {
  "Rebuilding Self-Worth": [
    "What's one small thing you did today just for you?",
    "When did you feel most like yourself this week?",
    "What's a quality in yourself that you're learning to appreciate?",
    "What would you say to a friend who felt the way you do today?",
    "Name one thing you're proud of from this past week.",
  ],
  "Setting Boundaries": [
    "What boundary felt hard to hold today?",
    "What boundary are you proud of setting recently?",
    "What does 'no' feel like in your body today?",
    "Where in your life could a small boundary make a big difference?",
    "What's one way you protected your peace this week?",
  ],
  "Finding Your Voice": [
    "What's something you wanted to say today but didn't?",
    "What truth feels ready to be spoken?",
    "When did you feel heard this week?",
    "What's a conversation you've been avoiding — and what would you say if you weren't afraid?",
    "What opinion have you kept quiet that deserves to be voiced?",
  ],
  "Healing After Divorce": [
    "What's one thing you're rediscovering about yourself?",
    "What part of today felt like a fresh start?",
    "What do you need to let yourself grieve today?",
    "What's something you're free to do now that you couldn't before?",
    "What does rebuilding look like for you right now?",
  ],
  "Grief & Loss": [
    "Share a moment of joy, no matter how small.",
    "What memory brought you comfort today?",
    "What does gentleness look like for you right now?",
    "What's something you wish others understood about your grief?",
    "How are you honoring what you've lost today?",
  ],
};

const DEFAULT_PROMPTS = [
  "What are you carrying today that you'd like to put down?",
  "What's one thing that made you smile this week?",
  "If your heart could speak without fear, what would it say?",
  "What's a small kindness someone showed you recently?",
  "What part of today are you most grateful for?",
  "What's something you're learning to let go of?",
  "When did you feel strong this week?",
  "What do you need more of in your life right now?",
  "What's one thing you wish someone had told you today?",
  "How are you really doing — beneath the 'I'm fine'?",
];

function getPromptForFocus(healingFocus: string): string {
  const prompts = CURATED_PROMPTS[healingFocus] ?? DEFAULT_PROMPTS;
  const idx = Math.floor(Math.random() * prompts.length);
  return prompts[idx]!;
}

async function generateAIPrompt(healingFocus: string): Promise<string | null> {
  const apiKey = Bun.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a warm, emotionally intelligent facilitator for a small, intimate women's support circle focused on "${healingFocus}". Generate ONE gentle, open-ended conversation starter for today. It should feel safe, inviting, and never pushy. Keep it to 1-2 sentences. Avoid clinical language. Sound like a caring friend. Do not use numbering or bullet points.`,
          },
          {
            role: "user",
            content: "Generate today's circle check-in question.",
          },
        ],
        max_tokens: 80,
        temperature: 0.8,
      }),
    });

    if (!response.ok) return null;

    const json = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch {
    return null;
  }
}

/* ============================================
   CREATE CIRCLE
   ============================================ */

export const createCircleFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as {
      token?: string;
      name?: string;
      healingFocus?: string;
      description?: string | null;
      displayName?: string;
    };
    if (!d.token || typeof d.token !== "string") throw new Error("Token required");
    if (!d.name || typeof d.name !== "string" || d.name.trim().length === 0)
      throw new Error("Circle name is required");
    if (!d.healingFocus || typeof d.healingFocus !== "string" || d.healingFocus.trim().length === 0)
      throw new Error("Healing focus is required");
    if (!d.displayName || typeof d.displayName !== "string" || d.displayName.trim().length === 0)
      throw new Error("Display name is required");
    return {
      token: d.token,
      name: d.name.trim(),
      healingFocus: d.healingFocus.trim(),
      description: d.description?.trim() ?? null,
      displayName: d.displayName.trim(),
    };
  })
  .handler(async ({ data }) => {
    const { userId, tier } = authenticate(data.token);

    // Only Thrive and organization users can create circles
    if (tier === "free") {
      throw new Error("Creating a circle requires Thrive access");
    }

    // Check group limit
    const currentCount = getUserGroupCount(userId);
    const maxGroups = getMaxGroups(tier);
    if (currentCount >= maxGroups) {
      throw new Error(`You've reached the maximum number of circles (${maxGroups}). Leave a circle to create a new one.`);
    }

    // Generate unique invite code
    const inviteCode = generateInviteCode();

    // Create the group
    const group = createGroup(
      userId,
      data.name,
      data.healingFocus,
      data.description,
      inviteCode
    );

    // Add creator as first member with first color
    const palette = getCircleColors();
    const member = addGroupMember(group.id, userId, data.displayName, palette[0]!);

    return {
      group,
      inviteCode,
      member,
    };
  });

/* ============================================
   JOIN CIRCLE
   ============================================ */

export const joinCircleFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as {
      token?: string;
      inviteCode?: string;
      displayName?: string;
    };
    if (!d.token || typeof d.token !== "string") throw new Error("Token required");
    if (!d.inviteCode || typeof d.inviteCode !== "string" || d.inviteCode.trim().length === 0)
      throw new Error("Invite code is required");
    if (!d.displayName || typeof d.displayName !== "string" || d.displayName.trim().length === 0)
      throw new Error("Display name is required");
    return {
      token: d.token,
      inviteCode: d.inviteCode.trim().toUpperCase(),
      displayName: d.displayName.trim(),
    };
  })
  .handler(async ({ data }) => {
    const { userId, tier } = authenticate(data.token);

    // Find the group by invite code
    const group = getGroupByInviteCode(data.inviteCode);
    if (!group) {
      throw new Error("Circle not found. Check your invite code and try again.");
    }

    // Check group is active
    if (!group.is_active) {
      throw new Error("This circle is no longer active.");
    }

    // Check user isn't already a member
    if (isGroupMember(group.id, userId)) {
      throw new Error("You're already a member of this circle.");
    }

    // Check member count
    const memberCount = getGroupMemberCount(group.id);
    if (memberCount >= 8) {
      throw new Error("This circle is full — circles are kept small (max 8).");
    }

    // Check user's group limit
    const currentCount = getUserGroupCount(userId);
    const maxGroups = getMaxGroups(tier);
    if (currentCount >= maxGroups) {
      throw new Error(`You've reached the maximum number of circles (${maxGroups}). Leave a circle to join a new one.`);
    }

    // Assign next unused color
    const existingMembers = getGroupMembers(group.id);
    const usedColors = existingMembers.map((m) => m.color);
    const color = getNextUnusedColor(usedColors);

    // Add member
    const member = addGroupMember(group.id, userId, data.displayName, color);

    return {
      group,
      member,
    };
  });

/* ============================================
   GET MY CIRCLES
   ============================================ */

export const getMyCirclesFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);

    const groups = getUserGroups(userId);

    const enriched = groups.map((g) => {
      const count = getGroupMemberCount(g.id);
      const members = getGroupMembers(g.id);
      return {
        ...g,
        memberCount: count,
        members: members.map((m) => ({
          id: m.id,
          displayName: m.display_name,
          color: m.color,
        })),
      };
    });

    return { circles: enriched };
  });

/* ============================================
   GET CIRCLE DETAIL
   ============================================ */

export const getCircleFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string; groupId?: number };
    if (!d.groupId || typeof d.groupId !== "number") throw new Error("groupId required");
    return { token: d.token ?? null, groupId: d.groupId };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);

    // Verify membership
    if (!isGroupMember(data.groupId, userId)) {
      throw new Error("You are not a member of this circle.");
    }

    const info = getGroupWithMemberInfo(data.groupId);
    if (!info) {
      throw new Error("Circle not found.");
    }

    const messages = getGroupMessages(data.groupId, 50);
    const dailyPrompt = getTodaysPrompt(data.groupId);
    const userMessageCount = getUserMessageCountToday(data.groupId, userId);

    // Enrich members to return only safe fields
    const members = info.members.map((m) => ({
      id: m.id,
      userId: m.user_id,
      displayName: m.display_name,
      color: m.color,
      joinedAt: m.joined_at,
    }));

    // Enrich messages with member display info
    const memberMap = new Map(members.map((m) => [m.userId, m]));
    const enrichedMessages = messages.map((msg) => {
      const member = memberMap.get(msg.user_id);
      return {
        id: msg.id,
        content: msg.content,
        isDailyPrompt: msg.is_daily_prompt === 1,
        isFlagged: msg.is_flagged === 1,
        createdAt: msg.created_at,
        sender: member
          ? { displayName: member.displayName, color: member.color }
          : { displayName: "Unknown", color: "#999999" },
        isMine: msg.user_id === userId,
      };
    });

    return {
      group: info.group,
      members,
      messages: enrichedMessages,
      dailyPrompt: dailyPrompt
        ? {
            id: dailyPrompt.id,
            content: dailyPrompt.content,
            createdAt: dailyPrompt.created_at,
          }
        : null,
      userMessageCountToday: userMessageCount,
      messageLimit: 10,
    };
  });

/* ============================================
   SEND CIRCLE MESSAGE
   ============================================ */

export const sendCircleMessageFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as {
      token?: string;
      groupId?: number;
      content?: string;
    };
    if (!d.token || typeof d.token !== "string") throw new Error("Token required");
    if (!d.groupId || typeof d.groupId !== "number") throw new Error("groupId required");
    if (!d.content || typeof d.content !== "string" || d.content.trim().length === 0)
      throw new Error("Message content is required");
    if (d.content.length > 2000) throw new Error("Message is too long (max 2000 characters)");
    return {
      token: d.token,
      groupId: d.groupId,
      content: d.content.trim(),
    };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);

    // Verify membership
    if (!isGroupMember(data.groupId, userId)) {
      throw new Error("You are not a member of this circle.");
    }

    // Check daily message limit
    const messageCount = getUserMessageCountToday(data.groupId, userId);
    if (messageCount >= 10) {
      throw new Error("You've reached today's message limit. Come back tomorrow 💛");
    }

    // Crisis detection
    const isCrisis = detectCrisis(data.content);

    const message = sendGroupMessage(
      data.groupId,
      userId,
      data.content,
      false, // not a daily prompt
      isCrisis
    );

    const member = getGroupMembers(data.groupId).find((m) => m.user_id === userId);

    return {
      message: {
        id: message.id,
        content: message.content,
        isDailyPrompt: false,
        isFlagged: message.is_flagged === 1,
        createdAt: message.created_at,
        sender: member
          ? { displayName: member.display_name, color: member.color }
          : { displayName: "Unknown", color: "#999999" },
        isMine: true,
      },
      wasFlagged: isCrisis,
      safetyResources: isCrisis ? SAFETY_RESOURCES : null,
    };
  });

/* ============================================
   LEAVE CIRCLE
   ============================================ */

export const leaveCircleFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { token?: string; groupId?: number };
    if (!d.token || typeof d.token !== "string") throw new Error("Token required");
    if (!d.groupId || typeof d.groupId !== "number") throw new Error("groupId required");
    return { token: d.token, groupId: d.groupId };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);

    // Verify membership
    if (!isGroupMember(data.groupId, userId)) {
      throw new Error("You are not a member of this circle.");
    }

    removeGroupMember(data.groupId, userId);

    return { success: true };
  });

/* ============================================
   GET DAILY PROMPT
   ============================================ */

export const getDailyPromptFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string; groupId?: number };
    if (!d.groupId || typeof d.groupId !== "number") throw new Error("groupId required");
    return { token: d.token ?? null, groupId: d.groupId };
  })
  .handler(async ({ data }) => {
    const { userId } = authenticate(data.token);

    // Verify membership
    if (!isGroupMember(data.groupId, userId)) {
      throw new Error("You are not a member of this circle.");
    }

    // Check if there's already a prompt for today
    const existing = getTodaysPrompt(data.groupId);
    if (existing) {
      return {
        prompt: {
          id: existing.id,
          content: existing.content,
          createdAt: existing.created_at,
        },
        isNew: false,
      };
    }

    // Get the group info for healing focus
    const group = getGroupById(data.groupId);
    if (!group) {
      throw new Error("Circle not found.");
    }

    // Try AI generation first, fallback to curated
    let promptText: string | null = null;
    const aiPrompt = await generateAIPrompt(group.healing_focus);
    if (aiPrompt) {
      promptText = aiPrompt;
    } else {
      promptText = getPromptForFocus(group.healing_focus);
    }

    // Save the prompt as a message (system-generated, no user)
    const message = sendGroupMessage(
      data.groupId,
      null, // system-generated
      promptText,
      true
    );

    return {
      prompt: {
        id: message.id,
        content: message.content,
        createdAt: message.created_at,
      },
      isNew: true,
    };
  });
