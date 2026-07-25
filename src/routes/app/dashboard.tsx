import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getDashboardFn, getWeeklySummaryFn } from "../../server/dashboard";
import { getDailyAffirmationFn } from "../../server/affirmations";
import { getDailyNoteFn } from "../../server/daily-note";
import { getStoreLinkFn } from "../../server/store";
import { getRewardsFn, type EarnedBadge, type Unlock } from "../../server/rewards";

/* ============================================
   TYPES
   ============================================ */

interface PathwaySummary {
  id: number;
  title: string;
  currentStep: number;
  completed: boolean;
  totalSteps: number;
  completedSteps: number;
}

interface WeekDay {
  date: string;
  dayLabel: string;
  checkedIn: boolean;
  isToday: boolean;
}

interface JournalSnippet {
  id: number;
  prompt: string;
  snippet: string;
  createdAt: string;
}

interface DashboardData {
  tier: string;
  checkedInToday: boolean;
  todayMood: string | null;
  streak: number;
  journalCount: number;
  pathways: PathwaySummary[];
  recentEntries: JournalSnippet[];
  weekGrid: WeekDay[];
}

/* ============================================
   HELPERS
   ============================================ */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("thriver_token");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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
        }}
      >
        Gathering your journey…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ============================================
   ERROR STATE
   ============================================ */

function ErrorState({ message }: { message: string }) {
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
      <p
        style={{
          color: "var(--color-gentle-error)",
          fontSize: "var(--text-base)",
        }}
      >
        {message}
      </p>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => window.location.reload()}
        style={{ width: "auto", padding: "var(--space-2) var(--space-6)" }}
      >
        Try again
      </button>
    </div>
  );
}

/* ============================================
   ENCOURAGEMENT BANNER
   ============================================ */

function EncouragementBanner() {
  return (
    <div
      style={{
        padding: "var(--space-6)",
        background: "linear-gradient(135deg, var(--color-accent-light) 0%, #FDF6E8 100%)",
        border: "2px solid var(--color-accent)",
        borderRadius: "var(--radius-lg)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-script)",
          fontSize: "1.375rem",
          color: "var(--color-primary)",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        You are not behind.
        <br />
        You are becoming.
      </p>
    </div>
  );
}

/* ============================================
   DAILY NOTE FROM HEIDI
   ============================================ */

function DailyNote({
  note,
}: {
  note: { note: string; author: string };
}) {
  return (
    <div
      style={{
        padding: "var(--space-5)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-light)",
        borderLeft: "4px solid var(--color-secondary)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--color-secondary)",
          margin: "0 0 var(--space-2)",
        }}
      >
        A Note from Heidi
      </p>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.9375rem",
          lineHeight: 1.65,
          color: "var(--color-text-primary)",
          margin: 0,
          fontStyle: "italic",
        }}
      >
        "{note.note}"
      </p>
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-text-muted)",
          margin: "var(--space-2) 0 0",
          textAlign: "right",
        }}
      >
        — {note.author}
      </p>
    </div>
  );
}

/* ============================================
   STAT CARDS
   ============================================ */

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "var(--color-surface)",
        border: accent ? "2px solid var(--color-accent)" : "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4) var(--space-3)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-1)",
      }}
    >
      <span style={{ fontSize: "1.25rem" }}>{icon}</span>
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-2xl)",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-text-secondary)",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ============================================
   WEEK DOT GRID
   ============================================ */

function WeekDotGrid({ weekGrid }: { weekGrid: WeekDay[] }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "2px",
      }}
    >
      {weekGrid.map((day) => (
        <div
          key={day.date}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "0.625rem",
              fontWeight: 600,
              color: day.isToday
                ? "var(--color-primary)"
                : "var(--color-text-muted)",
              textTransform: "uppercase",
            }}
          >
            {day.dayLabel}
          </span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-full)",
              background: day.checkedIn
                ? "var(--color-primary)"
                : day.isToday
                  ? "var(--color-accent-light)"
                  : "var(--color-border-light)",
              border: day.isToday && !day.checkedIn
                ? "2px solid var(--color-accent)"
                : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 200ms ease",
            }}
          >
            {day.checkedIn && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================
   PATHWAY MINI CARD
   ============================================ */

function PathwayMiniCard({ pathway }: { pathway: PathwaySummary }) {
  const progress =
    pathway.totalSteps > 0
      ? Math.round((pathway.completedSteps / pathway.totalSteps) * 100)
      : 0;

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-2)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          {pathway.title}
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: "var(--color-secondary)",
          }}
        >
          {progress}%
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 6,
          background: "var(--color-border-light)",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "var(--color-secondary)",
            borderRadius: "var(--radius-full)",
            transition: "width 400ms ease",
          }}
        />
      </div>
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-text-muted)",
          margin: "var(--space-1) 0 0",
        }}
      >
        {pathway.completedSteps} of {pathway.totalSteps} steps complete
      </p>
    </div>
  );
}

/* ============================================
   UPGRADE CARD (FREE TIER)
   ============================================ */

function UpgradeCard() {
  return (
    <div
      style={{
        background: "var(--color-accent-light)",
        border: "2px solid var(--color-primary)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <span style={{ fontSize: "1.25rem" }}>✨</span>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--color-primary)",
          }}
        >
          Thrive
        </span>
      </div>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Unlock unlimited conversations with Maravae, AI companion with full memory,
        unlimited pathways, and deeper insights — when you're ready.
      </p>
      <button
        type="button"
        className="btn-secondary"
        style={{
          width: "auto",
          alignSelf: "flex-start",
          padding: "var(--space-2) var(--space-5)",
          fontSize: "var(--text-sm)",
          minHeight: 40,
        }}
        onClick={() => {
          // Navigate to settings for upgrade info
          window.location.href = "/app/settings";
        }}
      >
        Learn more
      </button>
    </div>
  );
}

/* ============================================
   MARAVAE STORE CARD
   ============================================ */

function MaravaeStoreCard({
  storeUrl,
  featured,
}: {
  storeUrl: string;
  featured: { title: string; description: string };
}) {
  return (
    <a
      href={storeUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-light)",
        borderLeft: "3px solid var(--color-accent)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        textDecoration: "none",
        transition: "box-shadow 150ms ease, border-color 150ms ease",
      }}
      className="store-card"
    >
      <span
        style={{
          display: "block",
          fontSize: "0.625rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-1)",
        }}
      >
        From Maravae
      </span>
      <h4
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "0 0 2px",
        }}
      >
        {featured.title}
      </h4>
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-text-secondary)",
          margin: "0 0 var(--space-2)",
          lineHeight: 1.4,
        }}
      >
        {featured.description}
      </p>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          color: "var(--color-accent-hover)",
        }}
      >
        Browse the store&ensp;→
      </span>
      <style>{`
        .store-card:hover {
          box-shadow: var(--shadow-sm);
          border-color: var(--color-accent);
        }
      `}</style>
    </a>
  );
}

/* ============================================
   THRIVE BADGE
   ============================================ */

function ThriveBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 10px",
        background: "var(--color-accent-light)",
        border: "1px solid var(--color-accent)",
        borderRadius: "var(--radius-full)",
        fontSize: "0.6875rem",
        fontWeight: 600,
        color: "var(--color-caution)",
        whiteSpace: "nowrap",
      }}
    >
      ✦ Thrive Member
    </span>
  );
}

/* ============================================
   CELEBRATION TOAST
   ============================================ */

function CelebrationToast({
  badge,
  onDismiss,
}: {
  badge: EarnedBadge;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        background: "var(--color-accent-light)",
        border: "2px solid var(--color-accent)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        cursor: "pointer",
        animation: "celebrateIn 0.5s var(--ease-spring)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <span style={{ fontSize: "1.75rem", flexShrink: 0 }}>{badge.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            color: "var(--color-primary)",
            margin: 0,
          }}
        >
          ✨ You earned: {badge.name}
        </p>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-text-secondary)",
            margin: "2px 0 0",
            fontStyle: "italic",
          }}
        >
          {badge.message}
        </p>
      </div>
    </div>
  );
}

/* ============================================
   BADGE CARD
   ============================================ */

const LOCKED_BADGES: { key: string; name: string; emoji: string }[] = [
  { key: "first_step", name: "First Step", emoji: "🌱" },
  { key: "streak_7", name: "7 Days Strong", emoji: "🌸" },
  { key: "streak_30", name: "30 Days", emoji: "✨" },
  { key: "checkins_50", name: "50 Check-ins", emoji: "💫" },
  { key: "checkins_100", name: "100 Check-ins", emoji: "🌟" },
  { key: "pathway_complete", name: "Celebration", emoji: "🎉" },
];

function BadgeCard({
  badge,
  locked,
  onClick,
}: {
  badge?: EarnedBadge;
  locked?: { name: string; emoji: string };
  onClick?: () => void;
}) {
  const isEarned = !!badge;
  const name = badge?.name ?? locked?.name ?? "";
  const emoji = badge?.emoji ?? locked?.emoji ?? "";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isEarned}
      style={{
        flexShrink: 0,
        width: 72,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        padding: "var(--space-2) var(--space-1)",
        background: isEarned
          ? "var(--color-surface)"
          : "var(--color-surface)",
        border: isEarned
          ? "2px solid var(--color-accent)"
          : "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-md)",
        cursor: isEarned ? "pointer" : "default",
        opacity: isEarned ? 1 : 0.45,
        transition: "transform 150ms ease, box-shadow 150ms ease",
        boxShadow: isEarned ? "var(--shadow-sm)" : "none",
      }}
      title={isEarned ? badge.message : "Keep going to unlock this badge"}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--radius-full)",
          background: isEarned
            ? "var(--color-accent-light)"
            : "var(--color-border-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.125rem",
          position: "relative",
        }}
      >
        {isEarned ? (
          emoji
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
      </div>
      <span
        style={{
          fontSize: "0.5625rem",
          fontWeight: 600,
          color: isEarned
            ? "var(--color-text-primary)"
            : "var(--color-text-muted)",
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: 64,
        }}
      >
        {name}
      </span>
    </button>
  );
}

/* ============================================
   BADGE ROW
   ============================================ */

function BadgeRow({
  earnedBadges,
  onBadgeClick,
  showAll,
  onToggleShowAll,
}: {
  earnedBadges: EarnedBadge[];
  onBadgeClick: (badge: EarnedBadge) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const earnedKeys = new Set(earnedBadges.map((b) => b.key));

  // Build ordered list: earned badges first, then locked
  const orderedEarned = LOCKED_BADGES.filter((lb) =>
    earnedKeys.has(lb.key)
  ).map((lb) => earnedBadges.find((eb) => eb.key === lb.key)!);
  const orderedLocked = LOCKED_BADGES.filter(
    (lb) => !earnedKeys.has(lb.key)
  );

  const allItems = [...orderedEarned, ...orderedLocked];
  const visibleItems = showAll ? allItems : allItems.slice(0, 5);
  const hasMore = allItems.length > 5;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          overflowX: "auto",
          paddingBottom: "var(--space-1)",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {visibleItems.map((item) => {
          if ("key" in item && earnedKeys.has((item as EarnedBadge).key)) {
            const badge = item as EarnedBadge;
            return (
              <BadgeCard
                key={badge.key}
                badge={badge}
                onClick={() => onBadgeClick(badge)}
              />
            );
          }
          const locked = item as { key: string; name: string; emoji: string };
          return <BadgeCard key={locked.key} locked={locked} />;
        })}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={onToggleShowAll}
          style={{
            alignSelf: "center",
            background: "transparent",
            border: "none",
            color: "var(--color-text-muted)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            cursor: "pointer",
            padding: "var(--space-1) var(--space-2)",
          }}
        >
          {showAll ? "Show less" : `View all (${allItems.length})`}
        </button>
      )}
    </div>
  );
}

/* ============================================
   UNLOCK CARD
   ============================================ */

function UnlockCard({ unlock }: { unlock: Unlock }) {
  if (unlock.type === "store") {
    return (
      <a
        href={unlock.storeUrl ?? "https://maravae.com"}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          background: "var(--color-accent-light)",
          border: "1px solid var(--color-accent)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-4)",
          textDecoration: "none",
        }}
      >
        <span style={{ fontSize: "1.25rem" }}>🎁</span>
        <p style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--color-primary)",
          margin: "var(--space-1) 0 2px",
        }}>
          {unlock.title}
        </p>
        <p style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-text-secondary)",
          margin: 0,
          lineHeight: 1.4,
        }}>
          {unlock.message}
        </p>
      </a>
    );
  }

  if (unlock.type === "pathway") {
    return (
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-secondary)",
          borderLeft: "4px solid var(--color-secondary)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
          <span style={{ fontSize: "1.25rem" }}>🔓</span>
          <span style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}>
            New Pathway Unlocked
          </span>
        </div>
        <p style={{
          fontSize: "var(--text-base)",
          fontWeight: 700,
          color: "var(--color-primary)",
          margin: "0 0 2px",
        }}>
          {unlock.pathwayTitle}
        </p>
        <p style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-text-secondary)",
          margin: 0,
          lineHeight: 1.4,
        }}>
          {unlock.message}
        </p>
      </div>
    );
  }

  return null;
}

/* ============================================
   PAGE COMPONENT
   ============================================ */

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState<{
    storeUrl: string;
    featured: { title: string; description: string };
  } | null>(null);
  const [dailyNote, setDailyNote] = useState<{
    note: string;
    author: string;
  } | null>(null);
  const [rewards, setRewards] = useState<{
    badges: EarnedBadge[];
    newlyEarned: EarnedBadge[];
    unlocks: Unlock[];
  } | null>(null);
  const [toastBadge, setToastBadge] = useState<EarnedBadge | null>(null);
  const [toastQueue, setToastQueue] = useState<EarnedBadge[]>([]);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [affirmation, setAffirmation] = useState<string | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<{
    text: string;
  } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Please log in to view your dashboard.");
      setLoading(false);
      return;
    }

    getDashboardFn({ data: { token } })
      .then((result) => {
        setDash(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
        setLoading(false);
      });

    // Fetch store info (non-blocking)
    getStoreLinkFn()
      .then((result) => setStoreInfo(result))
      .catch(() => {}); // Silently fail — store link is non-critical

    // Fetch daily note (non-blocking)
    getDailyNoteFn()
      .then((result) => {
        if (result.note) setDailyNote(result.note);
      })
      .catch(() => {});

    // Fetch rewards (non-blocking)
    getRewardsFn({ data: { token } })
      .then((result) => {
        setRewards({
          badges: result.badges,
          newlyEarned: result.newlyEarned,
          unlocks: result.unlocks,
        });
        // Queue newly earned badges for toast display
        if (result.newlyEarned.length > 0) {
          setToastQueue(result.newlyEarned);
        }
      })
      .catch(() => {});

    // Fetch daily affirmation (non-blocking)
    getDailyAffirmationFn({ data: { token } })
      .then((result) => setAffirmation(result.affirmation))
      .catch(() => {});

    // Fetch weekly summary (non-blocking — only shows Sun/Mon)
    getWeeklySummaryFn({ data: { token } })
      .then((result) => {
        if (result.summary) setWeeklySummary({ text: result.summary.text });
      })
      .catch(() => {});
  }, []);

  // Show toasts from the queue one at a time
  useEffect(() => {
    if (!toastBadge && toastQueue.length > 0) {
      setToastBadge(toastQueue[0]!);
      setToastQueue((prev) => prev.slice(1));
    }
  }, [toastBadge, toastQueue]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!dash) return <ErrorState message="Something went wrong. Please try again." />;

  const isThrive = dash.tier === "thrive" || dash.tier === "organization";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Celebration Toast */}
      {toastBadge && (
        <CelebrationToast
          badge={toastBadge}
          onDismiss={() => setToastBadge(null)}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
            }}
          >
            Your Journey
          </h2>
        </div>
        {isThrive && <ThriveBadge />}
      </div>

      {/* Daily Note from Heidi (above encouragement) */}
      {dailyNote && <DailyNote note={dailyNote} />}

      {/* Daily Affirmation */}
      {affirmation && (
        <div
          style={{
            padding: "var(--space-4) var(--space-5)",
            background: "var(--color-accent-light)",
            border: "1px solid var(--color-accent)",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-script)",
              fontSize: "1.25rem",
              color: "var(--color-primary)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {affirmation}
          </p>
        </div>
      )}

      {/* Weekly Summary — Sunday/Monday only */}
      {weeklySummary && (
        <div
          style={{
            padding: "var(--space-5)",
            background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-accent-light) 100%)",
            border: "2px solid var(--color-accent)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <p
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-caution)",
              margin: "0 0 var(--space-2)",
            }}
          >
            Your Week
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              lineHeight: 1.65,
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            {weeklySummary.text}
          </p>
        </div>
      )}

      {/* Encouragement Banner */}
      <EncouragementBanner />

      {/* Stats Row */}
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <StatCard
          label="day streak"
          value={dash.streak}
          icon="🔥"
          accent={dash.streak > 0}
        />
        <StatCard
          label="talks this week"
          value={dash.journalCount}
          icon="💬"
        />
        <StatCard
          label="pathways"
          value={dash.pathways.length}
          icon="🌱"
        />
      </div>

      {/* Week Dot Grid */}
      {dash.weekGrid.length > 0 && (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
          }}
        >
          <p
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
              margin: "0 0 var(--space-3)",
            }}
          >
            This Week
          </p>
          <WeekDotGrid weekGrid={dash.weekGrid} />
        </div>
      )}

      {/* Your Journey — Badge Row */}
      {rewards && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            Your Journey
          </p>
          <BadgeRow
            earnedBadges={rewards.badges}
            onBadgeClick={(badge) => {
              setToastBadge(badge);
              // Auto-dismiss after 5 seconds
              setTimeout(() => setToastBadge(null), 5000);
            }}
            showAll={showAllBadges}
            onToggleShowAll={() => setShowAllBadges((prev) => !prev)}
          />
        </div>
      )}

      {/* Unlocks */}
      {rewards && rewards.unlocks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {rewards.unlocks.map((unlock, i) => (
            <UnlockCard key={i} unlock={unlock} />
          ))}
        </div>
      )}

      {/* Active Pathway */}
      {dash.pathways.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            Active Pathway
          </p>
          <PathwayMiniCard pathway={dash.pathways[0]!} />
          {!isThrive && dash.pathways.length > 1 && (
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-muted)",
                fontStyle: "italic",
                margin: 0,
                textAlign: "center",
              }}
            >
              Upgrade to Thrive for unlimited pathways
            </p>
          )}
        </div>
      )}

      {/* Recent Journal Entries */}
      {dash.recentEntries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            Recent Conversations
          </p>
          {dash.recentEntries.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
                cursor: "pointer",
              }}
              onClick={() => navigate({ to: "/app/journal" })}
            >
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  margin: "0 0 2px",
                }}
              >
                {entry.prompt}
              </p>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {entry.snippet}
              </p>
              <p
                style={{
                  fontSize: "0.625rem",
                  color: "var(--color-text-muted)",
                  margin: "var(--space-1) 0 0",
                }}
              >
                {formatDate(entry.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state for new users */}
      {dash.recentEntries.length === 0 && dash.streak === 0 && (
        <div
          className="card"
          style={{ textAlign: "center" }}
        >
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--text-sm)",
              margin: 0,
            }}
          >
            Your journey is just beginning.
            <br />
            Start with a daily check-in to build momentum.
          </p>
        </div>
      )}

      {/* Maravae Store */}
      {storeInfo && (
        <MaravaeStoreCard
          storeUrl={storeInfo.storeUrl}
          featured={storeInfo.featured}
        />
      )}

      {/* Tier-specific: Upgrade card for Free users */}
      {!isThrive && <UpgradeCard />}
    </div>
  );
}
