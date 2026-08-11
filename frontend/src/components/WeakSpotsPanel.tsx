"use client";

import Link from "next/link";
import {
  Session,
  WeaknessTag,
  WEAKNESS_TAGS,
  normalizeWeaknessTags,
} from "../types";
import {
  OTHER_COMPANY,
  canonicalizeCompany,
  isOtherCompany,
} from "../lib/companies";

const MIN_SESSIONS = 3;
const WINDOW_SIZE = 8;
const RECENT_SLICE = 4;
const MIN_TAG_HITS = 2;
const MAX_SPOTS = 5;
const MAX_EXAMPLE_LINKS = 2;

/** "all" = every company; otherwise a company display name (e.g. "Amazon") or Other */
export type WeakSpotsFilter = "all" | string;

/** Phase 3: one concrete drill per tag */
export const DRILL_BY_TAG: Record<WeaknessTag, string> = {
  no_metrics:
    "In your next answer, force one number (%, $, time, or users) into the first 20 seconds.",
  rambling:
    "Start with a one-sentence headline answer, then give two supporting bullets — nothing else.",
  no_structure:
    "Use STAR out loud: Situation → Task → Action → Result. Say each label as you go.",
  vague_ownership:
    "Say “I” for every action. Ban “we” unless you then name your exact role.",
  buzzwords:
    "Replace every buzzword with a concrete example of what you built or decided.",
  shallow_tradeoffs:
    "Name one alternative you rejected and why — even if the interviewer didn’t ask.",
  no_reflection:
    "End with one sentence: what you’d do differently next time and why.",
  off_question:
    "Before answering, restate the question in one line, then answer only that.",
};

export type WeakSpotSummary = {
  tag: WeaknessTag;
  label: string;
  hitCount: number;
  windowSize: number;
  exampleSessionIds: string[];
  evidence: string | null;
  companyBreakdown: { company: string; count: number }[];
  lastSeen: string | null;
  drill: string;
  status: "active" | "improving";
  recentHits: number;
  olderHits: number;
};

function sortNewestFirst(sessions: Session[]): Session[] {
  return [...sessions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function tagLabel(tag: WeaknessTag): string {
  return WEAKNESS_TAGS.find((t) => t.id === tag)?.label ?? tag;
}

function formatCompanyBreakdown(
  breakdown: { company: string; count: number }[]
): string {
  if (breakdown.length === 0) return "Unknown company";
  return breakdown.map((b) => `${b.company} ×${b.count}`).join(" · ");
}

function countTagInSessions(sessions: Session[], tag: WeaknessTag): number {
  let n = 0;
  for (const session of sessions) {
    const tags = new Set(normalizeWeaknessTags(session.feedback?.weakness_tags));
    if (tags.has(tag)) n += 1;
  }
  return n;
}

/**
 * True if this session set has any active recurring weak spots
 * (used for Crush It progress gate).
 */
export function hasActiveWeakSpots(sessions: Session[]): boolean {
  const { spots } = aggregateWeakSpots(sessions);
  return spots.some((s) => s.status === "active");
}

export function aggregateWeakSpots(sessions: Session[]): {
  ready: boolean;
  sessionCount: number;
  spots: WeakSpotSummary[];
  improving: WeakSpotSummary[];
} {
  const sessionCount = sessions.length;

  if (sessionCount < MIN_SESSIONS) {
    return { ready: false, sessionCount, spots: [], improving: [] };
  }

  const window = sortNewestFirst(sessions).slice(0, WINDOW_SIZE);
  const windowSize = window.length;
  const recentSlice = window.slice(0, Math.min(RECENT_SLICE, window.length));
  const olderSlice = window.slice(Math.min(RECENT_SLICE, window.length));

  const hitCount = new Map<WeaknessTag, number>();
  const examples = new Map<WeaknessTag, string[]>();
  const evidenceByTag = new Map<WeaknessTag, string>();
  const companyCounts = new Map<WeaknessTag, Map<string, number>>();
  const lastSeenByTag = new Map<WeaknessTag, string>();

  for (const session of window) {
    const tags = normalizeWeaknessTags(session.feedback?.weakness_tags);
    const unique = [...new Set(tags)];
    const company = canonicalizeCompany(session.company);
    const missed = session.feedback?.missed_points;
    const evidenceLine =
      Array.isArray(missed) && typeof missed[0] === "string" && missed[0].trim()
        ? missed[0].trim()
        : null;

    for (const tag of unique) {
      hitCount.set(tag, (hitCount.get(tag) ?? 0) + 1);

      const ids = examples.get(tag) ?? [];
      if (ids.length < MAX_EXAMPLE_LINKS) {
        ids.push(session.id);
        examples.set(tag, ids);
      }

      if (evidenceLine && !evidenceByTag.has(tag)) {
        evidenceByTag.set(tag, evidenceLine);
      }

      const byCompany = companyCounts.get(tag) ?? new Map<string, number>();
      byCompany.set(company, (byCompany.get(company) ?? 0) + 1);
      companyCounts.set(tag, byCompany);

      const prev = lastSeenByTag.get(tag);
      if (!prev || new Date(session.timestamp) > new Date(prev)) {
        lastSeenByTag.set(tag, session.timestamp);
      }
    }
  }

  const summaries: WeakSpotSummary[] = [];

  for (const tag of hitCount.keys()) {
    const count = hitCount.get(tag) ?? 0;
    const recentHits = countTagInSessions(recentSlice, tag);
    const olderHits = countTagInSessions(olderSlice, tag);

    // Improving: was recurring in the older half, gone from the newest half
    const isImproving = olderHits >= MIN_TAG_HITS && recentHits === 0;
    // Active: still recurring in the full window and appears in recent sessions
    const isActive = count >= MIN_TAG_HITS && recentHits >= 1;

    if (!isActive && !isImproving) continue;

    const byCompany = companyCounts.get(tag) ?? new Map();
    const companyBreakdown = [...byCompany.entries()]
      .map(([company, c]) => ({ company, count: c }))
      .sort((a, b) => b.count - a.count || a.company.localeCompare(b.company));

    summaries.push({
      tag,
      label: tagLabel(tag),
      hitCount: count,
      windowSize,
      exampleSessionIds: examples.get(tag) ?? [],
      evidence: evidenceByTag.get(tag) ?? null,
      companyBreakdown,
      lastSeen: lastSeenByTag.get(tag) ?? null,
      drill: DRILL_BY_TAG[tag],
      status: isImproving ? "improving" : "active",
      recentHits,
      olderHits,
    });
  }

  summaries.sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    if (b.hitCount !== a.hitCount) return b.hitCount - a.hitCount;
    return a.tag.localeCompare(b.tag);
  });

  const active = summaries.filter((s) => s.status === "active").slice(0, MAX_SPOTS);
  const improving = summaries
    .filter((s) => s.status === "improving")
    .slice(0, MAX_SPOTS);

  return { ready: true, sessionCount, spots: active, improving };
}

interface Props {
  sessions: Session[];
  /** Known companies shown as filter chips (order preserved) */
  companyNames: string[];
  /** Controlled filter: all companies, or one company name */
  filter: WeakSpotsFilter;
  onFilterChange: (filter: WeakSpotsFilter) => void;
  /** Opens start-practice flow so Weak Spots change what they do next */
  onPractice?: () => void;
}

function SpotCard({
  spot,
  onPractice,
}: {
  spot: WeakSpotSummary;
  onPractice?: () => void;
}) {
  const improving = spot.status === "improving";

  return (
    <li className="px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{spot.label}</p>
            {improving && (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Improving
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {improving ? (
              <>
                Was in {spot.olderHits} older sessions · 0 of your last{" "}
                {Math.min(RECENT_SLICE, spot.windowSize)}
                {spot.lastSeen
                  ? ` · Last seen ${new Date(spot.lastSeen).toLocaleDateString()}`
                  : ""}
              </>
            ) : (
              <>
                Seen in {spot.hitCount} of last {spot.windowSize} sessions
                {spot.lastSeen
                  ? ` · Last seen ${new Date(spot.lastSeen).toLocaleDateString()}`
                  : ""}
              </>
            )}
          </p>
          <p className="text-xs text-gray-500">
            {formatCompanyBreakdown(spot.companyBreakdown)}
          </p>
          {spot.evidence && (
            <p className="text-sm text-gray-600 leading-relaxed">
              <span className="text-gray-400">Why: </span>
              &ldquo;{spot.evidence}&rdquo;
            </p>
          )}
          <p className="text-sm text-gray-900 leading-relaxed">
            <span className="text-gray-400">Next drill: </span>
            {spot.drill}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {spot.exampleSessionIds.map((id, index) => (
              <Link
                key={id}
                href={`/sessions/${id}`}
                className="text-xs text-gray-700 underline underline-offset-2 hover:text-gray-900"
              >
                Open example {index + 1}
              </Link>
            ))}
            {onPractice && !improving && (
              <button
                type="button"
                onClick={onPractice}
                className="text-xs font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700"
              >
                Practice this next
              </button>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
          {spot.tag}
        </span>
      </div>
    </li>
  );
}

function chipClass(active: boolean): string {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-gray-900 text-white"
      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
  }`;
}

function sessionsForFilter(
  sessions: Session[],
  filter: WeakSpotsFilter,
  knownNames: string[]
): Session[] {
  if (filter === "all") return sessions;

  const known = new Set(knownNames.map((n) => n.toLowerCase()));
  const isOtherFilter = filter.toLowerCase() === OTHER_COMPANY.toLowerCase();

  return sessions.filter((s) => {
    const company = canonicalizeCompany(s.company);
    if (isOtherFilter) {
      return (
        company === OTHER_COMPANY || !known.has(company.toLowerCase())
      );
    }
    return company.toLowerCase() === filter.toLowerCase();
  });
}

export function WeakSpotsPanel({
  sessions,
  companyNames,
  filter,
  onFilterChange,
  onPractice,
}: Props) {
  const isCompanyFilter = filter !== "all";
  const isOtherFilter =
    filter.toLowerCase() === OTHER_COMPANY.toLowerCase();
  const filterLabel = !isCompanyFilter
    ? "all companies"
    : isOtherFilter
      ? "Other (missing or unrecognized company)"
      : filter;

  const hasOtherSessions = sessions.some((s) => isOtherCompany(s.company));
  // Keep Other visible if it's the active filter, even after orphans are cleaned up
  const showOtherChip = hasOtherSessions || isOtherFilter;

  const scopedSessions = sessionsForFilter(sessions, filter, companyNames);

  const { ready, sessionCount, spots, improving } =
    aggregateWeakSpots(scopedSessions);

  const allSessionCount = sessions.length;
  const showAllHint =
    isCompanyFilter && sessionCount < MIN_SESSIONS && allSessionCount >= MIN_SESSIONS;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={chipClass(filter === "all")}
            aria-pressed={filter === "all"}
          >
            All
          </button>
          {companyNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onFilterChange(name)}
              className={chipClass(
                filter.toLowerCase() === name.toLowerCase()
              )}
              aria-pressed={filter.toLowerCase() === name.toLowerCase()}
            >
              {name}
            </button>
          ))}
          {showOtherChip && (
            <button
              type="button"
              onClick={() => onFilterChange(OTHER_COMPANY)}
              className={chipClass(
                filter.toLowerCase() === OTHER_COMPANY.toLowerCase()
              )}
              aria-pressed={
                filter.toLowerCase() === OTHER_COMPANY.toLowerCase()
              }
              title="Sessions with a missing or unrecognized company"
            >
              {OTHER_COMPANY}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Showing: {filterLabel}
          {ready || sessionCount > 0
            ? ` · based on ${sessionCount} session${sessionCount === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>

      {!ready && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-2">Weak spots</h2>
          <p className="text-sm text-gray-500">
            {isCompanyFilter ? (
              <>
                Complete at least {MIN_SESSIONS} practice sessions
                {isOtherFilter
                  ? " with a missing or unrecognized company"
                  : ` for ${filter}`}{" "}
                so we can find patterns on this track. You have {sessionCount} so
                far.
                {showAllHint ? (
                  <>
                    {" "}
                    You already have enough sessions overall — switch to{" "}
                    <button
                      type="button"
                      onClick={() => onFilterChange("all")}
                      className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700"
                    >
                      All
                    </button>{" "}
                    to see patterns across companies.
                  </>
                ) : null}
              </>
            ) : (
              <>
                Complete at least {MIN_SESSIONS} practice sessions so we can find
                patterns that are specific to you. You have {sessionCount} so far.
              </>
            )}
          </p>
        </div>
      )}

      {ready && spots.length === 0 && improving.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-2">Weak spots</h2>
          <p className="text-sm text-gray-500">
            No recurring patterns yet in your last{" "}
            {Math.min(sessionCount, WINDOW_SIZE)} sessions
            {isCompanyFilter ? ` for ${filter}` : ""}. We only flag tags that show
            up more than once.
            {isCompanyFilter && allSessionCount > sessionCount ? (
              <>
                {" "}
                Try{" "}
                <button
                  type="button"
                  onClick={() => onFilterChange("all")}
                  className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700"
                >
                  All
                </button>{" "}
                if you practiced other companies.
              </>
            ) : null}
          </p>
        </div>
      )}

      {ready && spots.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Active weak spots</h2>
            <p className="text-xs text-gray-400 mt-1">
              Still showing up in recent sessions
              {isCompanyFilter ? ` at ${filter}` : ""}. Do the drill, then practice.
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {spots.map((spot) => (
              <SpotCard key={spot.tag} spot={spot} onPractice={onPractice} />
            ))}
          </ul>
        </div>
      )}

      {ready && improving.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Improving</h2>
            <p className="text-xs text-gray-400 mt-1">
              These showed up before, but not in your newest sessions. Keep it up.
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {improving.map((spot) => (
              <SpotCard key={spot.tag} spot={spot} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
