import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/community")({
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "var(--space-16) var(--space-4)",
        gap: "var(--space-4)",
      }}
    >
      <span style={{ fontSize: "2.5rem" }}>🌿</span>
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: 0,
        }}
      >
        Community
      </h2>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-muted)",
          maxWidth: 260,
          lineHeight: 1.5,
        }}
      >
        Coming soon — real stories of hope and progress from people walking the same path.
      </p>
    </div>
  );
}
