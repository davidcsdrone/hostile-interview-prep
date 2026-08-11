"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Question, Session, normalizeWeaknessTags } from "../types";
import { InterviewRecorder } from "../components/InterviewRecorder";
import { saveSession } from "../lib/sessions";
import { canonicalizeCompany } from "../lib/companies";

function pickRandomQuestion(pool: Question[], excludeId?: string): Question | null {
  const candidates = excludeId ? pool.filter((q) => q.id !== excludeId) : pool;
  const list = candidates.length > 0 ? candidates : pool;
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function InterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyFilter = searchParams.get("company");
  const roleFilter = searchParams.get("role");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const assignRandomQuestion = useCallback(
    (pool: Question[], excludeId?: string) => {
      const next = pickRandomQuestion(pool, excludeId);
      setSelectedQuestion(next);
    },
    []
  );

  useEffect(() => {
    const fetchQuestions = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (companyFilter) params.set("company", companyFilter);
        if (roleFilter) params.set("role", roleFilter);

        const response = await fetch(
          `http://localhost:8000/questions/?${params.toString()}`
        );
        if (!response.ok) throw new Error("Failed to load questions");

        const data: Question[] = await response.json();
        setQuestions(data);
        assignRandomQuestion(data);
      } catch (err) {
        console.error("Failed to fetch questions", err);
        setError("Could not load questions. Is the backend running?");
      } finally {
        setIsFetching(false);
      }
    };

    fetchQuestions();
  }, [companyFilter, roleFilter, assignRandomQuestion]);

  const handleSubmitRecording = async (blob: Blob) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", blob, "interview.webm");

      const response = await fetch("http://localhost:8000/process-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        alert(
          "The server crashed while processing the video. Check your Python terminal for the exact error."
        );
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const feedback = {
        ...data,
        weakness_tags: normalizeWeaknessTags(data.weakness_tags),
      };

      if (selectedQuestion) {
        const newSession: Session = {
          id: Date.now().toString(),
          questionId: selectedQuestion.id,
          question: selectedQuestion.question,
          // Prefer question company; fall back to URL slug (amazon → Amazon)
          company: canonicalizeCompany(
            selectedQuestion.company || companyFilter
          ),
          timestamp: new Date().toISOString(),
          feedback,
        };
        saveSession(newSession);
        // Replace interview URL so browser Back goes to dashboard, not a new question
        router.replace(`/sessions/${newSession.id}`);
        return;
      }
    } catch (err) {
      console.error("Error processing video:", err);
      alert("Failed to communicate with the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAnother = () => {
    assignRandomQuestion(questions, selectedQuestion?.id);
  };

  const companyLabel = companyFilter
    ? companyFilter.charAt(0).toUpperCase() + companyFilter.slice(1)
    : null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-900 border-t-transparent mb-6" />
        <h2 className="text-xl font-semibold mb-1">Auditor is analyzing your logic...</h2>
        <p className="text-sm text-gray-500">
          Extracting audio, transcribing, and running models.
        </p>
      </div>
    );
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-sm text-gray-500">
        Loading your interview question...
      </div>
    );
  }

  if (error || !selectedQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-3xl mx-auto px-8 py-10 space-y-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Back to dashboard
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-600">
              {error ??
                `No questions found${companyLabel ? ` for ${companyLabel}` : ""}${
                  roleFilter ? ` (${roleFilter})` : ""
                }.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <InterviewRecorder
      key={selectedQuestion.id}
      question={selectedQuestion}
      onSubmit={handleSubmitRecording}
      onTryDifferent={handleTryAnother}
    />
  );
}
