import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getUserTierFn } from "../../server/tiers";
import { deleteAccountFn } from "../../server/auth";
import { getStoreLinkFn } from "../../server/store";

/* ============================================
   TYPES
   ============================================ */

interface TierData {
  user: {
    id: number;
    email: string;
    tier: string;
  };
  features: {
    dailyCheckin: boolean;
    basicJournaling: boolean;
    aiReflections: boolean;
    unlimitedPathways: boolean;
    progressDashboard: boolean;
  };
}

/* ============================================
   HELPERS
   ============================================ */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("thriver_token");
}

/* ============================================
   FEATURE ROW
   ============================================ */

function FeatureRow({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--space-1) 0",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
        }}
      >
        {label}
      </span>
      {enabled ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-safe)"
          strokeWidth="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <span
          style={{
            fontSize: "0.625rem",
            fontWeight: 600,
            color: "var(--color-text-muted)",
            background: "var(--color-border-light)",
            padding: "1px 6px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          THRIVE
        </span>
      )}
    </div>
  );
}

/* ============================================
   SETTINGS PAGE
   ============================================ */

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [tierData, setTierData] = useState<TierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState<{
    storeUrl: string;
    featured: { title: string; description: string };
  } | null>(null);

  // Load tier data
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate({ to: "/login" });
      return;
    }
    getUserTierFn({ data: { token } })
      .then((data) => {
        setTierData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Fetch store info (non-blocking)
    getStoreLinkFn()
      .then((r) => setStoreInfo(r))
      .catch(() => {});
  }, [navigate]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: "var(--space-16)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--color-border)",
            borderTopColor: "var(--color-primary)",
            borderRadius: "var(--radius-full)",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!tierData) {
    return (
      <div style={{ textAlign: "center", paddingTop: "var(--space-12)" }}>
        <p style={{ color: "var(--color-text-muted)" }}>
          Unable to load settings. Please try again.
        </p>
      </div>
    );
  }

  const isThrive =
    tierData.user.tier === "thrive" || tierData.user.tier === "organization";

  const handleLogout = () => {
    localStorage.removeItem("thriver_token");
    navigate({ to: "/login" });
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Please enter your password");
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    const token = getToken();
    if (!token) return;

    try {
      await deleteAccountFn({
        data: { token, password: deletePassword },
      });
      localStorage.removeItem("thriver_token");
      navigate({ to: "/login" });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Header */}
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-2xl)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: 0,
        }}
      >
        Settings
      </h2>

      {/* Profile Section */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            marginBottom: "var(--space-4)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-full)",
              background: "var(--color-primary-light)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {tierData.user.email.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {tierData.user.email}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "2px" }}>
              {isThrive ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "1px 8px",
                    background: "var(--color-accent-light)",
                    border: "1px solid var(--color-accent)",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.625rem",
                    fontWeight: 600,
                    color: "var(--color-caution)",
                  }}
                >
                  ✦ Thrive
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "1px 8px",
                    background: "var(--color-border-light)",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.625rem",
                    fontWeight: 600,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Free
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tier features list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
            padding: "var(--space-3)",
            background: "var(--color-bg)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <FeatureRow
            label="Daily check-in"
            enabled={tierData.features.dailyCheckin}
          />
          <FeatureRow
            label="Conversations with Maravae"
            enabled={tierData.features.conversations}
          />
          <FeatureRow
            label="AI companion & memory"
            enabled={tierData.features.aiCompanion}
          />
          <FeatureRow
            label="Unlimited conversations"
            enabled={tierData.features.unlimitedConversations}
          />
          <FeatureRow
            label="Unlimited pathways"
            enabled={tierData.features.unlimitedPathways}
          />
          <FeatureRow
            label="Progress dashboard"
            enabled={tierData.features.progressDashboard}
          />
        </div>
      </div>

      {/* Upgrade Card (Free users) */}
      {!isThrive && (
        <div
          style={{
            background: "var(--color-accent-light)",
            border: "2px solid var(--color-accent)",
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
                color: "var(--color-text-primary)",
              }}
            >
              Upgrade to Thrive
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
            Unlock unlimited conversations with Maravae, AI companion with full
            memory, unlimited goal pathways, and deeper insights into your
            healing journey — when you're ready.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span style={{ color: "var(--color-safe)" }}>✓</span> Unlimited
              conversations with Maravae
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span style={{ color: "var(--color-safe)" }}>✓</span> AI companion
              with full memory
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span style={{ color: "var(--color-safe)" }}>✓</span> Unlimited
              goal pathways
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span style={{ color: "var(--color-safe)" }}>✓</span> Progress
              tracking dashboard
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled
            style={{
              width: "100%",
              maxWidth: "none",
              fontSize: "var(--text-sm)",
            }}
          >
            Upgrade — $9.99/mo (Coming soon)
          </button>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
              margin: 0,
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            Stripe payments will be available soon. Thank you for your
            patience. 💛
          </p>
        </div>
      )}

      {/* Thrive status (Thrive users) */}
      {isThrive && (
        <div
          style={{
            background: "var(--color-accent-light)",
            border: "1px solid var(--color-accent)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--color-primary)",
              margin: "0 0 var(--space-1)",
            }}
          >
            ✦ You're on the Thrive plan
          </p>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            Enjoy unlimited access to all features. Thank you for being here.
          </p>
        </div>
      )}

      {/* Maravae Store */}
      {storeInfo && (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-5)",
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
            Maravae Store
          </p>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              margin: "0 0 var(--space-3)",
              lineHeight: 1.5,
            }}
          >
            Explore journals, affirmations, and tools for your journey
          </p>
          <a
            href={storeInfo.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              minHeight: 40,
              padding: "var(--space-2) var(--space-5)",
              background: "transparent",
              color: "var(--color-primary)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              border: "2px solid var(--color-primary)",
              borderRadius: "var(--radius-xl)",
              cursor: "pointer",
              textDecoration: "none",
              transition: "background 150ms ease",
            }}
            className="store-btn-hover"
          >
            Visit the Maravae Store&ensp;→
          </a>
          <style>{`
            .store-btn-hover:hover {
              background: var(--color-primary-light);
            }
          `}</style>
        </div>
      )}

      {/* Subscription Management */}
      <div
        style={{
          marginTop: "var(--space-6)",
          padding: "var(--space-4)",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-light)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            marginBottom: "var(--space-2)",
          }}
        >
          Your Plan
        </h3>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-4)",
          }}
        >
          You're on the{" "}
          <strong>
            {tierData.user.tier === "thrive_complete"
              ? "Thrive Complete"
              : tierData.user.tier === "thrive"
                ? "Thrive"
                : "Free"}
          </strong>{" "}
          plan.
        </p>
        {tierData.user.tier === "free" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <button
              type="button"
              className="btn-primary"
              disabled
              style={{
                width: "100%",
                maxWidth: "none",
                fontSize: "var(--text-sm)",
              }}
            >
              Upgrade to Thrive — $4.99/mo
            </button>
            <button
              type="button"
              disabled
              style={{
                width: "100%",
                maxWidth: "none",
                minHeight: 48,
                padding: "var(--space-3) var(--space-6)",
                background: "var(--color-accent)",
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                border: "none",
                borderRadius: "var(--radius-xl)",
                cursor: "not-allowed",
                opacity: 0.7,
              }}
            >
              Thrive Complete — $9.99/mo
            </button>
          </div>
        )}
        {tierData.user.tier === "thrive" && (
          <button
            type="button"
            disabled
            style={{
              width: "100%",
              maxWidth: "none",
              minHeight: 48,
              padding: "var(--space-3) var(--space-6)",
              background: "var(--color-accent)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--radius-xl)",
              cursor: "not-allowed",
              opacity: 0.7,
            }}
          >
            Upgrade to Thrive Complete — $9.99/mo
          </button>
        )}
        <button
          type="button"
          style={{
            marginTop: "var(--space-2)",
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "0.75rem",
            textDecoration: "underline",
          }}
        >
          Restore purchases
        </button>
      </div>

      {/* Actions */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1)",
        }}
      >
        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            width: "100%",
            minHeight: 44,
            padding: "var(--space-2) var(--space-3)",
            background: "transparent",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            transition: "background 150ms ease",
          }}
          className="settings-btn-hover"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Log out
        </button>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            width: "100%",
            minHeight: 44,
            padding: "var(--space-2) var(--space-3)",
            background: "transparent",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-xs)",
            fontWeight: 500,
            color: "var(--color-text-muted)",
            cursor: "pointer",
            transition: "background 150ms ease",
          }}
          className="settings-btn-hover"
        >
          Delete account
        </button>
      </div>

      <style>{`
        .settings-btn-hover:hover {
          background: var(--color-bg);
        }
      `}</style>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(30, 26, 24, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: "var(--space-4)",
          }}
          onClick={() => {
            setShowDeleteModal(false);
            setDeletePassword("");
            setDeleteError(null);
          }}
        >
          <div
            style={{
              background: "var(--color-surface-raised)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-6)",
              maxWidth: 340,
              width: "100%",
              boxShadow: "var(--shadow-xl)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-lg)",
                fontWeight: 600,
                margin: "0 0 var(--space-2)",
              }}
            >
              Delete your account?
            </h3>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                margin: "0 0 var(--space-4)",
                lineHeight: 1.5,
              }}
            >
              All your check-ins, journal entries, and pathways will be
              permanently deleted. This cannot be undone.
            </p>

            {deleteError && (
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-gentle-error)",
                  margin: "0 0 var(--space-3)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-gentle-error-light)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {deleteError}
              </p>
            )}

            <label className="label" htmlFor="delete-password">
              Enter your password to confirm
            </label>
            <input
              id="delete-password"
              type="password"
              className="input-field"
              placeholder="Your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              style={{ marginBottom: "var(--space-4)" }}
            />

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: "var(--space-2) var(--space-4)",
                  background: "var(--color-gentle-error)",
                  color: "#FFFFFF",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  cursor: deleteLoading ? "not-allowed" : "pointer",
                  opacity: deleteLoading ? 0.7 : 1,
                }}
              >
                {deleteLoading ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
