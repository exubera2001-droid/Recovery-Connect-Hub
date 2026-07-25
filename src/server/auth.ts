/**
 * Thriver auth server functions — called from client components.
 * Uses TanStack Start's createServerFn for RPC-style communication.
 */
import { createServerFn } from "@tanstack/react-start";
import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
} from "../auth";
import { createUser, getUserByEmail, getUserById, deleteUser } from "../db";
import type { UserPublic } from "../db/schema";

/* ============================================
   REGISTER
   ============================================ */

export const registerUser = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { email?: string; password?: string };
    const email = d.email?.trim().toLowerCase();
    const password = d.password;

    if (!email || !password) throw new Error("Email and password are required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    if (!email.includes("@")) throw new Error("Please provide a valid email address");

    return { email, password };
  })
  .handler(async ({ data }) => {
    const { email, password } = data;

    const existing = getUserByEmail(email);
    if (existing) {
      throw new Error("An account with this email already exists");
    }

    const passwordHash = await hashPassword(password);
    const user = createUser(email, passwordHash);

    const token = signJwt({
      sub: user.id,
      email: user.email,
      tier: user.tier,
    });

    const { password_hash: _, ...publicUser } = user;
    return { user: publicUser, token };
  });

/* ============================================
   LOGIN
   ============================================ */

export const loginUser = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { email?: string; password?: string };
    const email = d.email?.trim().toLowerCase();
    const password = d.password;

    if (!email || !password) throw new Error("Email and password are required");

    return { email, password };
  })
  .handler(async ({ data }) => {
    const { email, password } = data;

    const user = getUserByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    const token = signJwt({
      sub: user.id,
      email: user.email,
      tier: user.tier,
    });

    const { password_hash: _, ...publicUser } = user;
    return { user: publicUser, token };
  });

/* ============================================
   CHECK AUTH (validate token)
   ============================================ */

export const checkAuth = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const d = data as { token?: string };
    return { token: d.token ?? null };
  })
  .handler(async ({ data }) => {
    if (!data.token) {
      return { user: null };
    }

    const payload = verifyJwt(data.token);
    if (!payload) {
      return { user: null };
    }

    const user = getUserByEmail(payload.email);
    if (!user) {
      return { user: null };
    }

    const { password_hash: _, ...publicUser } = user;
    return { user: publicUser };
  });

/* ============================================
   DELETE ACCOUNT
   ============================================ */

export const deleteAccountFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as { token?: string; password?: string };
    const token = d.token ?? null;
    const password = d.password;

    if (!password || typeof password !== "string" || password.trim().length === 0) {
      throw new Error("Password is required to delete your account");
    }

    return { token, password: password.trim() };
  })
  .handler(async ({ data }) => {
    if (!data.token) {
      throw new Error("Authentication required");
    }

    const payload = verifyJwt(data.token);
    if (!payload) {
      throw new Error("Invalid or expired token");
    }

    const user = getUserById(payload.sub);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify password before deletion
    const valid = await verifyPassword(data.password, user.password_hash);
    if (!valid) {
      throw new Error("Incorrect password");
    }

    deleteUser(user.id);

    return { success: true };
  });
