import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

/* ============================================
   HERO SECTION
   ============================================ */

function HeroSection() {
  return (
    <section
      style={{
        background: "var(--color-accent-light)",
        minHeight: "90dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "var(--space-8) var(--space-4)",
        gap: "var(--space-6)",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-script)",
          fontSize: "clamp(2.5rem, 6vw, 3.75rem)",
          fontWeight: 600,
          color: "var(--color-primary)",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        Thriver
      </h1>

      <p
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(1.125rem, 3vw, 1.5rem)",
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          margin: 0,
          maxWidth: 460,
          lineHeight: 1.4,
        }}
      >
        Your daily companion for healing &amp; growth
      </p>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          color: "var(--color-text-secondary)",
          margin: 0,
          maxWidth: 400,
          lineHeight: 1.6,
        }}
      >
        A judgment-free space to talk, reflect, and rebuild — one small step at a time.
      </p>

      <a
        href="/login?mode=register"
        className="btn-primary"
        style={{
          marginTop: "var(--space-4)",
          textDecoration: "none",
          maxWidth: 280,
        }}
      >
        Begin your journey — free
      </a>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-xs)",
          color: "var(--color-text-muted)",
          margin: 0,
        }}
      >
        Already have an account?{" "}
        <a
          href="/login"
          style={{
            color: "var(--color-primary)",
            fontWeight: 600,
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Sign in
        </a>
      </p>
    </section>
  );
}

/* ============================================
   WHAT IS THRIVEHER
   ============================================ */

function WhatIsSection() {
  return (
    <section
      style={{
        padding: "var(--space-16) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-8)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-2xl)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            margin: "0 0 var(--space-3)",
          }}
        >
          What is Thriver?
        </h2>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Thriver is an AI-powered daily companion — not a blank journal. Open the
          app and start a conversation with Maravae, a compassionate companion who
          remembers you. Between therapy sessions and coaching calls, Thriver is the
          judgment-free space where real healing happens, one small conversation at a
          time.
        </p>
      </div>

      {/* Feature Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "var(--space-4)",
          width: "100%",
          maxWidth: 700,
        }}
      >
        {[
          {
            emoji: "💬",
            title: "Talk it out",
            desc: "Chat with a compassionate AI companion that remembers you. No blank page — just conversation.",
          },
          {
            emoji: "🌿",
            title: "Follow your path",
            desc: "Structured micro-goal pathways for real growth — gentle, step-by-step, at your own pace.",
          },
          {
            emoji: "✨",
            title: "Track your becoming",
            desc: "Gentle progress tracking, never a scorecard. Celebrate small wins as you remember who you are.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="card"
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-6)",
            }}
          >
            <span style={{ fontSize: "2rem" }}>{card.emoji}</span>
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-lg)",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
              {card.title}
            </h3>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {card.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================
   WHO IT'S FOR
   ============================================ */

function WhoSection() {
  return (
    <section
      style={{
        background: "var(--color-primary-light)",
        padding: "var(--space-16) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "var(--space-4)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-2xl)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: 0,
        }}
      >
        Who is Thriver for?
      </h2>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          color: "var(--color-text-secondary)",
          lineHeight: 1.6,
          margin: 0,
          maxWidth: 420,
        }}
      >
        Women rebuilding after survival mode — emotionally unhealthy relationships,
        chronic self-abandonment, burnout, divorce, grief, or major life transitions.
      </p>

      <p
        className="text-script"
        style={{
          fontFamily: "var(--font-script)",
          fontSize: "1.25rem",
          color: "var(--color-primary)",
          margin: "var(--space-2) 0 0",
          maxWidth: 400,
          lineHeight: 1.4,
        }}
      >
        You're not looking to be fixed. You're looking to remember who you are.
      </p>
    </section>
  );
}

/* ============================================
   HOW IT WORKS
   ============================================ */

function HowSection() {
  return (
    <section
      style={{
        padding: "var(--space-16) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-8)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-2xl)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: 0,
          textAlign: "center",
        }}
      >
        How it works
      </h2>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
          maxWidth: 400,
          width: "100%",
        }}
      >
        {[
          {
            num: "1",
            title: "Open the app",
            desc: "No complicated setup. Just open Thriver and Maravae is there, ready to talk.",
          },
          {
            num: "2",
            title: "Talk",
            desc: "Share what's on your mind — big, small, messy, or clear. There's no wrong way to begin.",
          },
          {
            num: "3",
            title: "Grow",
            desc: "One conversation at a time, you build momentum, self-trust, and a deeper connection with yourself.",
          },
        ].map((step) => (
          <div
            key={step.num}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-4)",
              padding: "var(--space-4)",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-light)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-full)",
                background: "var(--color-primary)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {step.num}
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "var(--text-base)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  margin: "0 0 var(--space-1)",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================
   PRICING
   ============================================ */

function PricingSection() {
  return (
    <section
      style={{
        background: "var(--color-surface-raised)",
        padding: "var(--space-16) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-8)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-2xl)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: 0,
          textAlign: "center",
        }}
      >
        Simple pricing
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "var(--space-4)",
          width: "100%",
          maxWidth: 580,
        }}
      >
        {/* Free Tier */}
        <div
          className="card"
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            padding: "var(--space-6)",
            border: "1px solid var(--color-border-light)",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-xl)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            Free
          </h3>
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-3xl)",
              fontWeight: 700,
              color: "var(--color-primary)",
              margin: 0,
            }}
          >
            $0
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            forever
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-body)",
            }}
          >
            <li>5 conversations per week</li>
            <li>Daily check-in</li>
            <li>1 active pathway</li>
          </ul>
        </div>

        {/* Thrive Tier */}
        <div
          className="card"
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            padding: "var(--space-6)",
            border: "2px solid var(--color-accent)",
            boxShadow: "var(--shadow-md)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--color-accent)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-body)",
              fontSize: "0.6875rem",
              fontWeight: 700,
              padding: "2px var(--space-3)",
              borderRadius: "var(--radius-full)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
            }}
          >
            Coming soon
          </div>
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-xl)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            Thrive
          </h3>
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-3xl)",
              fontWeight: 700,
              color: "var(--color-accent-hover)",
              margin: 0,
            }}
          >
            $9.99
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            per month
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-body)",
            }}
          >
            <li>Unlimited conversations</li>
            <li>Full AI memory — Maravae remembers you</li>
            <li>All pathways unlocked</li>
          </ul>
          <button
            type="button"
            className="btn-primary"
            disabled
            style={{
              background: "var(--color-text-muted)",
              cursor: "not-allowed",
              marginTop: "var(--space-2)",
            }}
          >
            Coming soon
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   FAQ
   ============================================ */

function FaqSection() {
  const faqs = [
    {
      q: "Is this therapy?",
      a: "No. Thriver is a companion for personal growth and emotional support — not a clinical tool or replacement for professional mental-health care.",
    },
    {
      q: "Is my data private?",
      a: "Yes. Your conversations are private and secure. We never share or sell your data. You can delete your account and all data at any time.",
    },
    {
      q: "Can I use it for free?",
      a: "Yes! The free plan includes 5 conversations per week, a daily check-in, and one active pathway — plenty to get started.",
    },
    {
      q: "What makes Thriver different?",
      a: "It remembers you. Every conversation builds on the last — you're not starting over every time you open the app. That continuity is where real growth happens.",
    },
  ];

  return (
    <section
      style={{
        padding: "var(--space-16) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-6)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-2xl)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: 0,
          textAlign: "center",
        }}
      >
        Questions you might have
      </h2>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          maxWidth: 540,
          width: "100%",
        }}
      >
        {faqs.map((faq) => (
          <details
            key={faq.q}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-4)",
              cursor: "pointer",
            }}
          >
            <summary
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                listStyle: "none",
              }}
            >
              {faq.q}
            </summary>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
                margin: "var(--space-3) 0 0",
              }}
            >
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ============================================
   FOOTER CTA
   ============================================ */

function FooterCta() {
  return (
    <section
      style={{
        background: "var(--color-primary)",
        padding: "var(--space-16) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "var(--space-6)",
      }}
    >
      <p
        className="text-script"
        style={{
          fontFamily: "var(--font-script)",
          fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
          color: "var(--color-accent-light)",
          margin: 0,
          maxWidth: 420,
          lineHeight: 1.4,
        }}
      >
        You are not behind. You are becoming.
      </p>

      <a
        href="/login?mode=register"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 48,
          padding: "var(--space-3) var(--space-6)",
          background: "var(--color-accent-light)",
          color: "var(--color-primary)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          fontWeight: 600,
          border: "none",
          borderRadius: "var(--radius-xl)",
          cursor: "pointer",
          textDecoration: "none",
          maxWidth: 280,
          width: "100%",
        }}
      >
        Begin your journey — free
      </a>

      <div
        style={{
          display: "flex",
          gap: "var(--space-4)",
          marginTop: "var(--space-4)",
        }}
      >
        <a
          href="/login"
          style={{
            color: "var(--color-accent-light)",
            fontSize: "var(--text-xs)",
            fontFamily: "var(--font-body)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            opacity: 0.8,
          }}
        >
          Login
        </a>
        <span style={{ color: "var(--color-accent-light)", opacity: 0.3 }}>·</span>
        <a
          href="/privacy"
          style={{
            color: "var(--color-accent-light)",
            fontSize: "var(--text-xs)",
            fontFamily: "var(--font-body)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            opacity: 0.8,
          }}
        >
          Privacy Policy
        </a>
        <span style={{ color: "var(--color-accent-light)", opacity: 0.3 }}>·</span>
        <a
          href="/privacy"
          style={{
            color: "var(--color-accent-light)",
            fontSize: "var(--text-xs)",
            fontFamily: "var(--font-body)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            opacity: 0.8,
          }}
        >
          Terms of Service
        </a>
      </div>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.625rem",
          color: "var(--color-accent-light)",
          opacity: 0.5,
          margin: "var(--space-2) 0 0",
        }}
      >
        Thriver is a companion for personal growth — not medical or mental-health treatment.
      </p>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.625rem",
          color: "var(--color-accent-light)",
          opacity: 0.4,
          margin: "var(--space-1) 0 0",
        }}
      >
        &copy; 2026 Maravae
      </p>
    </section>
  );
}

/* ============================================
   LANDING PAGE
   ============================================ */

function LandingPage() {
  return (
    <main style={{ background: "var(--color-bg)", overflowX: "hidden" }}>
      <HeroSection />
      <WhatIsSection />
      <WhoSection />
      <HowSection />
      <PricingSection />
      <FaqSection />
      <FooterCta />
    </main>
  );
}
