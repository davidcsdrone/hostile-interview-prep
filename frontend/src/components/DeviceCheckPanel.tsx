"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DeviceStatus =
  | "idle"
  | "checking"
  | "allowed"
  | "blocked"
  | "unavailable"
  | "error";

type PermissionHint = "granted" | "denied" | "prompt" | "unknown";

function stopStreamTracks(stream: MediaStream | null | undefined) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // ignore
    }
  });
}

function statusLabel(status: DeviceStatus): string {
  switch (status) {
    case "idle":
      return "Not tested";
    case "checking":
      return "Checking…";
    case "allowed":
      return "Allowed";
    case "blocked":
      return "Blocked";
    case "unavailable":
      return "No device found";
    case "error":
      return "Error";
  }
}

function statusClass(status: DeviceStatus): string {
  switch (status) {
    case "allowed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "blocked":
      return "border-red-200 bg-red-50 text-red-800";
    case "checking":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "unavailable":
    case "error":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

function classifyMediaError(err: unknown): DeviceStatus {
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name?: string }).name)
      : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "blocked";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "unavailable";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    // Device exists but is busy / in use by another app
    return "error";
  }
  return "error";
}

function errorHelp(err: unknown): string {
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name?: string }).name)
      : "";
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your camera or mic may be in use by another app (Zoom, FaceTime, etc.). Close those and try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera or microphone was found. Plug one in (or check System Settings → Privacy) and retry.";
  }
  return "Something went wrong while opening your devices. Retry after checking browser and system permissions.";
}

async function readPermission(name: "camera" | "microphone"): Promise<PermissionHint> {
  try {
    if (!navigator.permissions?.query) return "unknown";
    // TypeScript's PermissionName union is incomplete in some envs
    const result = await navigator.permissions.query({
      name: name as PermissionName,
    });
    if (result.state === "granted") return "granted";
    if (result.state === "denied") return "denied";
    if (result.state === "prompt") return "prompt";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function permissionToStatus(hint: PermissionHint): DeviceStatus {
  if (hint === "granted") return "allowed";
  if (hint === "denied") return "blocked";
  return "idle";
}

export function DeviceCheckPanel() {
  const [cameraStatus, setCameraStatus] = useState<DeviceStatus>("idle");
  const [micStatus, setMicStatus] = useState<DeviceStatus>("idle");
  const [testing, setTesting] = useState(false);
  const [helpText, setHelpText] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  // Attach stream after the <video> exists (it mounts when testing becomes true)
  useEffect(() => {
    if (!testing) return;
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [testing, cameraStatus]);

  const stopTest = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }

    stopStreamTracks(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      try {
        videoRef.current.load();
      } catch {
        // ignore
      }
    }

    setMicLevel(0);
    setTesting(false);
  }, []);

  // Read browser permission hints without turning devices on
  useEffect(() => {
    aliveRef.current = true;
    let cancelled = false;

    (async () => {
      const [cam, mic] = await Promise.all([
        readPermission("camera"),
        readPermission("microphone"),
      ]);
      if (cancelled || !aliveRef.current) return;
      setCameraStatus(permissionToStatus(cam));
      setMicStatus(permissionToStatus(mic));
      if (cam === "denied" || mic === "denied") {
        setHelpText(
          "Access is blocked in this browser. Use the steps below, then click Test devices again."
        );
      }
    })();

    return () => {
      cancelled = true;
      aliveRef.current = false;
      stopTest();
    };
  }, [stopTest]);

  const startMicMeter = (stream: MediaStream) => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!aliveRef.current || !audioCtxRef.current) return;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) sum += data[i];
      const avg = sum / data.length / 255;
      setMicLevel(avg);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const runTest = async () => {
    stopTest();
    setTesting(true);
    setHelpText(null);
    setCameraStatus("checking");
    setMicStatus("checking");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unavailable");
      setMicStatus("unavailable");
      setHelpText(
        "This browser cannot access media devices. Try Chrome or Edge on desktop."
      );
      setTesting(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      if (!aliveRef.current) {
        stopStreamTracks(stream);
        return;
      }

      streamRef.current = stream;
      const hasVideo = stream.getVideoTracks().some((t) => t.readyState === "live");
      const hasAudio = stream.getAudioTracks().some((t) => t.readyState === "live");

      setCameraStatus(hasVideo ? "allowed" : "unavailable");
      setMicStatus(hasAudio ? "allowed" : "unavailable");

      if (hasAudio) {
        startMicMeter(stream);
      }

      setHelpText(
        hasVideo && hasAudio
          ? "Devices look good. Click Stop test when you’re done (this turns the camera/mic off)."
          : "Partially working — see status above. Stop the test when finished."
      );
    } catch (err) {
      // Diagnose camera vs mic separately when the combined request fails
      let cam: DeviceStatus = "error";
      let mic: DeviceStatus = "error";
      let lastErr: unknown = err;

      try {
        const videoOnly = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        stopStreamTracks(videoOnly);
        cam = "allowed";
      } catch (videoErr) {
        cam = classifyMediaError(videoErr);
        lastErr = videoErr;
      }

      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        stopStreamTracks(audioOnly);
        mic = "allowed";
      } catch (audioErr) {
        mic = classifyMediaError(audioErr);
        lastErr = audioErr;
      }

      if (!aliveRef.current) return;

      setCameraStatus(cam);
      setMicStatus(mic);
      setTesting(false);

      if (cam === "blocked" || mic === "blocked") {
        setHelpText(
          "Permission was denied. Follow the fix steps below, then test again."
        );
      } else {
        setHelpText(errorHelp(lastErr));
      }
    }
  };

  const showFixSteps = cameraStatus === "blocked" || micStatus === "blocked";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="text-sm font-medium text-gray-900">Mic / camera check</h2>
          <p className="text-sm text-gray-500 mt-1">
            Confirm your browser can use your camera and microphone before practice.
            Testing turns devices on briefly — always stop the test when finished.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Camera
            </p>
            <p
              className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusClass(
                cameraStatus
              )}`}
            >
              {statusLabel(cameraStatus)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Microphone
            </p>
            <p
              className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusClass(
                micStatus
              )}`}
            >
              {statusLabel(micStatus)}
            </p>
            {testing && micStatus === "allowed" && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Mic level</p>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gray-900 transition-[width] duration-75"
                    style={{ width: `${Math.min(100, Math.round(micLevel * 140))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Speak to see the bar move.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-950 overflow-hidden">
          {testing ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full aspect-video object-cover ${
                cameraStatus === "allowed" ? "" : "opacity-40"
              }`}
            />
          ) : (
            <div className="w-full aspect-video flex items-center justify-center">
              <p className="text-sm text-gray-500">
                Preview appears while a test is running
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void runTest()}
            disabled={cameraStatus === "checking" || micStatus === "checking"}
            className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testing ? "Retest devices" : "Test devices"}
          </button>
          <button
            type="button"
            onClick={stopTest}
            disabled={!testing}
            className="rounded-lg border border-gray-200 bg-white text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Stop test
          </button>
        </div>

        {helpText && <p className="text-sm text-gray-600 leading-relaxed">{helpText}</p>}
      </div>

      {showFixSteps && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-900">How to fix blocked permissions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 leading-relaxed">
            <li>
              In your browser address bar, open the site permissions / lock icon for this
              page.
            </li>
            <li>
              Set <span className="font-medium text-gray-900">Camera</span> and{" "}
              <span className="font-medium text-gray-900">Microphone</span> to{" "}
              <span className="font-medium text-gray-900">Allow</span>.
            </li>
            <li>Reload this page, then click <span className="font-medium text-gray-900">Test devices</span> again.</li>
          </ol>
          <div className="pt-2 space-y-2 text-sm text-gray-600 leading-relaxed">
            <p className="font-medium text-gray-900">If it still fails on Mac:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                System Settings → Privacy &amp; Security → Camera → enable your browser
              </li>
              <li>
                System Settings → Privacy &amp; Security → Microphone → enable your browser
              </li>
              <li>Quit other apps that might be using the camera (Zoom, FaceTime, Photos)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
