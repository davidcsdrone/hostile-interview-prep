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
  // Force the element to drop any remaining media resources
  try {
    video.load();
  } catch {
    // ignore
  }
}

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

  /** Release camera/mic immediately — tracks first, then recorder/video element */
  const stopWebcam = useCallback(() => {
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
    try {
      if (streamRef.current) {
        stopStreamTracks(streamRef.current);
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      // User left (or remounted) while the permission/stream request was in flight.
      if (!aliveRef.current) {
        stopStreamTracks(stream);
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
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
    videoRef,
    recordedBlob,
    startRecording,
    stopRecording,
    stopWebcam,
    initializeWebcam,
  };
}
