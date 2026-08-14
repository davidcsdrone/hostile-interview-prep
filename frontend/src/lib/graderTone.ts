/** Grader feedback voice — persisted in localStorage for v1 */

export type GraderTone = "harsh" | "soft";

export const GRADER_TONE_KEY = "hlt-grader-tone";

export const GRADER_TONE_OPTIONS: {
  id: GraderTone;
  label: string;
  description: string;
}[] = [
  {
    id: "harsh",
    label: "Harsh",
    description: "Blunt hire-room feedback. Default — closest to a tough interviewer.",
  },
  {
    id: "soft",
    label: "Direct but softer",
    description: "Same bar and scoring, clearer and less severe wording.",
  },
];

export function isGraderTone(value: unknown): value is GraderTone {
  return value === "harsh" || value === "soft";
}

export function getGraderTone(): GraderTone {
  if (typeof window === "undefined") return "harsh";
  try {
    const saved = window.localStorage.getItem(GRADER_TONE_KEY);
    if (isGraderTone(saved)) return saved;
  } catch {
    // ignore storage errors
  }
  return "harsh";
}

export function setGraderTone(tone: GraderTone): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GRADER_TONE_KEY, tone);
  } catch {
    // ignore storage errors
  }
}
