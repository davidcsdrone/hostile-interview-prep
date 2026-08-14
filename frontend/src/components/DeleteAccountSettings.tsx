"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { clearSessions as clearLocalSessions } from "../lib/sessions";

/**
 * Permanently delete the signed-in account + Supabase practice history.
 * Requires backend DELETE /account (service role) and a typed confirmation.
 */
export function DeleteAccountSettings() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canDelete = typed.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (busy || !canDelete) return;
    setBusy(true);
    setStatus(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        setStatus("You must be logged in to delete your account.");
        return;
      }

      const response = await fetch("http://localhost:8000/account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      if (!response.ok) {
        let detail = "Could not delete account. Try again.";
        try {
          const body = await response.json();
          if (typeof body?.detail === "string" && body.detail.trim()) {
            detail = body.detail;
          }
        } catch {
          // keep fallback
        }
        setStatus(detail);
        return;
      }

      // Local leftovers only; cloud rows were already wiped by the API
      clearLocalSessions();
      await supabase.auth.signOut();
      router.replace("/signup");
      router.refresh();
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Could not reach the server to delete your account."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-red-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-gray-900">Delete account</h2>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          Permanently delete your Hostile Logic Trainer account and all practice history on
          this product (scores, transcripts, critiques, Weak Spots evidence).
        </p>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          Raw interview videos are not stored on our servers (only derived transcript and
          feedback). Deleting your account here does not delete your Google account.
        </p>
      </div>

      {!confirming ? (
        <button
          type="button"
          onClick={() => {
            setStatus(null);
            setTyped("");
            setConfirming(true);
          }}
          disabled={busy}
          className="rounded-lg border border-red-300 bg-white text-red-800 px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          Delete my account…
        </button>
      ) : (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-red-900 leading-relaxed font-medium">
            This is permanent and cannot be undone.
          </p>
          <p className="text-sm text-red-900/90 leading-relaxed">
            Your account login for this app will be removed, and your practice history will be
            wiped. There is no recovery. Export a backup first if you might want the data later.
          </p>
          <div>
            <label
              htmlFor="delete-confirm"
              className="block text-sm font-medium text-red-900 mb-1.5"
            >
              Type DELETE to confirm
            </label>
            <input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
              autoComplete="off"
              className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-900/10 disabled:opacity-50"
              placeholder="DELETE"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void handleDelete();
              }}
              disabled={busy || !canDelete}
              className="rounded-lg bg-red-700 text-white px-4 py-2 text-sm font-medium hover:bg-red-800 transition-colors disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Yes, permanently delete my account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
              disabled={busy}
              className="rounded-lg border border-gray-200 bg-white text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status && <p className="text-sm text-red-800 leading-relaxed">{status}</p>}
    </div>
  );
}
