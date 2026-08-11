import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Session } from "../types";

interface Props {
  sessions: Session[];
}

export function SessionHistory({ sessions }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-900">
          Past sessions ({sessions.length})
        </h3>
      </div>
      {sessions.length === 0 ? (
        <p className="px-6 py-6 text-sm text-gray-400">No sessions yet.</p>
      ) : (
        <div>
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className="flex items-center justify-between px-6 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0 pr-4">
                <p className="text-sm text-gray-900 truncate">
                  {session.question ?? "Attempted problem"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(session.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium text-gray-900">
                  {session.feedback.logical_score}/100
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
