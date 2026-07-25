import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { getPathwaysFn, togglePathwayStepFn, resetPathwayFn } from "../../server/pathways";
import { getStoreLinkFn } from "../../server/store";

/* ============================================
   TYPES
   ============================================ */

interface PathwayStep {
  text: string;
  done: boolean;
}

interface PathwayData {
  id: number;
  title: string;
  steps: PathwayStep[];
  currentStep: number;
  completed: boolean;
  totalSteps: number;
  completedSteps: number;
}

type ViewState = "loading" | "list" | "detail";

/* ============================================
   HELPERS
   ============================================ */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("thriver_token");
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
        Preparing your pathways…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ============================================
   PROGRESS BAR
   ============================================ */

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: "var(--radius-full)",
          background: "var(--color-primary-light)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "var(--radius-full)",
            background: "var(--color-primary)",
            transition: "width var(--duration-slow) var(--ease-gentle)",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          whiteSpace: "nowrap",
          minWidth: 60,
        }}
      >
        {completed} of {total}
      </span>
    </div>
  );
}

/* ============================================
   STEP DOTS INDICATOR
   ============================================ */

function StepDots({
  steps,
  currentStep,
}: {
  steps: PathwayStep[];
  currentStep: number;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {steps.map((step, i) => {
          let dotStyle: React.CSSProperties = {
            width: 32,
            height: 32,
            borderRadius: "var(--radius-full)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 700,
            zIndex: 1,
            position: "relative",
            background: "var(--color-border-light)",
            color: "var(--color-text-muted)",
            transition: "all var(--duration-normal) var(--ease-gentle)",
          };
          let labelColor = "var(--color-text-muted)";

          if (step.done) {
            dotStyle = {
              ...dotStyle,
              background: "var(--color-safe)",
              color: "#FFFFFF",
            };
            labelColor = "var(--color-safe)";
          } else if (i === currentStep) {
            dotStyle = {
              ...dotStyle,
              background: "var(--color-primary)",
              color: "#FFFFFF",
              boxShadow: "0 0 0 5px var(--color-primary-light)",
            };
            labelColor = "var(--color-primary)";
          }

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                flex: 1,
              }}
            >
              <div style={dotStyle}>{step.done ? "✓" : i + 1}</div>
              <span
                style={{
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  color: labelColor,
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {step.text.length > 20
                  ? step.text.slice(0, 18) + "…"
                  : step.text}
              </span>
            </div>
          );
        })}
      </div>
      {/* Connectors between dots */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          margin: "-38px 24px 0",
          height: 0,
          position: "relative",
          zIndex: 0,
        }}
      >
        {steps.slice(0, -1).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 2,
              background:
                steps[i]?.done && steps[i + 1]?.done
                  ? "var(--color-safe)"
                  : "var(--color-border)",
              transition: "background var(--duration-normal) var(--ease-gentle)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ============================================
   PATHWAY LIST VIEW
   ============================================ */

function PathwayList({
  pathways,
  onSelect,
}: {
  pathways: PathwayData[];
  onSelect: (pathway: PathwayData) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-2)" }}>
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
          Your Pathways
        </h2>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
            margin: "var(--space-1) 0 0",
          }}
        >
          Small steps. Real growth.
        </p>
      </div>

      {/* Pathway Cards */}
      {pathways.map((p) => (
        <div
          key={p.id}
          className="card"
          onClick={() => onSelect(p)}
          style={{
            cursor: "pointer",
            transition: "box-shadow var(--duration-fast) var(--ease-gentle), transform var(--duration-fast) var(--ease-gentle)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "var(--space-3)",
              marginBottom: "var(--space-3)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-lg)",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
              {p.title}
            </h3>
            {p.completed ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px var(--space-3)",
                  background: "var(--color-accent-light)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--color-accent-hover)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                ✨ Complete
              </span>
            ) : p.completedSteps > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px var(--space-3)",
                  background: "var(--color-primary-light)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                In progress
              </span>
            ) : null}
          </div>

          <ProgressBar completed={p.completedSteps} total={p.totalSteps} />
        </div>
      ))}
    </div>
  );
}

/* ============================================
   PATHWAY DETAIL VIEW
   ============================================ */

function PathwayDetail({
  pathway: initialPathway,
  onBack,
  onUpdated,
  storeInfo,
}: {
  pathway: PathwayData;
  onBack: () => void;
  onUpdated: (p: PathwayData) => void;
  storeInfo: { storeUrl: string; featured: { title: string; description: string } } | null;
}) {
  const [pathway, setPathway] = useState<PathwayData>(initialPathway);
  const [toggling, setToggling] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStepData = pathway.steps[pathway.currentStep] ?? null;

  const handleToggle = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("Please log in again");
      return;
    }

    setToggling(true);
    setError(null);

    try {
      const result = await togglePathwayStepFn({
        data: {
          token,
          pathwayId: pathway.id,
          stepIndex: pathway.currentStep,
        },
      });
      if (result?.pathway) {
        setPathway(result.pathway);
        onUpdated(result.pathway);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setToggling(false);
    }
  }, [pathway.id, pathway.currentStep, onUpdated]);

  const handleReset = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("Please log in again");
      return;
    }

    setResetting(true);
    setError(null);

    try {
      const result = await resetPathwayFn({
        data: { token, pathwayId: pathway.id },
      });
      if (result?.pathway) {
        setPathway(result.pathway);
        onUpdated(result.pathway);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setResetting(false);
    }
  }, [pathway.id, onUpdated]);

  const upcomingSteps = pathway.steps
    .map((s, i) => ({ ...s, index: i }))
    .filter((s) => !s.done && s.index !== pathway.currentStep);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Header with back button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to pathways"
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-full)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-light)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-secondary)",
            fontSize: "1rem",
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <div>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-xl)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {pathway.title}
          </h2>
          <span
            style={{
              display: "block",
              fontSize: "var(--text-xs)",
              fontWeight: 500,
              color: "var(--color-primary)",
              marginTop: 1,
            }}
          >
            {pathway.totalSteps} steps
          </span>
        </div>
      </div>

      {/* Step Progress Dots */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <p
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--color-text-muted)",
            margin: "0 0 var(--space-3)",
          }}
        >
          Your progress
        </p>
        <StepDots steps={pathway.steps} currentStep={pathway.currentStep} />
      </div>

      {/* Celebration Card (all completed) */}
      {pathway.completed ? (
        <div
          style={{
            background: "var(--color-accent-light)",
            border: "2px solid var(--color-accent)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-6)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-4)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--radius-full)",
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
            }}
          >
            ✨
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
              You did this.
            </h3>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                margin: "var(--space-2) 0 0",
                lineHeight: 1.5,
              }}
            >
              Every step was an act of choosing yourself.
            </p>
          </div>

          {/* Maravae Store — Celebrate with something tangible */}
          {storeInfo && (
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-accent)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3) var(--space-4)",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-secondary)",
                  margin: "0 0 var(--space-1)",
                  lineHeight: 1.4,
                }}
              >
                Celebrate your progress with something tangible.
              </p>
              <a
                href={storeInfo.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--color-accent-hover)",
                  textDecoration: "none",
                }}
              >
                Shop Maravae&ensp;→
              </a>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Current Step Card */}
          {currentStepData && (
            <div
              style={{
                background: "var(--color-surface)",
                border: "2px solid var(--color-primary)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-4)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-primary)",
                  margin: "0 0 4px",
                }}
              >
                Step {pathway.currentStep + 1} of {pathway.totalSteps}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-base)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  margin: "0 0 6px",
                  lineHeight: 1.4,
                }}
              >
                {currentStepData.text}
              </p>

              {/* Toggle Button */}
              <button
                type="button"
                onClick={handleToggle}
                disabled={toggling}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  width: "100%",
                  padding: "14px var(--space-4)",
                  background: currentStepData.done
                    ? "var(--color-safe-light)"
                    : "var(--color-bg)",
                  border: currentStepData.done
                    ? "2px solid var(--color-safe)"
                    : "2px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  cursor: toggling ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  transition:
                    "border-color 0.15s ease, background 0.15s ease, opacity 0.15s ease",
                  opacity: toggling ? 0.7 : 1,
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "var(--radius-full)",
                    border: currentStepData.done
                      ? "2px solid var(--color-safe)"
                      : "2px solid var(--color-border)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    color: currentStepData.done
                      ? "#FFFFFF"
                      : "transparent",
                    background: currentStepData.done
                      ? "var(--color-safe)"
                      : "transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  ✓
                </span>
                {toggling
                  ? "Updating…"
                  : currentStepData.done
                    ? "Mark incomplete"
                    : "I've done this"}
              </button>
            </div>
          )}

          {/* Upcoming Steps */}
          {upcomingSteps.length > 0 && (
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-4)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-muted)",
                  margin: "0 0 var(--space-3)",
                }}
              >
                Coming next
              </p>
              {upcomingSteps.slice(0, 3).map((s) => (
                <div
                  key={s.index}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-3)",
                    padding: "var(--space-2) 0",
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "var(--radius-full)",
                      background: "var(--color-border-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      color: "var(--color-text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {s.index + 1}
                  </div>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.4,
                      margin: 0,
                    }}
                  >
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Encouragement */}
      <p
        style={{
          textAlign: "center",
          padding: "var(--space-2) 0",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-muted)",
          fontStyle: "italic",
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {pathway.completed
          ? "You've already done the hardest part — you started. 🌿"
          : pathway.completedSteps > 0
            ? "You've already done the hardest part — you started. 🌿"
            : "Take it one gentle step at a time. You're worth it. 🌿"}
      </p>

      {/* Reset Pathway Link */}
      <button
        type="button"
        onClick={handleReset}
        disabled={resetting}
        className="btn-ghost"
        style={{
          alignSelf: "center",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-muted)",
          opacity: resetting ? 0.5 : 1,
          cursor: resetting ? "not-allowed" : "pointer",
        }}
      >
        {resetting ? "Resetting…" : "Reset pathway"}
      </button>

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
    </div>
  );
}

/* ============================================
   PAGE COMPONENT
   ============================================ */

export const Route = createFileRoute("/app/pathways")({
  component: PathwaysPage,
});

function PathwaysPage() {
  const [view, setView] = useState<ViewState>("loading");
  const [pathways, setPathways] = useState<PathwayData[]>([]);
  const [selectedPathway, setSelectedPathway] = useState<PathwayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState<{
    storeUrl: string;
    featured: { title: string; description: string };
  } | null>(null);

  const loadPathways = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("Please log in");
      setView("list");
      return;
    }

    try {
      const result = await getPathwaysFn({ data: { token } });
      setPathways(result.pathways);
      setView("list");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load pathways"
      );
      setView("list");
    }
  }, []);

  useEffect(() => {
    loadPathways();
    // Fetch store info (non-blocking)
    getStoreLinkFn()
      .then((r) => setStoreInfo(r))
      .catch(() => {});
  }, [loadPathways]);

  const handleSelect = useCallback((p: PathwayData) => {
    // Find the latest version in our local state
    setPathways((prev) => {
      const current = prev.find((x) => x.id === p.id) ?? p;
      setSelectedPathway(current);
      return prev;
    });
    setView("detail");
  }, []);

  const handleUpdated = useCallback((updated: PathwayData) => {
    setPathways((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setSelectedPathway(updated);
  }, []);

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedPathway(null);
  }, []);

  if (view === "loading") {
    return <LoadingState />;
  }

  if (error && pathways.length === 0) {
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
          onClick={() => {
            setError(null);
            setView("loading");
            loadPathways();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {view === "list" && (
        <PathwayList pathways={pathways} onSelect={handleSelect} />
      )}
      {view === "detail" && selectedPathway && (
        <PathwayDetail
          pathway={selectedPathway}
          onBack={handleBack}
          onUpdated={handleUpdated}
          storeInfo={storeInfo}
        />
      )}
    </div>
  );
}
