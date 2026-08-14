import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";

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

function detachVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  const src = video.srcObject;
  if (src instanceof MediaStream) {
    stopStreamTracks(src);
  }
  video.pause();
  video.srcObject = null;
  try {
    video.load();
  } catch {
    // ignore
  }
}

/**
 * @param maxSeconds Full allotment for each take (from Settings). Defaults to 120.
 */
export function useVideoRecorder(maxSeconds: number = 120) {
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(maxSeconds);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const maxSecondsRef = useRef(maxSeconds);
  maxSecondsRef.current = maxSeconds;

  /**
   * True while this hook instance is mounted.
   * Prevents a late getUserMedia() result from leaving the camera on
   * after the user already left the interview screen.
   */
  const aliveRef = useRef(true);

  /**
   * Bumped on every init and every stop. Late getUserMedia results with a
   * stale id are stopped immediately (Strict Mode double-mount safe).
   */
  const mediaEpochRef = useRef(0);

  /** Release camera/mic immediately: tracks first, then recorder/video element */
  const stopWebcam = useCallback(() => {
    // Invalidate any in-flight getUserMedia so it cannot re-attach after stop
    mediaEpochRef.current += 1;

    const stream = streamRef.current;
    streamRef.current = null;

    // 1) Stop hardware tracks first (this is what turns off the camera indicator)
    stopStreamTracks(stream);

    // 2) Also kill whatever is still attached to the <video> (can diverge from streamRef)
    detachVideo(videoRef.current);

    // 3) Tear down recorder after tracks are dead
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore recorder stop races during unmount
      }
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const initializeWebcam = useCallback(async () => {
    const epoch = ++mediaEpochRef.current;
    setMediaError(null);

    // Drop any current stream before opening a new one
    if (streamRef.current) {
      stopStreamTracks(streamRef.current);
      streamRef.current = null;
    }
    detachVideo(videoRef.current);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError("Camera/mic are not available in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      // Stopped, superseded by a newer init, or unmounted while waiting
      if (!aliveRef.current || epoch !== mediaEpochRef.current) {
        stopStreamTracks(stream);
        return;
      }

      // Never overwrite a live streamRef without stopping it
      if (streamRef.current && streamRef.current !== stream) {
        stopStreamTracks(streamRef.current);
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      if (!aliveRef.current || epoch !== mediaEpochRef.current) return;

      const name =
        error && typeof error === "object" && "name" in error
          ? String((error as { name?: string }).name)
          : "";

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMediaError(
          "Camera/mic permission was blocked. Allow access in the browser address bar, then click Enable camera."
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setMediaError("No camera or microphone was found. Plug one in and try again.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setMediaError(
          "Camera/mic is busy in another app or tab. Close it, then click Enable camera."
        );
      } else {
        setMediaError("Could not start camera/mic. Click Enable camera to try again.");
      }
      console.error("Error accessing webcam:", error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    // Ready for another full take
    setTimeRemaining(maxSecondsRef.current);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      return;
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp8,opus",
      // Keep uploads smaller for longer answers (Whisper has a 25MB limit on the raw file path;
      // backend also extracts audio, but leaner video still helps upload time).
      videoBitsPerSecond: 600_000,
      audioBitsPerSecond: 64_000,
    });

    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (!aliveRef.current) return;
      const blob = new Blob(chunks, { type: "video/webm" });
      setRecordedBlob(blob);
    };

    // Always start a fresh full allotment (fixes leftover seconds after early stop)
    setTimeRemaining(maxSecondsRef.current);
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  }, []);

  // Keep idle display in sync if Settings length changes before/after a take
  useEffect(() => {
    if (!isRecording) {
      setTimeRemaining(maxSeconds);
    }
  }, [maxSeconds, isRecording]);

  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (timeRemaining <= 0 && isRecording) {
      stopRecording();
    }
  }, [timeRemaining, isRecording, stopRecording]);

  // useLayoutEffect: kill media before the browser paints the next screen
  useLayoutEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      stopWebcam();
    };
  }, [stopWebcam]);

  return {
    isRecording,
    timeRemaining,
    maxSeconds,
    mediaError,
    videoRef,
    recordedBlob,
    startRecording,
    stopRecording,
    stopWebcam,
    initializeWebcam,
  };
}
