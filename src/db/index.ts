/**
 * Thriver database layer — SQLite via bun:sqlite.
 * Initializes the database (creating tables if needed) on first import.
 */
import { Database } from "bun:sqlite";
import { DDL, type User, type Checkin, type JournalEntry, type Pathway, type Conversation, type Group, type GroupMember, type GroupMessage } from "./schema";

const DB_PATH = "data/thriver.db";

let _db: Database | null = null;

/** Get (or initialize) the database singleton */
export function getDb(): Database {
  if (!_db) {
    _db = new Database(DB_PATH, { create: true });
    _db.exec("PRAGMA journal_mode=WAL;");
    _db.exec("PRAGMA foreign_keys=ON;");
    _db.exec(DDL);
  }
  return _db;
}

/* ============================================
   USER QUERIES
   ============================================ */

export function createUser(email: string, passwordHash: string): User {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING *"
  );
  return stmt.get(email, passwordHash) as User;
}

export function getUserByEmail(email: string): User | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  return (stmt.get(email) as User) ?? null;
}

export function getUserById(id: number): User | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  return (stmt.get(id) as User) ?? null;
}

/* ============================================
   CHECKIN QUERIES
   ============================================ */

export function createCheckin(
  userId: number,
  mood: string,
  notes: string | null
): Checkin {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO checkins (user_id, mood, notes) VALUES (?, ?, ?) RETURNING *"
  );
  return stmt.get(userId, mood, notes ?? null) as Checkin;
}

export function getCheckinsByUser(userId: number, limit = 30): Checkin[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
  );
  return stmt.all(userId, limit) as Checkin[];
}

export function getTodayCheckin(userId: number): Checkin | null {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM checkins WHERE user_id = ? AND date(created_at) = date('now') LIMIT 1"
  );
  return (stmt.get(userId) as Checkin) ?? null;
}

export function updateCheckin(
  id: number,
  mood: string,
  notes: string | null
): Checkin {
  const db = getDb();
  const stmt = db.prepare(
    "UPDATE checkins SET mood = ?, notes = ?, created_at = datetime('now') WHERE id = ? RETURNING *"
  );
  return stmt.get(mood, notes ?? null, id) as Checkin;
}

export function getCheckinDates(userId: number, limit = 60): string[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT DISTINCT date(created_at) as d FROM checkins WHERE user_id = ? ORDER BY d DESC LIMIT ?"
  );
  const rows = stmt.all(userId, limit) as { d: string }[];
  return rows.map((r) => r.d);
}

/* ============================================
   JOURNAL QUERIES
   ============================================ */

export function createJournalEntry(
  userId: number,
  prompt: string,
  content: string
): JournalEntry {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO journal_entries (user_id, prompt, content) VALUES (?, ?, ?) RETURNING *"
  );
  return stmt.get(userId, prompt, content) as JournalEntry;
}

export function getJournalEntriesByUser(
  userId: number,
  limit = 30
): JournalEntry[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
  );
  return stmt.all(userId, limit) as JournalEntry[];
}

export function getJournalEntryById(id: number): JournalEntry | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM journal_entries WHERE id = ?");
  return (stmt.get(id) as JournalEntry) ?? null;
}

export function updateJournalReflection(
  id: number,
  reflection: string
): JournalEntry {
  const db = getDb();
  const stmt = db.prepare(
    "UPDATE journal_entries SET ai_reflection = ? WHERE id = ? RETURNING *"
  );
  return stmt.get(reflection, id) as JournalEntry;
}

/* ============================================
   PATHWAY QUERIES
   ============================================ */

export function createPathway(
  userId: number,
  title: string,
  stepsJson: string
): Pathway {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO pathways (user_id, title, steps_json) VALUES (?, ?, ?) RETURNING *"
  );
  return stmt.get(userId, title, stepsJson) as Pathway;
}

export function getPathwaysByUser(userId: number): Pathway[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM pathways WHERE user_id = ? ORDER BY created_at DESC"
  );
  return stmt.all(userId) as Pathway[];
}

export function updatePathwayStep(
  id: number,
  currentStep: number,
  completed: boolean
): void {
  const db = getDb();
  const stmt = db.prepare(
    "UPDATE pathways SET current_step = ?, completed = ? WHERE id = ?"
  );
  stmt.run(currentStep, completed ? 1 : 0, id);
}

export function updatePathwaySteps(
  id: number,
  stepsJson: string,
  currentStep: number,
  completed: boolean
): Pathway {
  const db = getDb();
  const stmt = db.prepare(
    "UPDATE pathways SET steps_json = ?, current_step = ?, completed = ? WHERE id = ? RETURNING *"
  );
  return stmt.get(stepsJson, currentStep, completed ? 1 : 0, id) as Pathway;
}

export function getPathwayById(id: number): Pathway | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM pathways WHERE id = ?");
  return (stmt.get(id) as Pathway) ?? null;
}

/* ============================================
   DASHBOARD QUERIES
   ============================================ */

export function getJournalCountThisWeek(userId: number): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COUNT(*) as cnt FROM journal_entries
     WHERE user_id = ?
       AND date(created_at) >= date('now', 'weekday 1', '-6 days')
       AND date(created_at) <= date('now')`
  ).get(userId) as { cnt: number };
  return row?.cnt ?? 0;
}

/* ============================================
   ACCOUNT DELETION
   ============================================ */

export function deleteUser(userId: number): void {
  const db = getDb();
  // Delete related data manually (SQLite foreign keys don't cascade by default)
  db.prepare("DELETE FROM checkins WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM journal_entries WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM conversations WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM pathways WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM badges WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM group_messages WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM group_members WHERE user_id = ?").run(userId);
  // Deactivate groups created by this user
  db.prepare("UPDATE groups SET is_active = 0 WHERE created_by = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
}

/* ============================================
   CONVERSATION QUERIES
   ============================================ */

export function saveConversationExchange(
  userId: number,
  message: string,
  response: string | null
): Conversation {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO conversations (user_id, message, response) VALUES (?, ?, ?) RETURNING *"
  );
  return stmt.get(userId, message, response) as Conversation;
}

export function updateConversationResponse(
  id: number,
  response: string
): void {
  const db = getDb();
  db.prepare("UPDATE conversations SET response = ? WHERE id = ?").run(response, id);
}

export function getRecentConversations(
  userId: number,
  limit = 50
): Conversation[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at ASC LIMIT ?"
  );
  return stmt.all(userId, limit) as Conversation[];
}

export function getConversationCountThisWeek(userId: number): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COUNT(*) as cnt FROM conversations
     WHERE user_id = ?
       AND date(created_at) >= date('now', 'weekday 0', '-6 days')
       AND date(created_at) <= date('now')`
  ).get(userId) as { cnt: number };
  return row?.cnt ?? 0;
}

export function getConversationDates(
  userId: number,
  limit = 30
): { date: string; preview: string }[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT date(created_at) as d, message
     FROM conversations
     WHERE user_id = ?
     GROUP BY date(created_at)
     ORDER BY d DESC
     LIMIT ?`
  ).all(userId, limit) as { d: string; message: string }[];
  return rows.map((r) => ({
    date: r.d,
    preview: r.message.length > 80 ? r.message.slice(0, 80).trimEnd() + "…" : r.message,
  }));
}

export function hasAnyConversations(userId: number): boolean {
  const db = getDb();
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM conversations WHERE user_id = ?"
  ).get(userId) as { cnt: number };
  return (row?.cnt ?? 0) > 0;
}

/* ============================================
   TIER MANAGEMENT
   ============================================ */

export function updateUserTier(userId: number, tier: "free" | "thrive" | "organization"): void {
  const db = getDb();
  db.prepare("UPDATE users SET tier = ? WHERE id = ?").run(tier, userId);
}

/* ============================================
   BADGE QUERIES
   ============================================ */

export function awardBadge(userId: number, badgeKey: string): { id: number; badge_key: string; earned_at: string } | null {
  const db = getDb();
  try {
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO badges (user_id, badge_key) VALUES (?, ?) RETURNING id, badge_key, earned_at"
    );
    const result = stmt.get(userId, badgeKey) as { id: number; badge_key: string; earned_at: string } | undefined;
    return result ?? null;
  } catch {
    return null;
  }
}

export function getUserBadges(userId: number): { badge_key: string; earned_at: string }[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT badge_key, earned_at FROM badges WHERE user_id = ? ORDER BY id ASC"
  ).all(userId) as { badge_key: string; earned_at: string }[];
  return rows;
}

export function hasBadge(userId: number, badgeKey: string): boolean {
  const db = getDb();
  const row = db.prepare(
    "SELECT 1 as found FROM badges WHERE user_id = ? AND badge_key = ? LIMIT 1"
  ).get(userId, badgeKey) as { found: number } | undefined;
  return !!row;
}

/* ============================================
   AGGREGATE QUERIES (for milestones)
   ============================================ */

export function getTotalCheckinCount(userId: number): number {
  const db = getDb();
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM checkins WHERE user_id = ?"
  ).get(userId) as { cnt: number };
  return row?.cnt ?? 0;
}

export function getCompletedPathwaysCount(userId: number): number {
  const db = getDb();
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM pathways WHERE user_id = ? AND completed = 1"
  ).get(userId) as { cnt: number };
  return row?.cnt ?? 0;
}

/* ============================================
   CIRCLE / GROUP QUERIES
   ============================================ */

const CIRCLE_COLORS = [
  "#5A1F33", "#6B8E7B", "#B8976E", "#8B6F8E",
  "#6B8EAE", "#A0554A", "#7B8E6B", "#8E7B6B",
] as const;

export function getCircleColors(): readonly string[] {
  return CIRCLE_COLORS;
}

export function createGroup(
  createdBy: number,
  name: string,
  healingFocus: string,
  description: string | null,
  inviteCode: string
): Group {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO groups (name, healing_focus, description, invite_code, created_by) VALUES (?, ?, ?, ?, ?) RETURNING *"
  );
  return stmt.get(name, healingFocus, description, inviteCode, createdBy) as Group;
}

export function getGroupByInviteCode(code: string): Group | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM groups WHERE invite_code = ?");
  return (stmt.get(code) as Group) ?? null;
}

export function getGroupById(id: number): Group | null {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM groups WHERE id = ?");
  return (stmt.get(id) as Group) ?? null;
}

export function getUserGroups(userId: number): Group[] {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT g.* FROM groups g
     INNER JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = ?
     ORDER BY g.created_at DESC`
  );
  return stmt.all(userId) as Group[];
}

export function addGroupMember(
  groupId: number,
  userId: number,
  displayName: string,
  color: string
): GroupMember {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO group_members (group_id, user_id, display_name, color) VALUES (?, ?, ?, ?) RETURNING *"
  );
  return stmt.get(groupId, userId, displayName, color) as GroupMember;
}

export function getGroupMembers(groupId: number): GroupMember[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM group_members WHERE group_id = ? ORDER BY joined_at ASC"
  );
  return stmt.all(groupId) as GroupMember[];
}

export function getGroupMemberCount(groupId: number): number {
  const db = getDb();
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM group_members WHERE group_id = ?"
  ).get(groupId) as { cnt: number };
  return row?.cnt ?? 0;
}

export function isGroupMember(groupId: number, userId: number): boolean {
  const db = getDb();
  const row = db.prepare(
    "SELECT 1 as found FROM group_members WHERE group_id = ? AND user_id = ? LIMIT 1"
  ).get(groupId, userId) as { found: number } | undefined;
  return !!row;
}

export function sendGroupMessage(
  groupId: number,
  userId: number | null,
  content: string,
  isDailyPrompt: boolean,
  isFlagged = false
): GroupMessage {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO group_messages (group_id, user_id, content, is_daily_prompt, is_flagged) VALUES (?, ?, ?, ?, ?) RETURNING *"
  );
  return stmt.get(groupId, userId, content, isDailyPrompt ? 1 : 0, isFlagged ? 1 : 0) as GroupMessage;
}

export function getGroupMessages(groupId: number, limit = 100): GroupMessage[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM group_messages WHERE group_id = ? ORDER BY created_at ASC LIMIT ?"
  );
  return stmt.all(groupId, limit) as GroupMessage[];
}

export function getUserMessageCountToday(groupId: number, userId: number): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COUNT(*) as cnt FROM group_messages
     WHERE group_id = ? AND user_id = ? AND date(created_at) = date('now')`
  ).get(groupId, userId) as { cnt: number };
  return row?.cnt ?? 0;
}

export function removeGroupMember(groupId: number, userId: number): void {
  const db = getDb();
  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(groupId, userId);
  // If 0 members remain, deactivate the group
  const remaining = getGroupMemberCount(groupId);
  if (remaining === 0) {
    db.prepare("UPDATE groups SET is_active = 0 WHERE id = ?").run(groupId);
  }
}

export function getGroupWithMemberInfo(groupId: number): {
  group: Group;
  members: GroupMember[];
  messageCount: number;
} | null {
  const db = getDb();
  const group = getGroupById(groupId);
  if (!group) return null;

  const members = getGroupMembers(groupId);
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM group_messages WHERE group_id = ?"
  ).get(groupId) as { cnt: number };

  return { group, members, messageCount: row?.cnt ?? 0 };
}

export function generateInviteCode(): string {
  const db = getDb();
  let code: string;
  let attempts = 0;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    // Ensure exactly 6 chars (pad if needed with random chars)
    while (code.length < 6) {
      code += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
    const exists = db.prepare("SELECT 1 as found FROM groups WHERE invite_code = ? LIMIT 1").get(code);
    if (!exists) break;
    attempts++;
  } while (attempts < 10);
  return code;
}

export function getUserGroupCount(userId: number): number {
  const db = getDb();
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM group_members WHERE user_id = ?"
  ).get(userId) as { cnt: number };
  return row?.cnt ?? 0;
}

export function getTodaysPrompt(groupId: number): GroupMessage | null {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT * FROM group_messages
     WHERE group_id = ? AND is_daily_prompt = 1 AND date(created_at) = date('now')
     ORDER BY created_at DESC LIMIT 1`
  );
  return (stmt.get(groupId) as GroupMessage) ?? null;
}

export function deactivateGroup(groupId: number): void {
  const db = getDb();
  db.prepare("UPDATE groups SET is_active = 0 WHERE id = ?").run(groupId);
}

/* ============================================
   MEMORY QUERIES
   ============================================ */

import type { MemoryEntry } from "./schema";

export function upsertMemory(
  userId: number,
  type: MemoryEntry["type"],
  key: string,
  content: string,
  confidence: number,
  sourceConversationId: number | null
): MemoryEntry {
  const db = getDb();
  // Upsert: update if exists, insert if not
  const existing = db.prepare(
    "SELECT id, confidence, content FROM memory_entries WHERE user_id = ? AND key = ? LIMIT 1"
  ).get(userId, key) as { id: number; confidence: number; content: string } | undefined;

  if (existing) {
    // Merge content and increase confidence
    const oldContent = JSON.parse(existing.content || "{}");
    const newContent = JSON.parse(content);
    const merged = JSON.stringify({ ...oldContent, ...newContent });
    const newConfidence = Math.min(1, existing.confidence * 0.7 + confidence * 0.3); // Weighted moving average

    const stmt = db.prepare(
      "UPDATE memory_entries SET content = ?, confidence = ?, updated_at = datetime('now') WHERE id = ? RETURNING *"
    );
    return stmt.get(merged, newConfidence, existing.id) as MemoryEntry;
  } else {
    const stmt = db.prepare(
      "INSERT INTO memory_entries (user_id, type, key, content, confidence, source_conversation_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
    );
    return stmt.get(userId, type, key, content, confidence, sourceConversationId) as MemoryEntry;
  }
}

export function getTopMemories(userId: number, limit = 10): MemoryEntry[] {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT * FROM memory_entries 
     WHERE user_id = ? 
     ORDER BY confidence DESC, last_used_at DESC 
     LIMIT ?`
  );
  return stmt.all(userId, limit) as MemoryEntry[];
}

export function touchMemory(id: number): void {
  const db = getDb();
  db.prepare("UPDATE memory_entries SET last_used_at = datetime('now') WHERE id = ?").run(id);
}

export function buildMemoryContext(userId: number, limit = 8): string {
  const memories = getTopMemories(userId, limit);
  if (memories.length === 0) return "";

  const lines = memories.map((m) => {
    const content = JSON.parse(m.content || "{}");
    const label = content.label || content.goal || content.name || m.key;
    const typeLabel =
      m.type === "goal" ? "Goal" :
      m.type === "theme" ? "Pattern" :
      m.type === "relationship" ? "Relationship" :
      m.type === "struggle" ? "Challenge" :
      m.type === "breakthrough" ? "Growth" :
      m.type === "preference" ? "Prefers" : "Knows";

    return `- [${typeLabel}] ${label}`;
  });

  return `\nYou know this about the user:\n${lines.join("\n")}\nReference these naturally when relevant — don't list them, just weave them in.`;
}
