import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getTodayCheckinFn, saveCheckinFn } from "../../server/checkins";

export const Route = createFileRoute("/app/home")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("thriver_token") : null;

  const [checkedInToday, setCheckedInToday] = useState<boolean | null>(null);
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  useEffect(() => {
    if (!token) {
      navigate({ to: "/login" });
      return;
    }
    fetchToday();
  }, []);

  async function fetchToday() {
    try {
      const result = await getTodayCheckinFn({ data: { token } });
      const data = result as any;
      if (data && data.mood) {
        setCheckedInToday(true);
        setTodayMood(data.mood);
      } else {
        setCheckedInToday(false);
      }
    } catch {
      setCheckedInToday(false);
    }
  }

  async function handleMood(mood: string) {
    if (mood === "struggling") {
      navigate({ to: "/app/struggling" });
      return;
    }

    setSaving(true);
    try {
      const result = await saveCheckinFn({ data: { token, mood, notes: null } });
      console.log("[Home] Check-in saved:", result);
      setCheckedInToday(true);
      setTodayMood(mood);
    } catch (e) {
      console.error("[Home] Check-in failed:", e);
    } finally {
      setSaving(false);
    }
  }

  function moodLabel(mood: string) {
    if (mood === "good") return "I'm doing well";
    if (mood === "okay") return "I'm okay";
    return mood;
  }

  const quickCards = [
    { emoji: "💭", label: "My Thoughts", route: "/app/journal" },
    { emoji: "📈", label: "Progress", route: "/app/dashboard" },
    { emoji: "🌿", label: "Community", route: "/app/community" },
    { emoji: "🪞", label: "Reflection", route: "/app/assessment" },
  ];

  // Daily encouragements — one per day of the month
  const encouragements = [
    "Small steps are still forward motion.",
    "Healing isn't linear — and that's okay.",
    "Peace is built one decision at a time.",
    "You don't have to figure it all out today.",
    "Rest is productive.",
    "You are allowed to take up space.",
    "Progress, not perfection.",
    "Your feelings are valid — all of them.",
    "You've survived every hard day so far.",
    "Choosing yourself is never selfish.",
    "One breath at a time.",
    "You are not behind. You are becoming.",
    "Boundaries are a form of self-respect.",
    "It's okay to not be okay today.",
    "You're doing better than you think.",
    "Growth happens in the quiet moments.",
    "Trust your own timing.",
    "You are worthy of peace.",
    "The hardest step is the first one.",
    "Today is a fresh start.",
    "You are stronger than you know.",
    "Letting go is also growth.",
    "Your story isn't over yet.",
    "Be gentle with yourself today.",
    "You matter — exactly as you are.",
    "Courage isn't the absence of fear.",
    "You're allowed to change your mind.",
    "Healing takes time — give yourself grace.",
    "You are enough, right now.",
    "One day at a time.",
    "The world is better with you in it.",
  ];
  const todayEncouragement = encouragements[now.getDate() % encouragements.length];

  return (
    <div style={{ padding: "0 var(--space-4)", paddingBottom: "24px" }}>
      {/* Greeting */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-2xl)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            margin: "0 0 var(--space-1)",
          }}
        >
          {greeting}
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", margin: 0 }}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Daily Encouragement */}
      <div
        style={{
          background: "var(--color-accent-light)",
          borderLeft: "3px solid var(--color-accent)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3) var(--space-4)",
          marginBottom: "var(--space-5)",
          fontStyle: "italic",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
          lineHeight: 1.5,
        }}
      >
        {todayEncouragement}
      </div>

      {/* Check-In */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <p
          style={{
            fontSize: "var(--text-base)",
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-3)",
          }}
        >
          How are you today?
        </p>

        {checkedInToday === true && todayMood ? (
          <div
            style={{
              padding: "var(--space-4)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-primary-light)",
              borderRadius: "var(--radius-lg)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              Thanks for checking in 💛 — {moodLabel(todayMood)}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {[
              { emoji: "😊", mood: "good", label: "I'm doing well" },
              { emoji: "😐", mood: "okay", label: "I'm okay" },
              { emoji: "🤍", mood: "struggling", label: "I'm struggling right now" },
            ].map((opt) => (
              <button
                key={opt.mood}
                onClick={() => handleMood(opt.mood)}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  width: "100%",
                  padding: "var(--space-4)",
                  background: "var(--color-surface)",
                  border: `2px solid var(--color-border)`,
                  borderRadius: "var(--radius-lg)",
                  cursor: saving ? "default" : "pointer",
                  fontSize: "var(--text-base)",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-primary)",
                  textAlign: "left",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Find My Next Step */}
      <button
        onClick={() => navigate({ to: "/app/journal" })}
        style={{
          width: "100%",
          minHeight: 56,
          background: "var(--color-primary)",
          color: "#fff",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-lg)",
          fontWeight: 600,
          border: "none",
          borderRadius: "var(--radius-xl)",
          cursor: "pointer",
          boxShadow: "var(--shadow-sm)",
          marginBottom: "var(--space-6)",
        }}
      >
        🌱 Find My Next Step
      </button>

      {/* Quick Access Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-3)",
        }}
      >
        {quickCards.map((card) => (
          <button
            key={card.route}
            onClick={() => navigate({ to: card.route })}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-2)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>{card.emoji}</span>
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
              }}
            >
              {card.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
