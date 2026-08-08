/** Database schema types for Thriver */

export interface User {
  id: number;
  email: string;
  password_hash: string;
  tier: "free" | "thrive" | "organization";
  created_at: string;
}

export interface Checkin {
  id: number;
  user_id: number;
  mood: string;
  notes: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: number;
  user_id: number;
  prompt: string;
  content: string;
  ai_reflection: string | null;
  created_at: string;
}

export interface Pathway {
  id: number;
  user_id: number;
  title: string;
  steps_json: string;
  current_step: number;
  completed: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  message: string;
  response: string | null;
  created_at: string;
}

export interface Badge {
  id: number;
  user_id: number;
  badge_key: string;
  earned_at: string;
}

export interface Group {
  id: number;
  name: string;
  healing_focus: string;
  description: string | null;
  invite_code: string;
  created_by: number;
  is_active: number;
  created_at: string;
}

export interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  display_name: string;
  color: string;
  joined_at: string;
}

export interface GroupMessage {
  id: number;
  group_id: number;
  user_id: number | null;
  content: string;
  is_daily_prompt: number;
  is_flagged: number;
  created_at: string;
}

export type MemoryType = "profile" | "people" | "episodic" | "insight" | "open_thread";

export interface MemoryEntry {
  id: number;
  user_id: number;
  type: MemoryType;
  key: string;
  content: string;
  confidence: number;
  source_conversation_id: number | null;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: number;
  user_id: number;
  date: string;
  summary: string;
  key_topics: string;
  created_at: string;
}

/** Public user data (no password hash) */
export interface UserPublic {
  id: number;
  email: string;
  tier: "free" | "thrive" | "organization";
  created_at: string;
}

export const DDL = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'thrive', 'organization')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  mood TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_reflection TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pathways (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  steps_json TEXT NOT NULL DEFAULT '[]',
  current_step INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pathways_user ON pathways(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, created_at);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  badge_key TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  healing_focus TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES groups(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  display_name TEXT NOT NULL,
  color TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(group_id, user_id),
  UNIQUE(group_id, display_name)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES groups(id),
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  is_daily_prompt INTEGER NOT NULL DEFAULT 0 CHECK (is_daily_prompt IN (0, 1)),
  is_flagged INTEGER NOT NULL DEFAULT 0 CHECK (is_flagged IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_messages_user ON group_messages(user_id, created_at);

CREATE TABLE IF NOT EXISTS memory_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('profile', 'people', 'episodic', 'insight', 'open_thread')),
  key TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '{}',
  confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source_conversation_id INTEGER REFERENCES conversations(id),
  last_accessed_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, type, key)
);

CREATE INDEX IF NOT EXISTS idx_memory_user ON memory_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_user_type ON memory_entries(user_id, type);
CREATE INDEX IF NOT EXISTS idx_memory_key ON memory_entries(user_id, key);

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_topics TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_summary_user ON conversation_summaries(user_id, created_at);
`;
