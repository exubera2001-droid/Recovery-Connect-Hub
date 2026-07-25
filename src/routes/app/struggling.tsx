import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/struggling")({
  component: StrugglingPage,
});

const struggles = [
  "I can't stop thinking",
  "I'm overwhelmed",
  "I feel guilty",
  "I'm anxious",
  "I miss them",
  "I want to reach out",
  "I'm stuck",
];

function StrugglingPage() {
  const navigate = useNavigate();

  function handleSelect(struggle: string) {
    // Navigate to conversation — the AI will pick up the context
    navigate({ to: "/app/journal" });
  }

  return (
    <div style={{ padding: "0 var(--space-4)", paddingBottom: "24px" }}>
      {/* Back */}
      <button
        onClick={() => navigate({ to: "/app/home" })}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "1.25rem",
          color: "var(--color-text-primary)",
          padding: "var(--space-2) 0",
          marginBottom: "var(--space-4)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        ← Back
      </button>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-xl)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            margin: "0 0 var(--space-1)",
          }}
        >
          I'm here with you
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", margin: 0 }}>
          What's going on?
        </p>
      </div>

      {/* Struggle Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {struggles.map((s) => (
          <button
            key={s}
            onClick={() => handleSelect(s)}
            style={{
              width: "100%",
              padding: "var(--space-4)",
              background: "var(--color-surface)",
              border: "2px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer",
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-body)",
              color: "var(--color-text-primary)",
              textAlign: "left",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Bottom reassurance */}
      <p
        style={{
          textAlign: "center",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-muted)",
          marginTop: "var(--space-6)",
          fontStyle: "italic",
        }}
      >
        Whatever you're feeling right now is valid. You don't have to figure it all out at once.
      </p>
    </div>
  );
}
