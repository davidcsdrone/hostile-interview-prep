"use client";

import { useState } from "react";
import { clearPracticeSessions } from "../lib/practiceSessionsDb";

interface Props {
  sessionCount: number;
  /** Refresh dashboard React state after wipe */
  onCleared?: () => void;
}

export function ClearLocalDataSettings({ sessionCount, onCleared }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canClear = sessionCount > 0;

  const handleClear = async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);

    try {
      const { removed } = await clearPracticeSessions();
      setConfirming(false);
      onCleared?.();

      if (removed === 0) {
        setStatus("No practice sessions left on your account.");
      } else {
        setStatus(
          `Cleared ${removed} practice session${removed === 1 ? "" : "s"} from your account.`
        );
      }
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Could not clear account history. Try again."
      );
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-gray-900">Clear account history</h2>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          Delete all practice sessions saved to your account (history, scores, Weak Spots
          evidence). This cannot be undone. Export a backup first if you may want this data
          later.
        </p>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          Does not change grader tone or other Settings preferences.
        </p>
      </div>

      <p className="text-sm text-gray-700">
        Stored sessions:{" "}
        <span className="font-medium text-gray-900">{sessionCount}</span>
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => {
            setStatus(null);
            setConfirming(true);
          }}
          disabled={busy || !canClear}
          className="rounded-lg border border-red-200 bg-white text-red-800 px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Clear practice history…
        </button>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-red-900 leading-relaxed">
            Permanently delete{" "}
            <span className="font-medium">
              {sessionCount} session{sessionCount === 1 ? "" : "s"}
            </span>{" "}
            from your account? Weak Spots and progress will reset until you practice again.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void handleClear();
              }}
              disabled={busy}
              className="rounded-lg bg-red-700 text-white px-4 py-2 text-sm font-medium hover:bg-red-800 transition-colors disabled:opacity-40"
            >
              {busy ? "Clearing…" : "Yes, delete everything"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-lg border border-gray-200 bg-white text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status && <p className="text-sm text-gray-600 leading-relaxed">{status}</p>}
    </div>
  );
}
