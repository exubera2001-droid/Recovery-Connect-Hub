import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main
      style={{
        background: "var(--color-bg)",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Header */}
      <header
        style={{
          width: "100%",
          maxWidth: 680,
          padding: "var(--space-8) var(--space-4) var(--space-4)",
          textAlign: "center",
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "var(--color-primary)",
            textDecoration: "none",
            lineHeight: 1.2,
          }}
        >
          Thriver
        </a>
      </header>

      {/* Content */}
      <section
        style={{
          width: "100%",
          maxWidth: 680,
          padding: "0 var(--space-4) var(--space-16)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-3xl)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          Privacy Policy
        </h1>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            color: "var(--color-text-secondary)",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Your privacy matters deeply to us. Thriver is built on trust — the trust
          you place in us when you share your thoughts, feelings, and journey. This
          policy explains, in clear language, how we handle your information.
        </p>

        <Section title="What we collect">
          <p>
            To provide a personal and meaningful experience, Thriver collects:
          </p>
          <ul>
            <li>
              <strong>Account information</strong> — your email address and name when
              you create an account.
            </li>
            <li>
              <strong>Conversations</strong> — the messages you share with Maravae,
              your AI companion. These are the heart of your experience.
            </li>
            <li>
              <strong>Journal entries</strong> — any reflections, notes, or journaling
              you choose to write.
            </li>
            <li>
              <strong>Mood &amp; check-in data</strong> — your daily emotional
              check-ins and wellness reflections.
            </li>
            <li>
              <strong>Usage patterns</strong> — which features you use and how often,
              so we can improve Thriver.
            </li>
          </ul>
        </Section>

        <Section title="How we use your data">
          <ul>
            <li>
              <strong>To power your companion.</strong> Your conversations and
              reflections help Maravae remember you and offer personalized, meaningful
              support.
            </li>
            <li>
              <strong>To improve Thriver.</strong> We analyze anonymized usage
              patterns to make the app better — smoother, more helpful, more
              attuned to what you need.
            </li>
            <li>
              <strong>To communicate with you.</strong> We may send occasional emails
              about your account or new features (you can opt out anytime).
            </li>
          </ul>
        </Section>

        <Section title="What we never do">
          <ul>
            <li>
              <strong>We never sell your data.</strong> Not to advertisers, not to
              data brokers, not to anyone. Your story is yours.
            </li>
            <li>
              <strong>We never share your personal information</strong> with third
              parties, except as required to provide the service (see below).
            </li>
            <li>
              <strong>We never run third-party ads or tracking.</strong> Thriver is
              ad-free. There are no hidden trackers, no analytics SDKs selling your
              behavior.
            </li>
          </ul>
        </Section>

        <Section title="AI conversations &amp; OpenAI">
          <p>
            Your conversations with Maravae are processed using OpenAI's API to
            generate thoughtful, personalized responses. This means your messages are
            sent to OpenAI's servers for processing. OpenAI's privacy policy applies
            to how they handle that data — you can read it at{" "}
            <a
              href="https://openai.com/policies/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--color-primary)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              openai.com/policies/privacy-policy
            </a>
            .
          </p>
          <p>
            Importantly, we have configured our OpenAI usage so that your
            conversations are <strong>not</strong> used by OpenAI to train their
            models. Your words stay between you and Maravae.
          </p>
        </Section>

        <Section title="Data security">
          <p>
            We store your data securely using industry-standard encryption and best
            practices. While no system is perfectly immune to risk, we take the
            protection of your personal information seriously and continuously work to
            keep it safe.
          </p>
        </Section>

        <Section title="Your control">
          <ul>
            <li>
              <strong>Access your data.</strong> You can request a copy of everything
              we have stored about you at any time.
            </li>
            <li>
              <strong>Delete your account.</strong> You can delete your account and
              all associated data permanently, at any time, from within the app or by
              contacting us. Once deleted, your data is gone — it cannot be recovered.
            </li>
          </ul>
        </Section>

        <Section title="Children">
          <p>
            Thriver is not intended for children under 13. We do not knowingly
            collect information from anyone under 13 years of age.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make changes, we'll let you know — through the app or via email. The
            latest version will always be available here.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            If you have any questions about this policy, your data, or anything else —
            please reach out. We're here for you.
          </p>
          <p style={{ marginTop: "var(--space-2)" }}>
            <a
              href="mailto:support@maravae.com"
              style={{
                color: "var(--color-primary)",
                fontWeight: 600,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              support@maravae.com
            </a>
          </p>
        </Section>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            margin: "var(--space-4) 0 0",
          }}
        >
          Last updated: July 2026
        </p>
      </section>
    </main>
  );
}

/* ============================================
   REUSABLE SECTION COMPONENT
   ============================================ */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "var(--space-5)",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-light)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "0 0 var(--space-3)",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
          lineHeight: 1.7,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
