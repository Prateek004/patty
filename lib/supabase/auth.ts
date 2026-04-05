/**
 * BillMate Auth — Username + Password only (no OTP)
 * All queries are automatically scoped to auth.uid() via Supabase RLS.
 */
import { getSupabase } from "./client";

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/** Sign up with username + password */
export async function signUp(username: string, password: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  // Use username@billmate.local as the synthetic email
  const email = `${username.toLowerCase().trim()}@billmate.local`;

  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };

  // Create profile row
  if (data.user) {
    await sb.from("profiles").insert({
      id: data.user.id,
      username: username.toLowerCase().trim(),
    });
  }

  return { ok: true };
}

/** Sign in with username + password */
export async function signIn(username: string, password: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  const email = `${username.toLowerCase().trim()}@billmate.local`;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Sign out */
export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

/** Get current user id */
export async function getCurrentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}
