import { createClient } from "./supabase/client";
import {
  normalizeWeaknessTags,
  type Feedback,
  type Session,
} from "../types";
import { canonicalizeCompany } from "./companies";
import { clearSessions as clearLocalSessions } from "./sessions";

/** Row shape returned from public.practice_sessions */
export interface PracticeSessionRow {
  id: string;
  user_id: string;
  question_id: string;
  question: string | null;
  company: string | null;
  role: string | null;
  logical_score: number | null;
  missed_points: unknown;
  hostile_critique: string | null;
  next_step_action: string | null;
  transcript: string | null;
  weakness_tags: unknown;
  feedback: unknown;
  created_at: string;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function feedbackFromRow(row: PracticeSessionRow): Feedback {
  const blob =
    row.feedback && typeof row.feedback === "object"
      ? (row.feedback as Record<string, unknown>)
      : {};

  const logical_score =
    typeof row.logical_score === "number"
      ? row.logical_score
      : typeof blob.logical_score === "number"
        ? blob.logical_score
        : 0;

  const missed_points = asStringArray(
    row.missed_points ?? blob.missed_points
  );
  const hostile_critique =
    (typeof row.hostile_critique === "string" && row.hostile_critique) ||
    (typeof blob.hostile_critique === "string" ? blob.hostile_critique : "") ||
    "";
  const next_step_action =
    (typeof row.next_step_action === "string" && row.next_step_action) ||
    (typeof blob.next_step_action === "string" ? blob.next_step_action : "") ||
    "";
  const transcript =
    (typeof row.transcript === "string" && row.transcript) ||
    (typeof blob.transcript === "string" ? blob.transcript : "") ||
    "";
  const weakness_tags = normalizeWeaknessTags(
    row.weakness_tags ?? blob.weakness_tags
  );

  return {
    logical_score,
    missed_points,
    hostile_critique,
    next_step_action,
    transcript,
    weakness_tags,
  };
}

export function mapRowToSession(row: PracticeSessionRow): Session {
  return {
    id: row.id,
    questionId: row.question_id,
    question: row.question ?? undefined,
    company: row.company ? canonicalizeCompany(row.company) : undefined,
    timestamp: row.created_at,
    feedback: feedbackFromRow(row),
  };
}

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be logged in to use practice history.");
  }
  return data.user.id;
}

export interface SavePracticeSessionInput {
  questionId: string;
  question: string;
  company: string;
  role: string;
  feedback: Feedback;
}

/** Insert a graded session for the current user. Returns the app Session. */
export async function savePracticeSession(
  input: SavePracticeSessionInput
): Promise<Session> {
  const supabase = createClient();
  const userId = await requireUserId();

  const feedback = {
    ...input.feedback,
    weakness_tags: normalizeWeaknessTags(input.feedback.weakness_tags),
  };

  const { data, error } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: userId,
      question_id: input.questionId,
      question: input.question,
      company: canonicalizeCompany(input.company),
      role: input.role,
      logical_score: feedback.logical_score,
      missed_points: feedback.missed_points,
      hostile_critique: feedback.hostile_critique,
      next_step_action: feedback.next_step_action,
      transcript: feedback.transcript,
      weakness_tags: feedback.weakness_tags,
      feedback,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to save practice session.");
  }

  return mapRowToSession(data as PracticeSessionRow);
}

/** Load all practice sessions for the current user (newest first). */
export async function listPracticeSessions(): Promise<Session[]> {
  const supabase = createClient();
  await requireUserId();

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load practice history.");
  }

  return (data as PracticeSessionRow[] | null)?.map(mapRowToSession) ?? [];
}

/** Load one session by id (RLS blocks other users' rows). */
export async function getPracticeSessionById(
  id: string
): Promise<Session | null> {
  if (!id) return null;

  // Old localStorage ids were timestamps like "1786525877353" (not UUIDs).
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return null;
  }

  const supabase = createClient();
  await requireUserId();

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load session.");
  }
  if (!data) return null;
  return mapRowToSession(data as PracticeSessionRow);
}

/** Delete all practice sessions for the current user. Also clears old localStorage leftovers. */
export async function clearPracticeSessions(): Promise<{ removed: number }> {
  const supabase = createClient();
  const userId = await requireUserId();

  const { data: existing, error: listError } = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("user_id", userId);

  if (listError) {
    throw new Error(listError.message || "Failed to read sessions before clear.");
  }

  const removed = existing?.length ?? 0;

  if (removed > 0) {
    const { error: deleteError } = await supabase
      .from("practice_sessions")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      throw new Error(deleteError.message || "Failed to clear practice history.");
    }
  }

  // Remove pre-auth local leftovers so they don't confuse debugging
  clearLocalSessions();

  return { removed };
}
