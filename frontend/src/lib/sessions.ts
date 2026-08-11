import { Session, normalizeWeaknessTags } from "../types";

const STORAGE_KEY = "sessions";

export function getSessions(): Session[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Normalize tags so old sessions without weakness_tags stay safe to aggregate
    return parsed.map((session: Session) => ({
      ...session,
      feedback: {
        ...session.feedback,
        weakness_tags: normalizeWeaknessTags(session.feedback?.weakness_tags),
      },
    }));
  } catch {
    return [];
  }
}

export function getSessionById(id: string): Session | null {
  return getSessions().find((session) => session.id === id) ?? null;
}

export function saveSession(newSession: Session): Session[] {
  const existing = getSessions();
  existing.push(newSession);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return existing;
}
