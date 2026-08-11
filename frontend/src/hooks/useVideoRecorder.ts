import { useState, useRef, useEffect, useCallback } from "react";

export function useVideoRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  /**
   * True while this hook instance is mounted.
   * Prevents a late getUserMedia() result from leaving the camera on
   * after the user already left the interview screen.
   */
  const aliveRef = useRef(true);

  const stopWebcam = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore recorder stop races during unmount
      }
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const initializeWebcam = useCallback(async () => {
    try {
      // Avoid leaving an old stream on if this is called again
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      // User left (or remounted) while the permission/stream request was in flight.
      // Stop immediately — otherwise the camera stays on with nothing to clean it up.
      if (!aliveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      // Permission denied / device busy — only log if we still care
      if (aliveRef.current) {
        console.error("Error accessing webcam:", error);
      }
    }
  }, []);

  const startRecording = () => {
    if (!streamRef.current) return;

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp8,opus",
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

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (timeRemaining <= 0 && isRecording) {
      stopRecording();
    }
  }, [timeRemaining, isRecording]);

  // Mark alive on mount; kill camera/mic on unmount (Back, submit → loading, leave page)
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      stopWebcam();
    };
  }, [stopWebcam]);

  return {
    isRecording,
    timeRemaining,
    videoRef,
    recordedBlob,
    startRecording,
    stopRecording,
    stopWebcam,
    initializeWebcam,
  };
}
