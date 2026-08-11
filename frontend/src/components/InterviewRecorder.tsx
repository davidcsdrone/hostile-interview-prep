import { useEffect } from "react";
import Link from "next/link";
import { Question } from "../types";
import { useVideoRecorder } from "../hooks/useVideoRecorder";

interface Props {
  question: Question;
  onSubmit: (blob: Blob) => void;
  onTryDifferent: () => void;
}

export function InterviewRecorder({ question, onSubmit, onTryDifferent }: Props) {
  const {
    isRecording,
    timeRemaining,
    videoRef,
    recordedBlob,
    startRecording,
    stopRecording,
    stopWebcam,
    initializeWebcam,
  } = useVideoRecorder();

  useEffect(() => {
    initializeWebcam();
  }, []);

  const handleSubmit = () => {
    if (!recordedBlob) return;
    stopWebcam();
    onSubmit(recordedBlob);
  };

  const handleTryDifferent = () => {
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
          <p className="text-sm text-gray-400 mt-3">{timeRemaining}s remaining</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video bg-gray-900 object-cover"
          />
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
