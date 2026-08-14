import { WEAKNESS_TAGS, type Session } from "../types";
import { listPracticeSessions } from "./practiceSessionsDb";

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function tagLabel(id: string): string {
  return WEAKNESS_TAGS.find((t) => t.id === id)?.label ?? id;
}

/** Full machine-readable backup of practice history. */
export function sessionsToJson(sessions: Session[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "Hostile Logic Trainer",
      sessionCount: sessions.length,
      sessions,
    },
    null,
    2
  );
}

/** Human-readable backup for skimming offline. */
export function sessionsToText(sessions: Session[]): string {
  const lines: string[] = [
    "Hostile Logic Trainer practice history export",
    `Exported: ${new Date().toISOString()}`,
    `Sessions: ${sessions.length}`,
    "",
  ];

  if (sessions.length === 0) {
    lines.push("No sessions stored on this account.");
    return lines.join("\n");
  }

  sessions.forEach((session, index) => {
    const fb = session.feedback;
    lines.push(`===== Session ${index + 1} =====`);
    lines.push(`ID: ${session.id}`);
    lines.push(`When: ${session.timestamp}`);
    lines.push(`Company: ${session.company ?? "(unknown)"}`);
    lines.push(`Question ID: ${session.questionId}`);
    lines.push(`Question: ${session.question ?? "(not saved)"}`);
    lines.push(`Score: ${fb?.logical_score ?? "n/a"}`);
    lines.push(
      `Weak spots: ${(fb?.weakness_tags ?? []).map(tagLabel).join("; ") || "(none)"}`
    );
    lines.push("");
    lines.push("Critique:");
    lines.push(fb?.hostile_critique?.trim() || "(none)");
    lines.push("");
    lines.push("Missed points:");
    const missed = fb?.missed_points ?? [];
    if (missed.length === 0) {
      lines.push("(none)");
    } else {
      missed.forEach((p) => lines.push(`- ${p}`));
    }
    lines.push("");
    lines.push("Next step:");
    lines.push(fb?.next_step_action?.trim() || "(none)");
    lines.push("");
    lines.push("Transcript:");
    lines.push(fb?.transcript?.trim() || "(none)");
    lines.push("");
  });

  return lines.join("\n");
}

function downloadBlob(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadSessionsJsonFromAccount(): Promise<{ count: number }> {
  const sessions = await listPracticeSessions();
  downloadBlob(
    `hlt-sessions-${stamp()}.json`,
    sessionsToJson(sessions),
    "application/json;charset=utf-8"
  );
  return { count: sessions.length };
}

export async function downloadSessionsTextFromAccount(): Promise<{ count: number }> {
  const sessions = await listPracticeSessions();
  downloadBlob(
    `hlt-sessions-${stamp()}.txt`,
    sessionsToText(sessions),
    "text/plain;charset=utf-8"
  );
  return { count: sessions.length };
}
