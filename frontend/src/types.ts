export type RoleId =
  | "data-analyst"
  | "data-engineer"
  | "software-engineer"
  | "product-manager"
  | "data-scientist";

export const ROLES: { id: RoleId; label: string }[] = [
  { id: "data-analyst", label: "Data Analyst" },
  { id: "data-engineer", label: "Data Engineer" },
  { id: "software-engineer", label: "Software Engineer" },
  { id: "product-manager", label: "Product Manager" },
  { id: "data-scientist", label: "Data Scientist" },
];

/** Fixed Weak Spots taxonomy — must match backend allowlist */
export type WeaknessTag =
  | "no_metrics"
  | "rambling"
  | "no_structure"
  | "vague_ownership"
  | "buzzwords"
  | "shallow_tradeoffs"
  | "no_reflection"
  | "off_question";

export const WEAKNESS_TAGS: { id: WeaknessTag; label: string }[] = [
  { id: "no_metrics", label: "Doesn't quantify impact" },
  { id: "rambling", label: "Rambles before the point" },
  { id: "no_structure", label: "Weak answer structure" },
  { id: "vague_ownership", label: "Vague ownership" },
  { id: "buzzwords", label: "Overuses buzzwords" },
  { id: "shallow_tradeoffs", label: "Skips tradeoffs" },
  { id: "no_reflection", label: "Weak reflection" },
  { id: "off_question", label: "Misses the question" },
];

const ALLOWED_TAG_IDS = new Set<string>(WEAKNESS_TAGS.map((t) => t.id));

/** Keep 0–3 allowlisted tags so we can count them without NLP */
export function normalizeWeaknessTags(raw: unknown): WeaknessTag[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: WeaknessTag[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const key = item.trim().toLowerCase();
    if (ALLOWED_TAG_IDS.has(key) && !cleaned.includes(key as WeaknessTag)) {
      cleaned.push(key as WeaknessTag);
    }
    if (cleaned.length >= 3) break;
  }
  return cleaned;
}

export interface Question {
  id: string;
  company: string;
  question: string;
  role: RoleId;
  timeLimit: number;
}

export interface Feedback {
  logical_score: number;
  missed_points: string[];
  hostile_critique: string;
  next_step_action: string;
  transcript: string;
  weakness_tags: WeaknessTag[];
}

export interface Session {
  id: string;
  questionId: string;
  question?: string;
  company?: string;
  timestamp: string;
  feedback: Feedback;
}
