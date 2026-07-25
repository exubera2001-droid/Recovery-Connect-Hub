/**
 * Thriver authentication — JWT sign/verify using Node crypto (available in Bun).
 * Uses Bun.password for password hashing (bcrypt internally).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserPublic } from "./db/schema";
import { getUserByEmail } from "./db";

// Overrideable via environment; use a fixed dev secret for the MVP.
const JWT_SECRET = process.env.JWT_SECRET ?? "thriveher-dev-secret-change-in-production";
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/* ============================================
   PASSWORD HASHING (Bun.password = bcrypt)
   Bun.password is a global in Bun runtime — no import needed.
   ============================================ */

export async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return Bun.password.verify(plain, hash);
}

/* ============================================
   JWT
   ============================================ */

function base64url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

export interface JwtPayload {
  sub: number; // user id
  email: string;
  tier: string;
  exp: number; // unix ms
}

export function signJwt(payload: Omit<JwtPayload, "exp">): string {
  const fullPayload: JwtPayload = {
    ...payload,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  };
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(fullPayload));
  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, bodyB64, sigB64] = parts;
  const expectedSig = createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${bodyB64}`)
    .digest("base64url");

  // Constant-time comparison
  const sigBuf = Buffer.from(sigB64);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(bodyB64, "base64url").toString("utf8")
    ) as JwtPayload;

    // Check expiry
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

/* ============================================
   COOKIE HELPERS
   ============================================ */

const COOKIE_NAME = "thriver_token";

export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (name === COOKIE_NAME) {
      return rest.join("="); // handle = in value
    }
  }
  return null;
}

export function setTokenCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${Math.floor(
    TOKEN_EXPIRY_MS / 1000
  )}; SameSite=Lax`;
}

export function clearTokenCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

/* ============================================
   REQUEST AUTHENTICATION
   ============================================ */

export function authenticateRequest(
  request: Request
): { user: UserPublic } | { error: string; status: number } {
  const cookieHeader = request.headers.get("cookie");
  const token = getTokenFromCookies(cookieHeader);
  if (!token) {
    return { error: "Not authenticated", status: 401 };
  }

  const payload = verifyJwt(token);
  if (!payload) {
    return { error: "Invalid or expired token", status: 401 };
  }

  // Verify the user still exists
  const user = getUserByEmail(payload.email);
  if (!user) {
    return { error: "User not found", status: 401 };
  }

  const { password_hash: _, ...publicUser } = user;
  return { user: publicUser };
}
