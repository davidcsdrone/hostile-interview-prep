"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Building2,
  History,
  Target,
  Settings,
  ChevronRight,
  Mic,
  type LucideIcon,
} from "lucide-react";
import { ROLES, type RoleId, type Session } from "../types";
import { getSessions } from "../lib/sessions";
import { WeakSpotsPanel, hasActiveWeakSpots } from "./WeakSpotsPanel";

export type StageID = "initial" | "getting_there" | "interview_ready" | "crush_it";

export interface CompanySummary {
  id: string;
  name: string;
  stage: StageID;
  lastScore: number;
  sessions: number;
}

interface StageInfo {
  label: string;
  color: string;
  pct: number;
}

type NavView = "companies" | "history" | "weakspots" | "settings";

interface NavItem {
  id: NavView;
  label: string;
  icon: LucideIcon;
}

interface ProgressBarProps {
  stage: StageID;
  hasSessions: boolean;
  /** Phase 3: Crush It locked while active weak spots remain */
  crushItBlocked?: boolean;
}

interface SidebarButtonProps {
  active: boolean;
  onClick: () => void;
  justify?: "start" | "between";
  children: React.ReactNode;
}

interface SidebarProps {
  selectedCompany: string;
  onSelectCompany: (id: string) => void;
  onStartSession: () => void;
  view: NavView;
  onSelectView: (view: NavView) => void;
}

interface SessionListProps {
  sessions: Session[];
  emptyText: string;
}

const COMPANIES: CompanySummary[] = [
  { id: "amazon", name: "Amazon", stage: "getting_there", lastScore: 62, sessions: 8 },
  { id: "meta", name: "Meta", stage: "initial", lastScore: 41, sessions: 3 },
  { id: "google", name: "Google", stage: "interview_ready", lastScore: 85, sessions: 14 },
];

const STAGES: Record<StageID, StageInfo> = {
  initial: { label: "Initial Progress", color: "bg-red-500", pct: 20 },
  getting_there: { label: "Getting There", color: "bg-amber-500", pct: 50 },
  interview_ready: { label: "All But Interview Ready", color: "bg-blue-500", pct: 80 },
  crush_it: { label: "You Will Crush It", color: "bg-emerald-500", pct: 100 },
};

function SidebarButton({ active, onClick, justify = "start", children }: SidebarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        justify === "between" ? "justify-between" : ""
      } ${active ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
    >
      {children}
    </button>
  );
}

function Sidebar({ selectedCompany, onSelectCompany, onStartSession, view, onSelectView }: SidebarProps) {
  const navItems: NavItem[] = [
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "history", label: "History", icon: History },
    { id: "weakspots", label: "Weak Spots", icon: Target },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white h-full flex flex-col">
      <div className="p-4">
        <button
          type="button"
          onClick={onStartSession}
          className="w-full flex items-center gap-2 rounded-lg bg-gray-900 text-white px-3 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New session
        </button>
      </div>

      <nav className="px-2 space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => (
          <SidebarButton key={id} active={view === id} onClick={() => onSelectView(id)}>
            <Icon className="w-4 h-4" />
            {label}
          </SidebarButton>
        ))}
      </nav>

      <div className="mt-4 px-4 py-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Your companies</p>
      </div>
      <div className="px-2 space-y-0.5 overflow-y-auto flex-1">
        {COMPANIES.map((c) => (
          <SidebarButton
            key={c.id}
            active={selectedCompany === c.id}
            onClick={() => onSelectCompany(c.id)}
            justify="between"
          >
            <span>{c.name}</span>
            <span className={`w-2 h-2 rounded-full ${STAGES[c.stage].color}`} />
          </SidebarButton>
        ))}
      </div>
    </aside>
  );
}

function ProgressBar({ stage, hasSessions, crushItBlocked }: ProgressBarProps) {
  if (!hasSessions) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">Not started</span>
          <span className="text-sm text-gray-500">0%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gray-300" style={{ width: "0%" }} />
        </div>
      </div>
    );
  }

  const effectiveStage: StageID =
    stage === "crush_it" && crushItBlocked ? "interview_ready" : stage;
  const s = STAGES[effectiveStage];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{s.label}</span>
        <span className="text-sm text-gray-500">{s.pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
      </div>
      {stage === "crush_it" && crushItBlocked && (
        <p className="text-xs text-gray-500 mt-2">
          Crush It is locked until you clear active weak spots for this company. Check
          Weak Spots → do the drill → practice again.
        </p>
      )}
    </div>
  );
}

function sortNewestFirst(sessions: Session[]): Session[] {
  return [...sessions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function SessionList({ sessions, emptyText }: SessionListProps) {
  if (sessions.length === 0) {
    return <p className="px-6 py-6 text-sm text-gray-400">{emptyText}</p>;
  }

  const ordered = sortNewestFirst(sessions);

  return (
    <div>
      {ordered.map((s) => (
        <Link
          key={s.id}
          href={`/sessions/${s.id}`}
          className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="min-w-0">
            <p className="text-sm text-gray-900 truncate">
              {s.question ?? "Attempted problem"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {[s.company, new Date(s.timestamp).toLocaleString()].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className="text-sm font-medium text-gray-700">
              {s.feedback.logical_score}/100
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedCompany, setSelectedCompany] = useState<string>("amazon");
  const [view, setView] = useState<NavView>("companies");
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleId>("software-engineer");
  const [storedSessions, setStoredSessions] = useState<Session[]>([]);

  // Reload whenever you land on the dashboard (e.g. after finishing practice)
  useEffect(() => {
    setStoredSessions(getSessions());
  }, [pathname]);

  const openRolePicker = () => setShowRolePicker(true);

  const startPractice = () => {
    setShowRolePicker(false);
    router.push(`/?company=${selectedCompany}&role=${selectedRole}`);
  };

  const company = COMPANIES.find((c) => c.id === selectedCompany);

  if (COMPANIES.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-500 text-sm">
        No companies yet. Add one to get started.
      </div>
    );
  }

  if (!company) return null;

  const companySessions = sortNewestFirst(
    storedSessions.filter(
      (s) => s.company?.toLowerCase() === company.name.toLowerCase()
    )
  );
  const recentCompanySessions = companySessions.slice(0, 8);
  const lastScore =
    companySessions.length > 0 ? companySessions[0].feedback.logical_score : null;
  const crushItBlocked = hasActiveWeakSpots(companySessions);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar
        selectedCompany={selectedCompany}
        onSelectCompany={(id) => {
          setSelectedCompany(id);
          setView("companies");
        }}
        onStartSession={openRolePicker}
        view={view}
        onSelectView={setView}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{company.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {companySessions.length} sessions completed
                {lastScore !== null ? ` · last score ${lastScore}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={openRolePicker}
              className="flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Mic className="w-4 h-4" />
              Start practice
            </button>
          </div>

          {view === "companies" && (
            <>
              <div>
                <h2 className="text-sm font-medium text-gray-900 mb-1">Companies</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Pick a company to prepare for
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {COMPANIES.map((c) => {
                    const active = selectedCompany === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCompany(c.id)}
                        className={`rounded-xl border bg-white p-6 text-left transition-colors ${
                          active
                            ? "border-gray-900 ring-1 ring-gray-900"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="text-base font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {active ? "Selected" : "Click to select"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <ProgressBar
                  stage={company.stage}
                  hasSessions={companySessions.length > 0}
                  crushItBlocked={crushItBlocked}
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-medium text-gray-900">Recent sessions</h2>
                </div>
                <SessionList
                  sessions={recentCompanySessions}
                  emptyText={`No sessions yet for ${company.name}. Complete a practice to see history here.`}
                />
              </div>
            </>
          )}

          {view === "history" && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-900">All sessions</h2>
              </div>
              <SessionList sessions={storedSessions} emptyText="No sessions yet." />
            </div>
          )}

          {view === "weakspots" && (
            <WeakSpotsPanel
              sessions={storedSessions}
              selectedCompanyName={company.name}
              onPractice={openRolePicker}
            />
          )}

          {view === "settings" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Settings</h2>
              <p className="text-sm text-gray-400">
                Mic/camera permissions and auditor difficulty go here.
              </p>
            </div>
          )}
        </div>
      </main>

      {showRolePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900">Start practice</h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              Choose the role you&apos;re interviewing for at {company.name}. You&apos;ll get a
              random question — just like a real interview.
            </p>

            <label className="block text-sm font-medium text-gray-900 mb-2" htmlFor="role-select">
              Role
            </label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as RoleId)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 mb-6 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            >
              {ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRolePicker(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startPractice}
                className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Begin interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
