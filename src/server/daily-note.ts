/**
 * Thriver daily note from Heidi — a short daily reflection.
 * Reads from data/daily-notes.json, returns today's note if available.
 */
import { createServerFn } from "@tanstack/react-start";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const NOTES_PATH = resolve(process.cwd(), "data/daily-notes.json");

interface DailyNote {
  date: string; // YYYY-MM-DD
  note: string;
  author: string;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadNotes(): DailyNote[] {
  if (!existsSync(NOTES_PATH)) return [];
  try {
    const raw = readFileSync(NOTES_PATH, "utf-8");
    return JSON.parse(raw) as DailyNote[];
  } catch {
    return [];
  }
}

export const getDailyNoteFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const today = getTodayStr();
    const notes = loadNotes();
    const todayNote = notes.find((n) => n.date === today) ?? null;
    return { note: todayNote };
  });
