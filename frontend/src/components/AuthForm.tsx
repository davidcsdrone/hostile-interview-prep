"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";

type Mode = "login" | "signup";

interface Props {
  mode: Mode;
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Try logging in.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (lower.includes("unable to validate email")) {
    return "That email address does not look valid.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email first (check your inbox), then log in.";
  }
  if (lower.includes("provider is not enabled")) {
    return "Google sign-in is not enabled yet in Supabase Authentication → Providers.";
  }
  if (lower.includes("oauth state") || lower.includes("bad_oauth_state")) {
    return "Google sign-in timed out or lost its place. Try Continue with Google again (don’t leave the Google screen open too long).";
  }
  return message;
}

/** Only allow same-origin relative paths (blocks open redirects). */
function safeNextPath(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/")) return "/dashboard";
  if (raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/login") || raw.startsWith("/signup")) return "/dashboard";
  if (raw.startsWith("/auth/")) return "/dashboard";
  return raw;
}

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const title = isSignup ? "Create account" : "Log in";
  const submitLabel = isSignup ? "Sign up" : "Log in";
  const nextPath = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError === "oauth") {
      setError(
        "Google sign-in failed or expired. Try Continue with Google again. In Supabase → Authentication → URL Configuration, Redirect URLs must include exactly http://localhost:3000/auth/callback"
      );
    } else if (oauthError === "auth_config") {
      setError("Auth is misconfigured. Check frontend/.env.local Supabase keys.");
    }
  }, [searchParams]);

  const goAfterAuth = () => {
    router.replace(nextPath);
    router.refresh();
  };

  const handleGoogle = async () => {
    if (busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);

    try {
      // Keep redirectTo exact (no ?next=...). Query params often break Supabase allow-list matching.
      document.cookie = `hlt_auth_next=${encodeURIComponent(nextPath)}; Path=/; Max-Age=600; SameSite=Lax`;

      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (oauthError) {
        setError(friendlyAuthError(oauthError.message));
        setBusy(false);
      }
      // On success the browser redirects away to Google / Supabase.
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(friendlyAuthError(message));
      setBusy(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setError(null);
    setInfo(null);
    setBusy(true);

    try {
      const supabase = createClient();
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedEmail || !password) {
        setError("Email and password are required.");
        return;
      }

      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });

        if (signUpError) {
          setError(friendlyAuthError(signUpError.message));
          return;
        }

        // Confirm-email enabled: no session yet
        if (!data.session) {
          setInfo(
            "Account created. If email confirmation is on, check your inbox, then log in."
          );
          return;
        }

        goAfterAuth();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        return;
      }

      goAfterAuth();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(friendlyAuthError(message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Hostile Logic Trainer
          </p>
          <h1 className="text-xl font-semibold mt-1">{title}</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {isSignup
              ? "Create an account to keep practice history on your profile."
              : "Log in to access your account."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleGoogle();
          }}
          disabled={busy}
          className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or email</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-900 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:opacity-50"
            />
            {isSignup ? (
              <p className="text-xs text-gray-400 mt-1.5">At least 6 characters.</p>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-red-700 leading-relaxed" role="alert">
              {error}
            </p>
          ) : null}

          {info ? (
            <p className="text-sm text-gray-600 leading-relaxed" role="status">
              {info}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-gray-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {busy ? (isSignup ? "Creating account…" : "Logging in…") : submitLabel}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-gray-900 font-medium hover:underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              Need an account?{" "}
              <Link href="/signup" className="text-gray-900 font-medium hover:underline">
                Sign up
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
