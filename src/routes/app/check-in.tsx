import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { getTodayCheckinFn, saveCheckinFn } from "../../server/checkins";

/* ============================================
   TYPES
   ============================================ */

interface CheckinData {
  id: number;
  mood: string;
  notes: string | null;
  createdAt: string;
}

const MOODS = [
  { emoji: "🌱", label: "Hopeful" },
  { emoji: "🙏", label: "Grateful" },
  { emoji: "😴", label: "Tired" },
  { emoji: "😰", label: "Overwhelmed" },
  { emoji: "😌", label: "Peaceful" },
  { emoji: "😟", label: "Anxious" },
] as const;

type MoodLabel = (typeof MOODS)[number]["label"];

/* ============================================
   HELPER: get token
   ============================================ */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("thriver_token");
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getInitial(): string {
  const token = getToken();
  if (!token) return "?";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!));
    return (payload.email as string).charAt(0).toUpperCase();
  } catch {
    return "?";
  }
}

/* ============================================
   STREAK BADGE SUB-COMPONENT
   ============================================ */

function StreakBadge({ streak }: { streak: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-2) var(--space-4)",
        background: "var(--color-accent-light)",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--text-sm)",
        fontWeight: 600,
        color: "var(--color-accent-hover)",
        width: "fit-content",
      }}
    >
      <span style={{ fontSize: "1rem" }}>✦</span>
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--color-accent-hover)",
        }}
      >
        {streak}
      </span>{" "}
      day streak
    </div>
  );
}

/* ============================================
   LOADING STATE
   ============================================ */

function LoadingState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: "var(--space-16)",
        gap: "var(--space-4)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid var(--color-border)",
          borderTopColor: "var(--color-primary)",
          borderRadius: "var(--radius-full)",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--text-sm)",
          fontFamily: "var(--font-body)",
        }}
      >
        Loading your check-in…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ============================================
   COMPLETED STATE
   ============================================ */

function CompletedState({
  checkin,
  streak,
}: {
  checkin: CheckinData;
  streak: number;
}) {
  const mood = MOODS.find((m) => m.label === checkin.mood);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Streak Badge */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <StreakBadge streak={streak} />
      </div>

      {/* Completed Card */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-4)",
        }}
      >
        {/* Check icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "var(--radius-full)",
            background: "var(--color-safe-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.75rem",
          }}
        >
          ✓
        </div>

        <div>
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-xl)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            You checked in today
          </h3>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--text-sm)",
              marginTop: "var(--space-2)",
            }}
          >
            Come back tomorrow to keep your streak going.
          </p>
        </div>

        {/* Mood display */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-5)",
            background: "var(--color-primary-light)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>{mood?.emoji}</span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              color: "var(--color-primary)",
            }}
          >
            Feeling {checkin.mood}
          </span>
        </div>

        {/* Notes */}
        {checkin.notes && (
          <div
            style={{
              width: "100%",
              padding: "var(--space-4)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            "{checkin.notes}"
          </div>
        )}
      </div>

      {/* Encouraging footer */}
      <p
        className="text-script"
        style={{
          fontFamily: "var(--font-script)",
          fontSize: "1.125rem",
          color: "var(--color-text-muted)",
          textAlign: "center",
          margin: 0,
        }}
      >
        One small step every day.
      </p>
    </div>
  );
}

/* ============================================
   CHECK-IN FORM STATE
   ============================================ */

function CheckInForm({
  onSaved,
}: {
  onSaved: (checkin: CheckinData, streak: number) => void;
}) {
  const [selectedMood, setSelectedMood] = useState<MoodLabel | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = getInitial();

  const handleSave = useCallback(async () => {
    if (!selectedMood) {
      setError("Please select how you're feeling");
      return;
    }

    const token = getToken();
    if (!token) {
      setError("Please log in again");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveCheckinFn({
        data: { token, mood: selectedMood, notes: notes || null },
      });

      if (!result || !result.checkin) {
        throw new Error("Something went wrong. Please try again.");
      }

      onSaved(result.checkin, result.streak);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }, [selectedMood, notes, onSaved]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Greeting Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-2xl)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {getGreeting()}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              margin: "2px 0 0",
            }}
          >
            {formatDate()}
          </p>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-full)",
            background: "var(--color-primary-light)",
            color: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
      </div>

      {/* Emotion Grid */}
      <div>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--color-text-muted)",
            margin: "0 0 var(--space-3)",
          }}
        >
          How are you feeling today?
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-3)",
          }}
        >
          {MOODS.map((mood) => {
            const isSelected = selectedMood === mood.label;
            return (
              <button
                key={mood.label}
                type="button"
                onClick={() => {
                  setSelectedMood(mood.label);
                  setError(null);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-2)",
                  minHeight: 82,
                  padding: "var(--space-3) var(--space-2)",
                  background: isSelected
                    ? "var(--color-primary)"
                    : "var(--color-surface)",
                  border: isSelected
                    ? "2px solid var(--color-primary)"
                    : "2px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  transition:
                    "border-color 150ms ease, background 150ms ease, transform 150ms ease",
                  transform: isSelected ? "scale(1.02)" : "scale(1)",
                }}
              >
                <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>
                  {mood.emoji}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    color: isSelected ? "#FFFFFF" : "var(--color-text-secondary)",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {mood.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          className="label"
          htmlFor="checkin-notes"
          style={{ marginBottom: "var(--space-2)" }}
        >
          What's on your heart today?
        </label>
        <textarea
          id="checkin-notes"
          className="input-field"
          placeholder="Take a moment to reflect…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ minHeight: 80, resize: "vertical" }}
          rows={2}
        />
        <p
          className="helper-text"
          style={{ marginTop: "var(--space-2)" }}
        >
          Optional. There are no wrong answers here.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p
          style={{
            color: "var(--color-gentle-error)",
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-body)",
            margin: 0,
            textAlign: "center",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--color-gentle-error-light)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {error}
        </p>
      )}

      {/* Save Button */}
      <button
        type="button"
        className="btn-primary"
        disabled={saving || !selectedMood}
        onClick={handleSave}
      >
        {saving ? "Saving…" : "Save check-in"}
      </button>
    </div>
  );
}

/* ============================================
   PAGE COMPONENT
   ============================================ */

export const Route = createFileRoute("/app/check-in")({
  component: CheckInPage,
});

function CheckInPage() {
  const [state, setState] = useState<
    "loading" | "completed" | "form"
  >("loading");
  const [checkin, setCheckin] = useState<CheckinData | null>(null);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Please log in");
      setState("form");
      return;
    }

    getTodayCheckinFn({ data: { token } })
      .then((result) => {
        setStreak(result.streak);
        if (result.checkin) {
          setCheckin(result.checkin);
          setState("completed");
        } else {
          setState("form");
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load check-in"
        );
        setState("form");
      });
  }, []);

  const handleSaved = useCallback(
    (savedCheckin: CheckinData, newStreak: number) => {
      setCheckin(savedCheckin);
      setStreak(newStreak);
      setState("completed");
    },
    []
  );

  if (state === "loading") {
    return <LoadingState />;
  }

  if (error && state === "form" && !checkin) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "var(--space-16)",
          gap: "var(--space-4)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--color-gentle-error)", fontSize: "var(--text-base)" }}>
          {error}
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Always show streak badge at top when we have data */}
      {state !== "loading" && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <StreakBadge streak={streak} />
        </div>
      )}

      {state === "completed" && checkin && (
        <CompletedState checkin={checkin} streak={streak} />
      )}

      {state === "form" && <CheckInForm onSaved={handleSaved} />}
    </div>
  );
}
