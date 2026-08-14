"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";

/**
 * MVP account strip: shows email + Log out when signed in,
 * or Sign up / Log in links when signed out.
 */
export function AuthAccountBar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="border-t border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-400">Checking account…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border-t border-gray-200 px-4 py-3 space-y-2">
        <p className="text-xs text-gray-400">Not signed in</p>
        <div className="flex gap-2">
          <Link
            href="/login"
            className="flex-1 text-center rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-50"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="flex-1 text-center rounded-lg bg-gray-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 px-4 py-3 space-y-2">
      <p className="text-xs text-gray-500 truncate" title={user.email ?? undefined}>
        {user.email ?? "Signed in"}
      </p>
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-40"
      >
        {busy ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}
