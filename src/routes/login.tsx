import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { registerUser, loginUser, checkAuth } from "../server/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("thriver_token");
    if (token) {
      checkAuth({ data: { token } }).then((result) => {
        if (result.user) {
          navigate({ to: "/app" });
        }
      }).catch(() => {});
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const fn = mode === "login" ? loginUser : registerUser;
      const result = await fn({ data: { email, password } });

      if (result.token) {
        localStorage.setItem("thriver_token", result.token);
        navigate({ to: "/app" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-6"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1
            className="text-script mb-2"
            style={{
              fontFamily: "var(--font-script)",
              fontSize: "2rem",
              color: "var(--color-primary)",
            }}
          >
            Thriver
          </h1>
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
            }}
          >
            Your daily companion for healing & growth
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <h2
            className="card__title"
            style={{ textAlign: "center", marginBottom: "var(--space-6)" }}
          >
            {mode === "login" ? "Welcome back" : "Begin your journey"}
          </h2>

          {error && (
            <div
              style={{
                background: "var(--color-gentle-error-light)",
                color: "var(--color-gentle-error)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                marginBottom: "var(--space-4)",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="gap-stack-md">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: "var(--space-2)" }}
            >
              {loading
                ? "One moment…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "var(--space-6)",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
          }}
        >
          By continuing, you agree to our Terms and Privacy Policy.
        </p>

        <p
          style={{
            textAlign: "center",
            marginTop: "var(--space-4)",
            fontSize: "0.6875rem",
            color: "var(--color-text-muted)",
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          Thriver is a companion for personal growth — not medical or
          mental-health treatment. For emergencies, contact 911 or call/text 988.
        </p>
      </div>
    </main>
  );
}
