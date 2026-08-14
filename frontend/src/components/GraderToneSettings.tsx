"use client";

import { useEffect, useState } from "react";
import {
  GRADER_TONE_OPTIONS,
  getGraderTone,
  setGraderTone,
  type GraderTone,
} from "../lib/graderTone";

export function GraderToneSettings() {
  const [tone, setTone] = useState<GraderTone>("harsh");

  useEffect(() => {
    setTone(getGraderTone());
  }, []);

  const onSelect = (next: GraderTone) => {
    setTone(next);
    setGraderTone(next);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-gray-900">Grader tone</h2>
        <p className="text-sm text-gray-500 mt-1">
          Controls how feedback is written. Scoring rigor stays the same either way.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GRADER_TONE_OPTIONS.map((option) => {
          const active = tone === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              aria-pressed={active}
              className={`rounded-lg border p-4 text-left transition-colors ${
                active
                  ? "border-gray-900 ring-1 ring-gray-900 bg-white"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-medium text-gray-900">
                {option.label}
                {option.id === "harsh" ? (
                  <span className="ml-2 text-xs font-normal text-gray-400">Default</span>
                ) : null}
              </p>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
