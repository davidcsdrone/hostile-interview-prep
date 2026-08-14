"use client";

import { useEffect, useState } from "react";
import {
  RECORDING_DURATION_OPTIONS,
  getRecordingDuration,
  setRecordingDuration,
  type RecordingDuration,
} from "../lib/recordingDuration";

export function RecordingDurationSettings() {
  const [duration, setDuration] = useState<RecordingDuration>(120);

  useEffect(() => {
    setDuration(getRecordingDuration());
  }, []);

  const onSelect = (next: RecordingDuration) => {
    setDuration(next);
    setRecordingDuration(next);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-sm font-medium text-gray-900">Recording length</h2>
        <p className="text-sm text-gray-500 mt-1">
          How long you get to answer once recording starts. You can still stop early.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {RECORDING_DURATION_OPTIONS.map((option) => {
          const active = duration === option.id;
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
                {option.id === 120 ? (
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
