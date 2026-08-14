"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Question } from "../types";
import { useVideoRecorder } from "../hooks/useVideoRecorder";
import { getRecordingDuration } from "../lib/recordingDuration";

interface Props {
  question: Question;
  onSubmit: (blob: Blob) => void;
  onTryDifferent: () => void;
}

export function InterviewRecorder({ question, onSubmit, onTryDifferent }: Props) {
  const [maxSeconds, setMaxSeconds] = useState(120);

  useEffect(() => {
    setMaxSeconds(getRecordingDuration());
  }, []);

  const {
    isRecording,
    timeRemaining,
    videoRef,
    recordedBlob,
    mediaError,
    startRecording,
    stopRecording,
    stopWebcam,
    initializeWebcam,
  } = useVideoRecorder(maxSeconds);

  /** Hide preview the instant Submit is pressed (don't wait for React unmount) */
  const [previewOff, setPreviewOff] = useState(false);

  useEffect(() => {
    void initializeWebcam();
  }, [initializeWebcam]);

  const handleSubmit = () => {
    if (!recordedBlob) return;
    const blob = recordedBlob;

    // Stop hardware BEFORE hiding the <video> or unmounting into the loading screen.
    // Hiding the preview alone does not turn the camera off.
    stopWebcam();
    setPreviewOff(true);
    onSubmit(blob);
  };

  const handleTryDifferent = () => {
    // Stop current stream before remount (new question key) opens another one
    stopWebcam();
    onTryDifferent();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-8 py-10 space-y-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to dashboard
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500 mb-2">
            The interviewer at {question.company} asks...
          </p>
          <h2 className="text-xl font-semibold text-gray-900">{question.question}</h2>
          <p className="text-sm text-gray-400 mt-3">
            {isRecording
              ? `${timeRemaining}s remaining`
              : `${maxSeconds}s recording limit`}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {previewOff ? (
            <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
              <p className="text-sm text-gray-400">Camera off</p>
            </div>
          ) : mediaError ? (
            <div className="w-full aspect-video bg-gray-900 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-gray-300 leading-relaxed">{mediaError}</p>
              <button
                type="button"
                onClick={() => {
                  void initializeWebcam();
                }}
                className="rounded-lg bg-white text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Enable camera
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-video bg-gray-900 object-cover"
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 items-center">
          <button
            type="button"
            onClick={handleTryDifferent}
            className="justify-self-start rounded-lg border border-gray-200 bg-white text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Let&apos;s try a different question
          </button>

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className="justify-self-center rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            {isRecording ? "Stop" : "Start recording"}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!recordedBlob}
            className="justify-self-end rounded-lg border border-gray-200 bg-white text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit answer
          </button>
        </div>
      </div>
    </div>
  );
}
