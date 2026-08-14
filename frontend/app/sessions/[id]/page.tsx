"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Session } from "../../../src/types";
import { getPracticeSessionById } from "../../../src/lib/practiceSessionsDb";
import { FeedbackDisplay } from "../../../src/components/FeedbackDisplay";

export default function SessionDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setSession(null);
        return;
      }

      setSession(undefined);
      setError(null);

      try {
        const found = await getPracticeSessionById(id);
        if (!cancelled) setSession(found);
      } catch (err) {
        console.error("Failed to load session", err);
        if (!cancelled) {
          setSession(null);
          setError(
            err instanceof Error ? err.message : "Failed to load this session."
          );
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-sm text-gray-500">
        Loading session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-3xl mx-auto px-8 py-10 space-y-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to dashboard
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-600">
              {error ??
                "Session not found. It may belong to another account, or it was deleted."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-8 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to dashboard
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            Practice again
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Question
          </p>
          <h1 className="text-lg font-semibold text-gray-900">
            {session.question ?? "Attempted problem"}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {new Date(session.timestamp).toLocaleString()}
          </p>
        </div>

        <FeedbackDisplay feedback={session.feedback} />
      </div>
    </div>
  );
}
