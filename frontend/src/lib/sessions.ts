import { Session, normalizeWeaknessTags } from "../types";
import { canonicalizeCompany } from "./companies";

const STORAGE_KEY = "sessions";

function normalizeSession(session: Session): Session {
  return {
    ...session,
    company: canonicalizeCompany(session.company),
    feedback: {
      ...session.feedback,
      weakness_tags: normalizeWeaknessTags(session.feedback?.weakness_tags),
    },
  };
}

export function getSessions(): Session[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Normalize tags + company so old / blank / slug values stay filterable
    let dirty = false;
    const normalized = parsed.map((session: Session) => {
      const next = normalizeSession(session);
      if (next.company !== session.company) dirty = true;
      return next;
    });

    // Persist once so History / Weak Spots chips stay consistent after reload
    if (dirty) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    return [];
  }
}

export function getSessionById(id: string): Session | null {
  return getSessions().find((session) => session.id === id) ?? null;
}

export function saveSession(newSession: Session): Session[] {
  const existing = getSessions();
  existing.push(normalizeSession(newSession));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return existing;
}
