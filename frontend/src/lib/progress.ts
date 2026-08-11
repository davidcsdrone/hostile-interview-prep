import { Session } from "../types";

/**
 * Progress is computed only from real sessions for one company.
 * No hardcoded stage per company.
 *
 * Design (rigorous / improvement-first):
 * - Form (recent scores) — how you perform now
 * - Trend (recent vs older) — genuine improvement moves the bar; decline pulls it down
 * - Depth (session count) — enough reps to trust the signal (diminishing returns)
 * - Weak-spot gate — active recurring weak spots cap progress below Crush It
 * - Crush It gate — high bar: enough sessions, strong recent form, non-declining trend, no active weak spots
 */

export type StageID =
  | "initial"
  | "getting_there"
  | "interview_ready"
  | "crush_it";

export type CompanyProgress = {
  pct: number;
  stage: StageID;
  label: string;
  colorClass: string;
  /** One-line explanation of why the bar is here */
  summary: string;
  sessionCount: number;
  recentAvg: number | null;
  trendDelta: number | null;
  hasActiveWeakSpots: boolean;
};

const STAGE_META: Record<
  StageID,
  { label: string; colorClass: string; minPct: number }
> = {
  initial: {
    label: "Initial Progress",
    colorClass: "bg-red-500",
    minPct: 1,
  },
  getting_there: {
    label: "Getting There",
    colorClass: "bg-amber-500",
    minPct: 35,
  },
  interview_ready: {
    label: "All But Interview Ready",
    colorClass: "bg-blue-500",
    minPct: 60,
  },
  crush_it: {
    label: "You Will Crush It",
    colorClass: "bg-emerald-500",
    minPct: 85,
  },
};

const RECENT_WINDOW = 5;
const TREND_WINDOW = 8;
const MIN_TREND_SESSIONS = 4;
const DEPTH_SATURATION = 10;

/** Max points from each pillar (sum = 100 before gates) */
const FORM_WEIGHT = 40;
const TREND_WEIGHT = 40;
const DEPTH_WEIGHT = 20;

/** Active weak spots cannot claim Crush It territory */
const WEAK_SPOT_CAP = 74;

const CRUSH_MIN_SESSIONS = 6;
const CRUSH_MIN_RECENT_AVG = 78;
const CRUSH_MIN_PCT = 85;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sortNewestFirst(sessions: Session[]): Session[] {
  return [...sessions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function scoreOf(session: Session): number {
  const raw = session.feedback?.logical_score;
  if (typeof raw !== "number" || Number.isNaN(raw)) return 0;
  return clamp(raw, 0, 100);
}

function stageFromPct(pct: number): StageID {
  if (pct >= STAGE_META.crush_it.minPct) return "crush_it";
  if (pct >= STAGE_META.interview_ready.minPct) return "interview_ready";
  if (pct >= STAGE_META.getting_there.minPct) return "getting_there";
  return "initial";
}

export type ComputeProgressOptions = {
  /** From Weak Spots aggregation for this company (active recurring tags) */
  hasActiveWeakSpots?: boolean;
};

/**
 * Compute readiness for one company's sessions.
 * Pass only sessions already filtered to that company.
 */
export function computeCompanyProgress(
  sessions: Session[],
  options: ComputeProgressOptions = {}
): CompanyProgress {
  const ordered = sortNewestFirst(sessions);
  const sessionCount = ordered.length;
  const activeWeak = Boolean(options.hasActiveWeakSpots);

  if (sessionCount === 0) {
    return {
      pct: 0,
      stage: "initial",
      label: "Not started",
      colorClass: "bg-gray-300",
      summary: "Complete a graded practice to start measuring progress.",
      sessionCount: 0,
      recentAvg: null,
      trendDelta: null,
      hasActiveWeakSpots: false,
    };
  }

  const scores = ordered.map(scoreOf);
  const recent = scores.slice(0, Math.min(RECENT_WINDOW, scores.length));
  const recentAvg = mean(recent);

  // --- Form: current quality (0–FORM_WEIGHT) ---
  const formPts = (recentAvg / 100) * FORM_WEIGHT;

  // --- Trend: improvement vs earlier work (0–TREND_WEIGHT, can shrink if declining) ---
  let trendDelta: number | null = null;
  let trendPts: number;

  if (sessionCount >= MIN_TREND_SESSIONS) {
    const window = scores.slice(0, Math.min(TREND_WINDOW, scores.length));
    const mid = Math.floor(window.length / 2);
    const newer = window.slice(0, mid);
    const older = window.slice(mid);
    trendDelta = mean(newer) - mean(older);

    // +20 point lift → full trend credit; −15 → near-zero trend credit
    const trendRatio = clamp((trendDelta + 15) / 35, 0, 1);
    trendPts = trendRatio * TREND_WEIGHT;
  } else {
    // Not enough history to prove improvement — conservative partial credit from form only
    trendPts = (recentAvg / 100) * TREND_WEIGHT * 0.35;
  }

  // --- Depth: enough reps to trust the signal (0–DEPTH_WEIGHT) ---
  const depthRatio = clamp(sessionCount / DEPTH_SATURATION, 0, 1);
  const depthPts = depthRatio * DEPTH_WEIGHT;

  let pct = Math.round(clamp(formPts + trendPts + depthPts, 0, 100));

  if (activeWeak) {
    pct = Math.min(pct, WEAK_SPOT_CAP);
  }

  // Crush It is earned, not a color rename of a high average
  const crushEligible =
    !activeWeak &&
    sessionCount >= CRUSH_MIN_SESSIONS &&
    recentAvg >= CRUSH_MIN_RECENT_AVG &&
    (trendDelta === null || trendDelta >= 0) &&
    pct >= CRUSH_MIN_PCT;

  if (!crushEligible && pct >= CRUSH_MIN_PCT) {
    pct = CRUSH_MIN_PCT - 1;
  }

  const stage = stageFromPct(pct);
  const meta = STAGE_META[stage];

  const parts: string[] = [];
  parts.push(`Recent avg ${Math.round(recentAvg)}`);
  if (trendDelta !== null) {
    const sign = trendDelta >= 0 ? "+" : "";
    parts.push(`${sign}${Math.round(trendDelta)} vs earlier`);
  } else {
    parts.push(`need ${MIN_TREND_SESSIONS}+ sessions for trend`);
  }
  parts.push(`${sessionCount} session${sessionCount === 1 ? "" : "s"}`);
  if (activeWeak) {
    parts.push("active weak spots capping progress");
  } else if (!crushEligible && stage === "interview_ready") {
    parts.push("Crush It needs strong form, non-declining trend, 6+ sessions");
  }

  return {
    pct,
    stage,
    label: sessionCount === 0 ? "Not started" : meta.label,
    colorClass: meta.colorClass,
    summary: parts.join(" · "),
    sessionCount,
    recentAvg,
    trendDelta,
    hasActiveWeakSpots: activeWeak,
  };
}

export function stageColorClass(stage: StageID): string {
  return STAGE_META[stage].colorClass;
}
