import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client for Auth (signup / login / logout).
 * Uses NEXT_PUBLIC_* keys only. Never import the service role key here.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local"
    );
  }

  return createBrowserClient(url, anonKey);
}
