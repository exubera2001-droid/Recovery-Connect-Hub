import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyCirclesFn, createCircleFn, joinCircleFn } from "../../../server/circles";
import { shareText } from "../../../native";

export const Route = createFileRoute("/app/circles/")({
  component: CirclesPage,
});

interface Circle {
  id: number;
  name: string;
  healing_focus: string;
  description: string | null;
  invite_code: string;
  is_active: number;
  memberCount: number;
  members: { displayName: string; color: string }[];
}

function CirclesPage() {
  const navigate = useNavigate();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Create form
  const [circleName, setCircleName] = useState("");
  const [focus, setFocus] = useState("");
  const [description, setDescription] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCircle, setCreatedCircle] = useState<any>(null);

  // Join form
  const [inviteCode, setInviteCode] = useState("");
  const [joinDisplayName, setJoinDisplayName] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedCircle, setJoinedCircle] = useState<any>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("thriver_token") : null;

  useEffect(() => {
    if (!token) {
      navigate({ to: "/login" });
      return;
    }
    fetchCircles();
  }, []);

  async function fetchCircles() {
    setLoading(true);
    setError(null);
    try {
      const result = await getMyCirclesFn({ data: { token } });
      setCircles((result as any).circles || []);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const result = await createCircleFn({
        data: {
          token: token!,
          name: circleName,
          healingFocus: focus,
          description: description || null,
          displayName,
        },
      });
      setCreatedCircle(result);
    } catch (e: any) {
      setCreateError(e.message || "Could not create circle");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoin() {
    setJoinLoading(true);
    setJoinError(null);
    try {
      const result = await joinCircleFn({
        data: {
          token: token!,
          inviteCode,
          displayName: joinDisplayName,
        },
      });
      setJoinedCircle(result);
    } catch (e: any) {
      setJoinError(e.message || "Could not join circle");
    } finally {
      setJoinLoading(false);
    }
  }

  function closeAll() {
    setShowActionSheet(false);
    setShowCreateModal(false);
    setShowJoinModal(false);
    setCreateError(null);
    setJoinError(null);
    setCreatedCircle(null);
    setJoinedCircle(null);
  }

  const healingOptions = [
    "Rebuilding Self-Worth",
    "Setting Boundaries",
    "Finding Your Voice",
    "Healing After Divorce",
    "Grief & Loss",
    "General Support",
  ];

  return (
    <div style={{ padding: "0 var(--space-4)", paddingBottom: "24px" }}>
      {/* Loading */}
      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "var(--space-16) 0",
            color: "var(--color-text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          Loading...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
          <p style={{ color: "var(--color-gentle-error)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
            {error}
          </p>
          <button
            onClick={fetchCircles}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && circles.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: "var(--space-16)" }}>
          {/* Decorative dots */}
          <div style={{ marginBottom: "var(--space-6)" }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ display: "inline-block" }}>
              <circle cx="32" cy="18" r="10" fill="var(--color-accent)" opacity="0.25" />
              <circle cx="16" cy="50" r="10" fill="var(--color-accent)" opacity="0.25" />
              <circle cx="48" cy="50" r="10" fill="var(--color-accent)" opacity="0.25" />
            </svg>
          </div>
          <h2
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-2)",
            }}
          >
            You haven't joined any circles yet.
          </h2>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              maxWidth: 260,
              margin: "0 auto var(--space-6)",
              lineHeight: 1.5,
            }}
          >
            A circle is a small, private group of women who get it. Share your journey in a safe, supportive space.
          </p>
          <div style={{ maxWidth: 300, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                width: "100%",
                minHeight: 48,
                padding: "var(--space-3) var(--space-6)",
                background: "var(--color-primary)",
                color: "#fff",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                border: "none",
                borderRadius: "var(--radius-xl)",
                cursor: "pointer",
              }}
            >
              Create a circle
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              style={{
                width: "100%",
                minHeight: 48,
                padding: "var(--space-3) var(--space-6)",
                background: "transparent",
                color: "var(--color-primary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                border: "2px solid var(--color-primary)",
                borderRadius: "var(--radius-xl)",
                cursor: "pointer",
              }}
            >
              Join with a code
            </button>
          </div>
        </div>
      )}

      {/* List State */}
      {!loading && !error && circles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {circles.map((circle) => (
            <div
              key={circle.id}
              onClick={() => navigate({ to: "/app/circles/" + circle.id })}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-5)",
                cursor: "pointer",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "var(--text-xl)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  margin: "0 0 var(--space-1)",
                }}
              >
                {circle.name}
              </h3>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px var(--space-3)",
                  background: "var(--color-primary-light)",
                  color: "var(--color-primary)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                }}
              >
                {circle.healing_focus}
              </span>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "var(--space-3)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <span>🌸 {circle.memberCount} of 8</span>
                <span>Active circle</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowActionSheet(true)}
        style={{
          position: "fixed",
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
          right: "var(--space-4)",
          zIndex: 50,
          width: 56,
          height: 56,
          borderRadius: "var(--radius-full)",
          background: "var(--color-primary)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          boxShadow: "var(--shadow-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
        }}
      >
        +
      </button>

      {/* ============================================
         ACTION SHEET
         ============================================ */}
      {showActionSheet && (
        <div
          onClick={closeAll}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(30,26,24,0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 375,
              background: "var(--color-surface)",
              borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
              padding: "var(--space-6)",
              paddingBottom: "calc(var(--space-6) + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "var(--color-border)",
                borderRadius: "var(--radius-full)",
                margin: "0 auto var(--space-4)",
              }}
            />
            <div
              onClick={() => {
                closeAll();
                setShowCreateModal(true);
              }}
              style={{
                padding: "var(--space-4)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                marginBottom: "var(--space-1)",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>🌸</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>
                  Create a circle
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                  Start a private group for 3–8 women
                </div>
              </div>
            </div>
            <div
              onClick={() => {
                closeAll();
                setShowJoinModal(true);
              }}
              style={{
                padding: "var(--space-4)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>🔗</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--color-text-primary)" }}>
                  Join with a code
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                  Enter an invite code from a friend
                </div>
              </div>
            </div>
            <button
              onClick={closeAll}
              style={{
                width: "100%",
                minHeight: 44,
                marginTop: "var(--space-4)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ============================================
         CREATE CIRCLE MODAL
         ============================================ */}
      {showCreateModal && (
        <div
          onClick={closeAll}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(30,26,24,0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 375,
              maxHeight: "85dvh",
              overflow: "auto",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
              padding: "var(--space-6)",
              paddingBottom: "calc(var(--space-6) + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "var(--color-border)",
                borderRadius: "var(--radius-full)",
                margin: "0 auto var(--space-4)",
              }}
            />

            {createdCircle ? (
              /* Success state */
              <div style={{ textAlign: "center" }}>
                <h2
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "var(--text-lg)",
                    fontWeight: 600,
                    marginBottom: "var(--space-3)",
                  }}
                >
                  Your circle is ready! ✨
                </h2>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
                  Share this code with 2–7 women you trust:
                </p>
                <div
                  style={{
                    background: "var(--color-accent-light)",
                    border: "2px solid var(--color-accent)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-4)",
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    color: "var(--color-primary)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  {createdCircle.inviteCode}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdCircle.inviteCode);
                    alert("Copied!");
                  }}
                  style={{
                    width: "100%",
                    minHeight: 48,
                    marginBottom: "var(--space-2)",
                    background: "var(--color-primary)",
                    color: "#fff",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-base)",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "var(--radius-xl)",
                    cursor: "pointer",
                  }}
                >
                  Copy Code
                </button>
                <button
                  onClick={() => {
                    shareText(
                      `Join my Thriver circle! Use code: ${createdCircle.inviteCode}`,
                      "Join my Thriver circle"
                    );
                  }}
                  style={{
                    width: "100%",
                    minHeight: 48,
                    marginBottom: "var(--space-2)",
                    background: "transparent",
                    color: "var(--color-primary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-base)",
                    fontWeight: 600,
                    border: "2px solid var(--color-primary)",
                    borderRadius: "var(--radius-xl)",
                    cursor: "pointer",
                  }}
                >
                  Share Code
                </button>
                <button
                  onClick={() => {
                    closeAll();
                    navigate({ to: "/app/circles/" + createdCircle.group.id });
                  }}
                  style={{
                    width: "100%",
                    minHeight: 48,
                    background: "transparent",
                    color: "var(--color-primary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-base)",
                    fontWeight: 600,
                    border: "2px solid var(--color-primary)",
                    borderRadius: "var(--radius-xl)",
                    cursor: "pointer",
                  }}
                >
                  Enter Circle
                </button>
              </div>
            ) : (
              /* Form state */
              <>
                <h2
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "var(--text-xl)",
                    fontWeight: 600,
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Create a Circle
                </h2>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
                  A private space for 3–8 women to support each other.
                </p>

                {/* Circle name */}
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    Circle name
                  </label>
                  <input
                    value={circleName}
                    onChange={(e) => setCircleName(e.target.value)}
                    placeholder="e.g., Healing Together"
                    style={{
                      width: "100%",
                      minHeight: 48,
                      padding: "var(--space-3) var(--space-4)",
                      background: "var(--color-surface)",
                      border: "2px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-base)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Healing focus */}
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    Healing focus
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {healingOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFocus(opt)}
                        style={{
                          padding: "var(--space-2) var(--space-4)",
                          borderRadius: "var(--radius-full)",
                          border: `2px solid ${focus === opt ? "var(--color-primary)" : "var(--color-border)"}`,
                          background: focus === opt ? "var(--color-primary-light)" : "var(--color-surface)",
                          color: focus === opt ? "var(--color-primary)" : "var(--color-text-secondary)",
                          fontSize: "0.8125rem",
                          fontWeight: focus === opt ? 600 : 400,
                          cursor: "pointer",
                          margin: "0 var(--space-1) var(--space-2) 0",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this circle about?"
                    style={{
                      width: "100%",
                      minHeight: 80,
                      padding: "var(--space-3) var(--space-4)",
                      background: "var(--color-surface)",
                      border: "2px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-base)",
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "var(--font-body)",
                    }}
                  />
                </div>

                {/* Display name */}
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    Your display name
                  </label>
                  <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", fontStyle: "italic", margin: "0 0 var(--space-1)" }}>
                    This is how others will see you. Your real name stays private.
                  </p>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., BraveHeart"
                    style={{
                      width: "100%",
                      minHeight: 48,
                      padding: "var(--space-3) var(--space-4)",
                      background: "var(--color-surface)",
                      border: "2px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-base)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {createError && (
                  <p style={{ color: "var(--color-gentle-error)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
                    {createError}
                  </p>
                )}

                <button
                  onClick={handleCreate}
                  disabled={createLoading || !circleName || !focus || !displayName}
                  style={{
                    width: "100%",
                    minHeight: 48,
                    background: createLoading || !circleName || !focus || !displayName
                      ? "var(--color-text-muted)"
                      : "var(--color-primary)",
                    color: "#fff",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-base)",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "var(--radius-xl)",
                    cursor: createLoading || !circleName || !focus || !displayName ? "not-allowed" : "pointer",
                    marginTop: "var(--space-4)",
                  }}
                >
                  {createLoading ? "Creating..." : "Create Circle"}
                </button>

                <p
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--color-text-muted)",
                    fontStyle: "italic",
                    textAlign: "center",
                    marginTop: "var(--space-3)",
                  }}
                >
                  By creating a circle, you agree to keep this a safe, judgment-free space.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================
         JOIN CIRCLE MODAL
         ============================================ */}
      {showJoinModal && (
        <div
          onClick={closeAll}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(30,26,24,0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 375,
              maxHeight: "85dvh",
              overflow: "auto",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
              padding: "var(--space-6)",
              paddingBottom: "calc(var(--space-6) + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "var(--color-border)",
                borderRadius: "var(--radius-full)",
                margin: "0 auto var(--space-4)",
              }}
            />

            {joinedCircle ? (
              /* Success state */
              <div style={{ textAlign: "center" }}>
                <h2
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "var(--text-lg)",
                    fontWeight: 600,
                    marginBottom: "var(--space-4)",
                  }}
                >
                  You've joined {joinedCircle.group.name}! 🌸
                </h2>
                <button
                  onClick={() => {
                    closeAll();
                    navigate({ to: "/app/circles/" + joinedCircle.group.id });
                  }}
                  style={{
                    width: "100%",
                    minHeight: 48,
                    background: "var(--color-primary)",
                    color: "#fff",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-base)",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "var(--radius-xl)",
                    cursor: "pointer",
                  }}
                >
                  Enter Circle
                </button>
              </div>
            ) : (
              /* Form state */
              <>
                <h2
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "var(--text-xl)",
                    fontWeight: 600,
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Join a Circle
                </h2>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
                  Enter the 6-character code shared with you.
                </p>

                {/* Invite code */}
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    Invite code
                  </label>
                  <input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g., A3F-K9M"
                    maxLength={7}
                    style={{
                      width: "100%",
                      minHeight: 48,
                      padding: "var(--space-3) var(--space-4)",
                      background: "var(--color-surface)",
                      border: "2px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "1.25rem",
                      letterSpacing: "0.1em",
                      textAlign: "center",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Display name */}
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    Your display name
                  </label>
                  <input
                    value={joinDisplayName}
                    onChange={(e) => setJoinDisplayName(e.target.value)}
                    placeholder="What should others call you?"
                    style={{
                      width: "100%",
                      minHeight: 48,
                      padding: "var(--space-3) var(--space-4)",
                      background: "var(--color-surface)",
                      border: "2px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-base)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {joinError && (
                  <p style={{ color: "var(--color-gentle-error)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
                    {joinError}
                  </p>
                )}

                <button
                  onClick={handleJoin}
                  disabled={joinLoading || !inviteCode || !joinDisplayName}
                  style={{
                    width: "100%",
                    minHeight: 48,
                    background: joinLoading || !inviteCode || !joinDisplayName
                      ? "var(--color-text-muted)"
                      : "var(--color-primary)",
                    color: "#fff",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-base)",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "var(--radius-xl)",
                    cursor: joinLoading || !inviteCode || !joinDisplayName ? "not-allowed" : "pointer",
                    marginTop: "var(--space-4)",
                  }}
                >
                  {joinLoading ? "Joining..." : "Join Circle"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
