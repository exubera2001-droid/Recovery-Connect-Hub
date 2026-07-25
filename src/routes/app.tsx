import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { UserPublic } from "../db/schema";
import { checkAuth } from "../server/auth";
import { hideSplashScreen, setStatusBarStyle } from "../native";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("thriver_token");
    if (!token) {
      navigate({ to: "/login" });
      setLoading(false);
      return;
    }

    checkAuth({ data: { token } })
      .then((result) => {
        if (result.user) {
          setUser(result.user as UserPublic);
          hideSplashScreen();
          setStatusBarStyle();
        } else {
          localStorage.removeItem("thriver_token");
          navigate({ to: "/login" });
        }
      })
      .catch(() => {
        localStorage.removeItem("thriver_token");
        navigate({ to: "/login" });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <div
          className="text-script"
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "1.5rem",
            color: "var(--color-primary)",
          }}
        >
          Thriver
        </div>
      </main>
    );
  }

  if (!user) return null;

  const pathname = location.pathname;

  const tabs = [
    {
      label: "Home",
      href: "/app/home",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: "My Thoughts",
      href: "/app/journal",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: "Community",
      href: "/app/community",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <circle cx="12" cy="7" r="3.5" opacity="0.8" />
          <circle cx="5" cy="17" r="3.5" opacity="0.8" />
          <circle cx="19" cy="17" r="3.5" opacity="0.8" />
        </svg>
      ),
    },
    {
      label: "Progress",
      href: "/app/dashboard",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      label: "Settings",
      href: "/app/settings",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="screen" style={{ maxWidth: "100%" }}>
      {/* Header */}
      <header className="screen__header">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-script)",
              fontSize: "1.375rem",
              color: "var(--color-primary)",
              margin: 0,
            }}
          >
            Thriver
          </h1>
        </div>
        <div
          className="avatar avatar--sm"
          onClick={() => navigate({ to: "/app/settings" })}
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-full)",
            background: "var(--color-primary-light)",
            color: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            cursor: "pointer",
            transition: "transform 150ms ease, box-shadow 150ms ease",
            border: "none",
          }}
          title="Settings"
        >
          {user.email.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Content */}
      <div className="screen__content">
        <Outlet />
      </div>

      {/* Tab Bar */}
      <nav className="tab-bar">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`tab${isActive ? " tab--active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                navigate({ to: tab.href });
              }}
            >
              {tab.icon}
              {tab.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
