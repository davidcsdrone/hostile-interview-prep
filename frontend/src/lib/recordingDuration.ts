/** Max answer recording length, persisted in localStorage for v1 */

export type RecordingDuration = 90 | 120 | 180;

export const RECORDING_DURATION_KEY = "hlt-recording-duration";

export const RECORDING_DURATION_OPTIONS: {
  id: RecordingDuration;
  label: string;
  description: string;
}[] = [
  {
    id: 90,
    label: "90 seconds",
    description: "Short answers. Good for tight, focused practice.",
  },
  {
    id: 120,
    label: "120 seconds",
    description: "Default. Matches a typical behavioral answer window.",
  },
  {
    id: 180,
    label: "180 seconds",
    description: "Longer answers when you need more room to walk through detail.",
  },
];

export function isRecordingDuration(value: unknown): value is RecordingDuration {
  return value === 90 || value === 120 || value === 180;
}

export function getRecordingDuration(): RecordingDuration {
  if (typeof window === "undefined") return 120;
  try {
    const saved = window.localStorage.getItem(RECORDING_DURATION_KEY);
    const parsed = saved == null ? NaN : Number(saved);
    if (isRecordingDuration(parsed)) return parsed;
  } catch {
    // ignore storage errors
  }
  return 120;
}

export function setRecordingDuration(duration: RecordingDuration): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECORDING_DURATION_KEY, String(duration));
  } catch {
    // ignore storage errors
  }
}
