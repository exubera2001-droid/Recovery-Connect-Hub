import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getConversationFn,
  sendMessageFn,
  getConversationHistoryFn,
} from "../../server/conversation";
import { getTodayCheckinFn, saveCheckinFn } from "../../server/checkins";
import { getStoreLinkFn } from "../../server/store";

/* ============================================
   REMEMBER SCREEN SENTENCES
   ============================================ */

const REMEMBER_SENTENCES = [
  "You were never too much.",
  "You don't have to earn love.",
  "Healing isn't becoming someone new.",
  "Today, choose yourself once.",
  "You are not behind. You are becoming.",
  "Rest is not quitting.",
  "Your feelings are not an inconvenience.",
  "You are allowed to take up space.",
  "Small steps. Real growth.",
  "You're doing better than you think.",
  "What you need matters too.",
  "Let today be gentle.",
  "You survived everything that was meant to break you.",
  "Peace is a practice.",
  "There is no timeline for healing.",
] as const;

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCurrentWeekKey(): string {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
  const weekNum = Math.ceil((days + yearStart.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

function getRememberSentence(): string {
  const dayOfYear = getDayOfYear();
  return REMEMBER_SENTENCES[dayOfYear % REMEMBER_SENTENCES.length]!;
}

/* ============================================
   TYPES
   ============================================ */

interface ChatMessage {
  id: number;
  message: string;
  response: string | null;
  createdAt: string;
}

interface HistoryDay {
  date: string;
  preview: string;
}

type PageView = "chat" | "history" | "safety";

/* ============================================
   MOOD DATA
   ============================================ */

const MOODS = [
  { emoji: "🌱", label: "Hopeful" },
  { emoji: "🙏", label: "Grateful" },
  { emoji: "😴", label: "Tired" },
  { emoji: "😰", label: "Overwhelmed" },
  { emoji: "😌", label: "Peaceful" },
  { emoji: "😟", label: "Anxious" },
] as const;

/* ============================================
   HELPERS
   ============================================ */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("thriver_token");
}

function formatHistoryDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().slice(0, 10)) return "Today";
  if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function shouldShowStoreAfterConversation(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = `shown_store_after_talk_${getTodayKey()}`;
    return localStorage.getItem(key) !== "1";
  } catch {
    return false;
  }
}

function markStoreShownForToday(): void {
  if (typeof window === "undefined") return;
  try {
    const key = `shown_store_after_talk_${getTodayKey()}`;
    localStorage.setItem(key, "1");
  } catch {
    // localStorage not available
  }
}

/* ============================================
   DAILY REMEMBER SCREEN
   ============================================ */

function RememberScreen({ onContinue }: { onContinue: () => void }) {
  const sentence = getRememberSentence();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(170deg, #5A1F33 0%, #4A1829 40%, #3D1422 100%)",
        padding: "var(--space-8)",
      }}
    >
      {/* Decorative top element */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 80,
          height: 2,
          background: "var(--color-accent)",
          opacity: 0.4,
          borderRadius: 1,
        }}
      />

      {/* Sentence */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          paddingBottom: "15vh",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
            color: "#F3EDE2",
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 300,
            textShadow: "0 2px 12px rgba(0,0,0,0.15)",
          }}
        >
          {sentence}
        </p>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onContinue}
        style={{
          background: "transparent",
          border: "1.5px solid var(--color-accent)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-3) var(--space-8)",
          color: "var(--color-accent)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-base)",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 200ms ease",
          marginBottom: "env(safe-area-inset-bottom, 24px)",
          letterSpacing: "0.02em",
        }}
        className="remember-cta"
      >
        Tap to continue →
      </button>

      {/* Subtle brand mark */}
      <p
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom, 12px) + 4px)",
          fontFamily: "var(--font-script)",
          fontSize: "0.75rem",
          color: "rgba(243,237,226,0.25)",
          margin: 0,
        }}
      >
        Thriver
      </p>

      <style>{`
        .remember-cta:hover {
          background: rgba(220,199,161,0.1);
          border-color: var(--color-accent-hover);
          color: var(--color-accent-hover);
        }
      `}</style>
    </div>
  );
}

/* ============================================
   STREAK PROTECTION BANNER
   ============================================ */

function StreakProtectionBanner({
  streak,
  onDismiss,
}: {
  streak: number;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        margin: "0 0 var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        background: "var(--color-accent-light)",
        border: "1px solid var(--color-accent)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        position: "relative",
      }}
    >
      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>💛</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-primary)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Your {streak}-day streak is waiting. One minute to keep it going?
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "1rem",
          color: "var(--color-text-muted)",
          padding: "var(--space-1)",
          flexShrink: 0,
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

/* ============================================
   SPEECH RECOGNITION HOOK
   ============================================ */

function useSpeechRecognition(): {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
  micError: string | null;
  dismissMicError: () => void;
} {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const result = event.results[0]?.[0]?.transcript ?? "";
      setTranscript(result);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event?.error === "not-allowed") {
        setMicError("Microphone access needed — check your browser settings");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.abort(); } catch {}
    };
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript("");
      setMicError(null);
      setIsListening(true);
      try { recognitionRef.current.start(); } catch {}
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      setIsListening(false);
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  const dismissMicError = useCallback(() => setMicError(null), []);

  return { isListening, isSupported, startListening, stopListening, transcript, micError, dismissMicError };
}

/* ============================================
   TTS HOOK
   ============================================ */

function useTTS(): {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
} {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isSupported =
    typeof window !== "undefined" && !!window.speechSynthesis;

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;

      // If already speaking, stop
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      utterance.lang = "en-US";

      // Try to find a warm female voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (v) =>
            v.name.includes("Samantha") ||
            v.name.includes("Karen") ||
            v.name.includes("Moira") ||
            (v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
        ) ??
        voices.find((v) => v.lang.startsWith("en-US")) ??
        voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  return { speak, stop, isSpeaking, isSupported };
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
        height: "60vh",
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ============================================
   TYPING INDICATOR
   ============================================ */

function TypingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-2)",
        padding: "0 var(--space-1)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "var(--radius-full)",
          background: "var(--color-secondary-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          flexShrink: 0,
        }}
      >
        💛
      </div>
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          borderBottomLeftRadius: "4px",
          padding: "var(--space-3) var(--space-4)",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "var(--radius-full)",
              background: "var(--color-text-muted)",
              animation: `pulse 1.4s ${i * 0.2}s ease-in-out infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes pulse {
            0%, 60%, 100% { opacity: 0.3; transform: scale(0.85); }
            30% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ============================================
   CHAT BUBBLE (with TTS for AI)
   ============================================ */

function ChatBubble({
  role,
  text,
  onSpeak,
  isSpeaking,
  ttsSupported,
}: {
  role: "user" | "ai";
  text: string;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  ttsSupported?: boolean;
}) {
  const isUser = role === "user";
  const showTTS = !isUser && ttsSupported && onSpeak;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
        gap: "var(--space-2)",
        padding: "0 var(--space-1)",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "var(--radius-full)",
          background: isUser ? "var(--color-primary-light)" : "var(--color-secondary-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          flexShrink: 0,
        }}
      >
        {isUser ? "🌸" : "💛"}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: "75%",
          background: isUser ? "var(--color-primary)" : "var(--color-surface)",
          color: isUser ? "#FBF5F0" : "var(--color-text-primary)",
          border: isUser ? "none" : "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          borderTopRightRadius: isUser ? "4px" : undefined,
          borderTopLeftRadius: isUser ? undefined : "4px",
          padding: "var(--space-3) var(--space-4)",
          fontFamily: "var(--font-body)",
          fontSize: "0.9375rem",
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          position: "relative",
        }}
      >
        {text}

        {/* TTS play button (AI messages only) */}
        {showTTS && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSpeak!(text);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              background: isSpeaking ? "var(--color-secondary-light)" : "transparent",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              color: isSpeaking ? "var(--color-secondary)" : "var(--color-text-muted)",
              fontSize: "0.75rem",
              padding: 0,
              marginTop: "4px",
              transition: "color 150ms ease, background 150ms ease",
              lineHeight: 1,
            }}
            title={isSpeaking ? "Stop reading" : "Read aloud"}
            aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
          >
            {isSpeaking ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================
   INLINE MOOD SELECTOR
   ============================================ */

function InlineMoodSelector({
  onSelectMood,
  saving,
}: {
  onSelectMood: (mood: string) => void;
  saving: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        padding: "0 var(--space-1)",
        marginTop: "var(--space-3)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-2)",
        }}
      >
        {MOODS.map((mood) => (
          <button
            key={mood.label}
            type="button"
            onClick={() => onSelectMood(mood.label)}
            disabled={saving}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-1)",
              minHeight: 68,
              padding: "var(--space-2) var(--space-1)",
              background: "var(--color-surface)",
              border: "2px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              cursor: saving ? "default" : "pointer",
              fontFamily: "var(--font-body)",
              transition:
                "border-color 150ms ease, background 150ms ease, transform 150ms ease",
              opacity: saving ? 0.5 : 1,
            }}
            className="mood-btn"
          >
            <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{mood.emoji}</span>
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {mood.label}
            </span>
          </button>
        ))}
      </div>
      <p
        style={{
          fontSize: "0.625rem",
          color: "var(--color-text-muted)",
          textAlign: "center",
          fontStyle: "italic",
          margin: 0,
        }}
      >
        Tap a mood to check in — or just start typing below.
      </p>
      <style>{`
        .mood-btn:hover:not(:disabled) {
          border-color: var(--color-primary);
          background: var(--color-primary-light);
          transform: scale(1.03);
        }
        .mood-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
      `}</style>
    </div>
  );
}

/* ============================================
   WEEKLY LIMIT BANNER
   ============================================ */

function WeeklyLimitBanner() {
  return (
    <div
      style={{
        margin: "var(--space-3)",
        padding: "var(--space-4)",
        background: "var(--color-accent-light)",
        border: "1px solid var(--color-accent)",
        borderRadius: "var(--radius-md)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
          margin: "0 0 var(--space-2)",
          lineHeight: 1.5,
        }}
      >
        You've used your conversations for this week. Upgrade to Thrive for
        unlimited conversations and full memory. Your conversations reset on
        Sunday.
      </p>
      <a
        href="/app/settings"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--color-primary)",
          textDecoration: "none",
        }}
      >
        Upgrade to Thrive ✨
      </a>
    </div>
  );
}

/* ============================================
   SAFETY RESOURCES MODAL
   ============================================ */

function SafetyModal({ onClose }: { onClose: () => void }) {
  return (
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
      onClick={onClose}
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
            margin: "0 0 var(--space-3)",
            color: "var(--color-text-primary)",
          }}
        >
          Need more support?
        </h3>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
            margin: "0 0 var(--space-4)",
            lineHeight: 1.5,
          }}
        >
          Thriver is a companion — not a replacement for professional care.
          These resources are free, confidential, and available 24/7.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <div
            style={{
              padding: "var(--space-3)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, margin: "0 0 2px", color: "var(--color-text-primary)" }}>
              988 Suicide & Crisis Lifeline
            </p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-primary)", margin: 0, fontWeight: 700 }}>
              Call or text <strong>988</strong>
            </p>
          </div>

          <div
            style={{
              padding: "var(--space-3)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, margin: "0 0 2px", color: "var(--color-text-primary)" }}>
              Crisis Text Line
            </p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-primary)", margin: 0, fontWeight: 700 }}>
              Text <strong>HOME</strong> to 741741
            </p>
          </div>

          <div
            style={{
              padding: "var(--space-3)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, margin: "0 0 2px", color: "var(--color-text-primary)" }}>
              Emergency
            </p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-primary)", margin: 0, fontWeight: 700 }}>
              Call <strong>911</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: 44,
            padding: "var(--space-2) var(--space-4)",
            background: "var(--color-primary)",
            color: "#FFFFFF",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ============================================
   MARAVAE STORE TOUCHPOINT
   ============================================ */

function StoreTouchpoint({
  storeInfo,
}: {
  storeInfo: { storeUrl: string; featured: { title: string; description: string } };
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      style={{
        margin: "var(--space-2) var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        borderTop: "1px solid var(--color-border-light)",
        borderBottom: "1px solid var(--color-border-light)",
        textAlign: "center",
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={() => setVisible(false)}
        style={{
          position: "absolute",
          top: 4,
          right: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "1rem",
          color: "var(--color-text-muted)",
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-text-muted)",
          margin: "0 0 var(--space-1)",
          lineHeight: 1.5,
          fontStyle: "italic",
        }}
      >
        Want to go deeper?{" "}
        {storeInfo.featured.title} from Maravae has guided prompts for your
        healing journey.
      </p>
      <a
        href={storeInfo.storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          color: "var(--color-accent-hover)",
          textDecoration: "none",
        }}
      >
        Learn more →
      </a>
    </div>
  );
}

/* ============================================
   HISTORY VIEW
   ============================================ */

function HistoryView({
  history,
  onSelectDay,
  onBack,
}: {
  history: HistoryDay[];
  onSelectDay: (date: string) => void;
  onBack: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          color: "var(--color-secondary)",
          width: "fit-content",
          marginBottom: "var(--space-2)",
        }}
      >
        ← Back to Talk
      </button>

      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "0 0 var(--space-3)",
        }}
      >
        Conversation History
      </h2>

      {history.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-8) 0" }}>
          No conversations yet. Start talking — Maravae is here for you. 💛
        </p>
      ) : (
        history.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDay(day.date)}
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 150ms ease",
            }}
            className="history-item"
          >
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                color: "var(--color-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {formatHistoryDate(day.date)}
            </span>
            <span
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                marginTop: "2px",
                lineHeight: 1.4,
              }}
            >
              {day.preview}
            </span>
          </button>
        ))
      )}
      <style>{`
        .history-item:hover {
          border-color: var(--color-secondary);
        }
      `}</style>
    </div>
  );
}

/* ============================================
   CHAT VIEW
   ============================================ */

function ChatView({
  messages,
  greeting,
  rememberWhen,
  onSendMessage,
  isThinking,
  limitReached,
  conversationsRemaining,
  isThrive,
  storeInfo,
  onShowSafety,
  onShowHistory,
  showMoodSelector,
  onSelectMood,
  savingMood,
  ttsSpeak,
  ttsIsSpeaking,
  ttsSupported,
  showStreakBanner,
  streakValue,
  onDismissStreakBanner,
}: {
  messages: ChatMessage[];
  greeting: string | null;
  rememberWhen: string | null;
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  limitReached: boolean;
  conversationsRemaining: number | null;
  isThrive: boolean;
  storeInfo: { storeUrl: string; featured: { title: string; description: string } } | null;
  onShowSafety: () => void;
  onShowHistory: () => void;
  showMoodSelector: boolean;
  onSelectMood: (mood: string) => void;
  savingMood: boolean;
  ttsSpeak: (text: string) => void;
  ttsIsSpeaking: boolean;
  ttsSupported: boolean;
  showStreakBanner: boolean;
  streakValue: number;
  onDismissStreakBanner: () => void;
}) {
  const [input, setInput] = useState("");
  const [currentSpeakingText, setCurrentSpeakingText] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const showStore = storeInfo && shouldShowStoreAfterConversation() && messages.length >= 2;

  const {
    isListening,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    transcript,
    micError,
    dismissMicError,
  } = useSpeechRecognition();

  // Populate input when voice transcript arrives
  useEffect(() => {
    if (transcript) {
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    }
  }, [transcript]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, showMoodSelector]);

  // Mark store as shown
  useEffect(() => {
    if (showStore) {
      markStoreShownForToday();
    }
  }, [showStore]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text || isThinking || limitReached) return;
    setInput("");
    onSendMessage(text);
  }, [input, isThinking, limitReached, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const remainingText =
    !isThrive && conversationsRemaining !== null
      ? `${conversationsRemaining} conversation${conversationsRemaining === 1 ? "" : "s"} left this week`
      : null;

  const handleSpeak = useCallback(
    (text: string) => {
      setCurrentSpeakingText(text);
      ttsSpeak(text);
      // Reset after speech ends (rough estimate: ~150 words/min)
      const estimatedMs = Math.max(2000, text.split(" ").length * 400);
      setTimeout(() => setCurrentSpeakingText(null), estimatedMs);
    },
    [ttsSpeak]
  );

  // Determine if there's anything to show in the chat
  const hasContent = messages.length > 0 || greeting;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Streak Protection Banner */}
      {showStreakBanner && (
        <StreakProtectionBanner
          streak={streakValue}
          onDismiss={onDismissStreakBanner}
        />
      )}

      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-2)",
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
          Talk with Maravae
        </h2>
        <button
          type="button"
          onClick={onShowHistory}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: "var(--color-secondary)",
            padding: "var(--space-1) var(--space-2)",
          }}
        >
          History
        </button>
      </div>

      {/* Remaining count */}
      {remainingText && (
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            margin: "0 0 var(--space-2)",
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          {remainingText}
        </p>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          paddingBottom: "var(--space-2)",
          maxHeight: "calc(100dvh - 300px)",
        }}
      >
        {/* Greeting bubble — always shown when there's no conversation history */}
        {greeting && messages.length === 0 && (
          <ChatBubble
            role="ai"
            text={greeting}
            onSpeak={(t) => handleSpeak(t)}
            isSpeaking={currentSpeakingText === greeting && ttsIsSpeaking}
            ttsSupported={ttsSupported}
          />
        )}

        {/* Remember When — surfaced past conversation (once/week) */}
        {rememberWhen && messages.length === 0 && (
          <ChatBubble
            role="ai"
            text={rememberWhen}
            onSpeak={(t) => handleSpeak(t)}
            isSpeaking={currentSpeakingText === rememberWhen && ttsIsSpeaking}
            ttsSupported={ttsSupported}
          />
        )}

        {/* Inline mood selector — shown after greeting when not checked in */}
        {showMoodSelector && (
          <InlineMoodSelector onSelectMood={onSelectMood} saving={savingMood} />
        )}

        {/* Conversation messages */}
        {messages.map((msg, i) => (
          <div key={msg.id || i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <ChatBubble role="user" text={msg.message} />
            {msg.response && (
              <ChatBubble
                role="ai"
                text={msg.response}
                onSpeak={(t) => handleSpeak(t)}
                isSpeaking={currentSpeakingText === msg.response && ttsIsSpeaking}
                ttsSupported={ttsSupported}
              />
            )}
          </div>
        ))}

        {isThinking && <TypingIndicator />}

        {/* Empty state when no greeting or messages */}
        {!hasContent && (
          <p
            style={{
              textAlign: "center",
              color: "var(--color-text-muted)",
              fontSize: "var(--text-sm)",
              padding: "var(--space-10) 0",
              fontStyle: "italic",
            }}
          >
            Start a conversation — Maravae is here for you 💛
          </p>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Store touchpoint */}
      {showStore && storeInfo && <StoreTouchpoint storeInfo={storeInfo} />}

      {/* Weekly limit banner */}
      {limitReached && <WeeklyLimitBanner />}

      {/* Input area */}
      {!limitReached && (
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "flex-end",
            padding: "var(--space-3) 0",
            borderTop: "1px solid var(--color-border-light)",
            marginTop: "var(--space-2)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            rows={1}
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-surface)",
              border: "2px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              lineHeight: 1.4,
              color: "var(--color-text-primary)",
              resize: "none",
              outline: "none",
              transition: "border-color 150ms ease",
            }}
            className="chat-input"
          />

          {/* Mic button */}
          {voiceSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-full)",
                background: isListening ? "var(--color-gentle-error)" : "var(--color-surface)",
                border: isListening
                  ? "2px solid var(--color-gentle-error)"
                  : "2px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 150ms ease",
                animation: isListening ? "pulse-mic 1.5s ease-in-out infinite" : "none",
              }}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isListening ? "#FFFFFF" : "var(--color-text-secondary)"}
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )}

          {/* Send button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isThinking}
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-full)",
              background:
                input.trim() && !isThinking
                  ? "var(--color-primary)"
                  : "var(--color-border-light)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() && !isThinking ? "pointer" : "default",
              flexShrink: 0,
              transition: "background 150ms ease",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      )}

      {/* Mic permission error */}
      {micError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            marginTop: "var(--space-1)",
            background: "var(--color-gentle-warning-bg, #fef9e7)",
            borderRadius: "var(--radius-lg)",
            fontSize: "0.8125rem",
            color: "var(--color-text-secondary)",
          }}
        >
          <span>{micError}</span>
          <button
            type="button"
            onClick={dismissMicError}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              color: "var(--color-text-muted)",
              padding: "0 var(--space-1)",
            }}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Safety link */}
      <button
        type="button"
        onClick={onShowSafety}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "0.6875rem",
          color: "var(--color-text-muted)",
          padding: "var(--space-2) 0",
          width: "fit-content",
          margin: "0 auto",
          textDecoration: "underline",
          opacity: 0.6,
        }}
      >
        Need more support?
      </button>

      <style>{`
        .chat-input:focus {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px var(--color-primary-light);
        }
        @keyframes pulse-mic {
          0%, 100% { box-shadow: 0 0 0 0 rgba(160, 85, 74, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(160, 85, 74, 0); }
        }
      `}</style>
    </div>
  );
}

/* ============================================
   PAGE COMPONENT
   ============================================ */

export const Route = createFileRoute("/app/journal")({
  component: TalkPage,
});

function TalkPage() {
  const [view, setView] = useState<PageView>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [rememberWhen, setRememberWhen] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [conversationsRemaining, setConversationsRemaining] = useState<number | null>(null);
  const [isThrive, setIsThrive] = useState(false);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [storeInfo, setStoreInfo] = useState<{
    storeUrl: string;
    featured: { title: string; description: string };
  } | null>(null);

  // Check-in state
  const [checkedInToday, setCheckedInToday] = useState<boolean | null>(null);
  const [savingMood, setSavingMood] = useState(false);

  // Remember Screen
  const [showRememberScreen, setShowRememberScreen] = useState(false);

  // Streak Protection
  const [showStreakBanner, setShowStreakBanner] = useState(false);
  const [streakValue, setStreakValue] = useState(0);

  // TTS hook
  const { speak: ttsSpeak, isSpeaking: ttsIsSpeaking, isSupported: ttsSupported } = useTTS();

  // Load conversation on mount
  const loadConversation = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("Please log in");
      setLoading(false);
      return;
    }

    try {
      const result = await getConversationFn({ data: { token } });
      setMessages(result.messages);
      setGreeting(result.greeting);
      setIsThrive(result.isThrive);
      setConversationsRemaining(result.conversationsRemaining);

      // Handle Remember When — only show if not already shown this week
      if (result.rememberWhen) {
        const weekKey = getCurrentWeekKey();
        const shownKey = `remember_when_shown_${weekKey}`;
        if (typeof window !== "undefined" && localStorage.getItem(shownKey) !== "1") {
          setRememberWhen(result.rememberWhen);
          localStorage.setItem(shownKey, "1");
        }
      }

      // If no greeting (AI is enabled) and no messages, we still need an opening
      if (!result.greeting && result.messages.length === 0) {
        setGreeting(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user has checked in today AND get streak
  const checkTodayCheckin = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const result = await getTodayCheckinFn({ data: { token } });
      setCheckedInToday(result.checkin !== null);
      setStreakValue(result.streak);
    } catch {
      setCheckedInToday(false);
      setStreakValue(0);
    }
  }, []);

  // Load history
  const loadHistory = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const result = await getConversationHistoryFn({ data: { token } });
      setHistory(result.dates);
    } catch {}
  }, []);

  useEffect(() => {
    // Daily Remember Screen check
    const todayKey = getTodayKey();
    const rememberKey = `remember_seen_${todayKey}`;
    if (typeof window !== "undefined" && localStorage.getItem(rememberKey) !== "1") {
      setShowRememberScreen(true);
    }

    // Streak Protection check: after 6pm, not checked in today, streak >= 3
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 18) {
      const streakBannerKey = `streak_banner_shown_${todayKey}`;
      if (typeof window !== "undefined" && localStorage.getItem(streakBannerKey) !== "1") {
        // We'll check streak in checkTodayCheckin
      }
    }

    loadConversation();
    loadHistory();
    checkTodayCheckin();
    getStoreLinkFn()
      .then((r) => setStoreInfo(r))
      .catch(() => {});
  }, [loadConversation, loadHistory, checkTodayCheckin]);

  // Show streak protection if conditions are met
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const todayKey = getTodayKey();
    const streakBannerKey = `streak_banner_shown_${todayKey}`;

    if (
      hour >= 18 &&
      checkedInToday === false &&
      streakValue >= 3 &&
      typeof window !== "undefined" &&
      localStorage.getItem(streakBannerKey) !== "1"
    ) {
      setShowStreakBanner(true);
    }
  }, [checkedInToday, streakValue]);

  const handleContinueFromRemember = useCallback(() => {
    const todayKey = getTodayKey();
    const rememberKey = `remember_seen_${todayKey}`;
    if (typeof window !== "undefined") {
      localStorage.setItem(rememberKey, "1");
    }
    setShowRememberScreen(false);
  }, []);

  const handleDismissStreakBanner = useCallback(() => {
    const todayKey = getTodayKey();
    const streakBannerKey = `streak_banner_shown_${todayKey}`;
    if (typeof window !== "undefined") {
      localStorage.setItem(streakBannerKey, "1");
    }
    setShowStreakBanner(false);
  }, []);

  // Handle mood selection — saves check-in AND sends as first message
  const handleSelectMood = useCallback(
    async (mood: string) => {
      const token = getToken();
      if (!token) return;

      setSavingMood(true);

      try {
        // Save the check-in
        await saveCheckinFn({ data: { token, mood } });
        setCheckedInToday(true);
        // Also dismiss streak banner when they check in
        setShowStreakBanner(false);

        // Send the mood as the first message
        const moodEntry = MOODS.find((m) => m.label === mood);
        const moodText = moodEntry
          ? `Feeling ${moodEntry.label} ${moodEntry.emoji}`
          : `Feeling ${mood}`;

        // Optimistically add user message
        const tempUserMsg: ChatMessage = {
          id: Date.now(),
          message: moodText,
          response: null,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempUserMsg]);
        setIsThinking(true);

        try {
          const result = await sendMessageFn({ data: { token, message: moodText } });

          if ("error" in result && result.code === "WEEKLY_LIMIT_REACHED") {
            setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
            setLimitReached(true);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempUserMsg.id
                  ? { ...result.message, id: result.message.id }
                  : m
              )
            );
            if (result.conversationsRemaining !== undefined) {
              setConversationsRemaining(result.conversationsRemaining);
            }
          }
        } catch {
          setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        } finally {
          setIsThinking(false);
        }
      } catch {
        // If check-in save fails, still proceed
        setCheckedInToday(true);
      } finally {
        setSavingMood(false);
      }
    },
    []
  );

  // Send message handler
  const handleSendMessage = useCallback(
    async (text: string) => {
      const token = getToken();
      if (!token) return;

      // Optimistically add user message
      const tempUserMsg: ChatMessage = {
        id: Date.now(),
        message: text,
        response: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setIsThinking(true);

      try {
        const result = await sendMessageFn({ data: { token, message: text } });

        if ("error" in result && result.code === "WEEKLY_LIMIT_REACHED") {
          setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
          setLimitReached(true);
          setIsThinking(false);
          return;
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempUserMsg.id
              ? { ...result.message, id: result.message.id }
              : m
          )
        );

        if (result.conversationsRemaining !== undefined) {
          setConversationsRemaining(result.conversationsRemaining);
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsThinking(false);
      }
    },
    []
  );

  if (loading) return <LoadingState />;

  if (error && messages.length === 0 && !greeting) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
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
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  // Should we show the inline mood selector?
  // Show when: not checked in today, has a greeting, no conversations yet, and not loading
  const showMoodSelector =
    checkedInToday === false &&
    greeting !== null &&
    messages.length === 0 &&
    !limitReached;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "80dvh" }}>
      {/* Daily Remember Screen — full-screen interstitial */}
      {showRememberScreen && (
        <RememberScreen onContinue={handleContinueFromRemember} />
      )}

      {view === "history" ? (
        <HistoryView
          history={history}
          onSelectDay={() => {}}
          onBack={() => {
            setView("chat");
            loadConversation();
          }}
        />
      ) : view === "safety" ? (
        <SafetyModal onClose={() => setView("chat")} />
      ) : (
        <ChatView
          messages={messages}
          greeting={greeting}
          rememberWhen={rememberWhen}
          onSendMessage={handleSendMessage}
          isThinking={isThinking}
          limitReached={limitReached}
          conversationsRemaining={conversationsRemaining}
          isThrive={isThrive}
          storeInfo={storeInfo}
          onShowSafety={() => setView("safety")}
          onShowHistory={() => {
            setView("history");
            loadHistory();
          }}
          showMoodSelector={showMoodSelector}
          onSelectMood={handleSelectMood}
          savingMood={savingMood}
          ttsSpeak={ttsSpeak}
          ttsIsSpeaking={ttsIsSpeaking}
          ttsSupported={ttsSupported}
          showStreakBanner={showStreakBanner}
          streakValue={streakValue}
          onDismissStreakBanner={handleDismissStreakBanner}
        />
      )}
    </div>
  );
}
