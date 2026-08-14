"use client";

import { useState } from "react";
import {
  downloadSessionsJsonFromAccount,
  downloadSessionsTextFromAccount,
} from "../lib/exportSessions";

interface Props {
  /** Live count from dashboard state (stays correct after clear / new practice) */
  sessionCount: number;
}

export function ExportSessionsSettings({ sessionCount }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleJson = async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const { count: n } = await downloadSessionsJsonFromAccount();
      setStatus(
        n === 0
          ? "Downloaded an empty JSON backup (no sessions on your account)."
          : `Downloaded JSON backup of ${n} session${n === 1 ? "" : "s"}.`
      );
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Could not download JSON. Check that you are logged in."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleText = async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const { count: n } = await downloadSessionsTextFromAccount();
      setStatus(
        n === 0
          ? "Downloaded an empty text backup (no sessions on your account)."
          : `Downloaded text backup of ${n} session${n === 1 ? "" : "s"}.`
      );
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Could not download text. Check that you are logged in."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-gray-900">Export sessions</h2>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          Download a backup of practice history from your account. Do this before clearing
          account history.
        </p>
      </div>

      <p className="text-sm text-gray-700">
        Stored sessions:{" "}
        <span className="font-medium text-gray-900">{sessionCount}</span>
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            void handleJson();
          }}
          disabled={busy}
          className="rounded-lg border border-gray-200 bg-white text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          {busy ? "Preparing…" : "Download JSON"}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleText();
          }}
          disabled={busy}
          className="rounded-lg border border-gray-200 bg-white text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          {busy ? "Preparing…" : "Download text"}
        </button>
      </div>

      {status && <p className="text-sm text-gray-600 leading-relaxed">{status}</p>}
    </div>
  );
}
