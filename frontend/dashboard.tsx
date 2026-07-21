import React, { useState} from "react";
import { type LucideIcon } from "lucide-react";

interface NavItem {
  icon: LucideIcon;  // not a custom IconType
}

type IconType = (props: {className?: string}) => React.ReactElement;

export type StageID = "initial" | "getting_there" | "interview_ready" | "crush_it";

export interface CompanySummary {
    id: string;
    name: string;
    stage: StageID;
    lastScore: number;
    sessions: number;

}

 interface ProgressBarProps{
    stage: StageID;
}

interface Company {
    id: string;
    name: string;
    stage: StageID;
    lastScore: number;
    sessions: number;
}

interface Session {
    id: number;
    questionId: string;
    timestamp: string;
    feedback: {
        logical_score: number;
        missed_points: string[];
        hostile_critique: string;
        next_step_action: string;
        transcript: string;


    };
}

interface SessionDisplay {
    id: string;
    company: string;
    question: string;
    score: number;
    date: string;
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
    icon: IconType;
}



const COMPANIES: Company[] = [
  { id: "amazon", name: "Amazon", stage: "getting_there", lastScore: 62, sessions: 8 },
  { id: "meta", name: "Meta", stage: "initial", lastScore: 41, sessions: 3 },
  { id: "google", name: "Google", stage: "interview_ready", lastScore: 85, sessions: 14 },
];

// const RECENT_SESSIONS: Session[] = [
//   { id: 1, question: "Tell me about a time you disagreed with a decision.", score: 62, date: "Jul 6" },
//   { id: 2, company: "Google", question: "How would you design a rate limiter?", score: 85, date: "Jul 5" },
//   { id: 3, company: "Meta", question: "Describe a time you moved fast and it backfired.", score: 41, date: "Jul 3" },
//   { id: 4, company: "Amazon", question: "Tell me about a time you had to dive deep.", score: 58, date: "Jul 1" },
// ];

const WEAK_SPOTS: string[] = [
  "Overuses buzzwords under pressure",
  "Doesn't quantify impact with numbers",
  "Rambles before reaching the point",
];

const STAGES: Record<StageID, StageInfo> = {
  initial: { label: "Initial Progress", color: "bg-red-500", pct: 20 },
  getting_there: { label: "Getting There", color: "bg-amber-500", pct: 50 },
  interview_ready: { label: "All But Interview Ready", color: "bg-blue-500", pct: 80 },
  crush_it: { label: "You Will Crush It", color: "bg-emerald-500", pct: 100 },
};




interface SidebarButtonProps {
    active: boolean;
    onClick: () => void;
    justify?: "start" | "between";
    children: React.ReactNode;
}

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


interface SidebarProps {
  selectedCompany: string;
  onSelectCompany: (id: string) => void;
  view: NavView;
  onSelectView: (view: NavView) => void;
}

function Sidebar({ selectedCompany, onSelectCompany, view, onSelectView }: SidebarProps) {
    const navItems: NavItem[] = [
        { id: "companies", label: "Companies", icon: Building2},    
        { id: "history", label: "History", icon: History },
        { id: "weakspots", label: "Weak Spots", icon: Target },
        { id: "settings", label: "Settings", icon: Settings },
    ];
    return (
 <aside className="w-64 shrink-0 border-r border-gray-200 bg-white h-full flex flex-col">
      <div className="p-4">
        <button type="button" className="w-full flex items-center gap-2 rounded-lg bg-gray-900 text-white px-3 py-2 text-sm font-medium hover:bg-gray-800 transition-colors">
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

function ProgressBar({ stage }: ProgressBarProps) {
  const s = STAGES[stage];
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{s.label}</span>
        <span className="text-sm text-gray-500">{s.pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedCompany, setSelectedCompany] = useState<string>("amazon");
  const [view, setView] = useState<NavView>("companies");

  const company = COMPANIES.find((c) => c.id === selectedCompany);

  if (COMPANIES.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-500 text-sm">
        No companies yet. Add one to get started.
      </div>
    );
  }
  if (!company) return null;

  const companySessions = RECENT_SESSIONS.filter((s) => s.company === company.name);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar
        selectedCompany={selectedCompany}
        onSelectCompany={(id) => {
          setSelectedCompany(id);
          setView("companies");
        }}
        view={view}
        onSelectView={setView}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{company.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {company.sessions} sessions completed · last score {company.lastScore}
              </p>
            </div>
            <button type="button" className="flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors">
              <Mic className="w-4 h-4" />
              Start practice
            </button>
          </div>

          {view === "companies" && (
            <>
              {/* Progress card */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <ProgressBar stage={company.stage} />
              </div>

              {/* Recent sessions (this company only) */}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-medium text-gray-900">Recent sessions</h2>
                </div>
                <SessionList sessions={companySessions} emptyText={`No sessions yet for ${company.name}.`} />
              </div>
            </>
          )}

          {view === "history" && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-900">All sessions</h2>
              </div>
              <SessionList sessions={RECENT_SESSIONS} emptyText="No sessions yet." />
            </div>
          )}

          {view === "weakspots" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Recurring weak spots</h2>
              <ul className="space-y-2">
                {WEAK_SPOTS.map((w) => (
                  <li key={w} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view === "settings" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Settings</h2>
              <p className="text-sm text-gray-400">Mic/camera permissions and auditor difficulty go here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}



interface SessionListProps {
  sessions: Session[];
  emptyText: string;
}

function SessionList({ sessions, emptyText }: SessionListProps) {
  if (sessions.length === 0) {
    return <p className="px-6 py-6 text-sm text-gray-400">{emptyText}</p>;
  }
  return (
    <div>
      {sessions.map((s) => (
        <button
          key={s.id}
          type="button"
          className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="min-w-0">
            <p className="text-sm text-gray-900 truncate">{s.question}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {s.company} · {s.date}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className="text-sm font-medium text-gray-700">{s.score}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </button>
      ))}
    </div>
  );
}


