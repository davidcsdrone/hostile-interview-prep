"use client";




import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Question, Feedback, Session } from '../types';
import { QuestionDisplay } from '../components/QuestionDisplay';
import { InterviewRecorder } from '../components/InterviewRecorder';
import { FeedbackDisplay } from '../components/FeedbackDisplay';
// Note: If you haven't built SessionHistory.tsx yet, this next line will error. 
// You can comment it out with // if needed.
import { SessionHistory } from '../components/SessionHistory';

export function InterviewPage() {
    const searchParams = useSearchParams();
    const companyFilter = searchParams.get('company');

    // 1. State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 2. Fetch initial questions
    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const response = await fetch('http://localhost:8000/questions');
            const data = await response.json();
            setQuestions(data);
        } catch (error) {
            console.error("Failed to fetch questions", error);
        }
    };

    // 3. Handle Video Submission
   const handleSubmitRecording = async (blob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'interview.webm');

      const response = await fetch('http://localhost:8000/process-video', {
        method: 'POST',
        body: formData
      });

      // ADD THIS BLOCK: Stop if the backend throws a 500 error
      if (!response.ok) {
        alert("The server crashed while processing the video. Check your Python terminal for the exact error.");
        setIsLoading(false);
        return; 
      }

      const data = await response.json();
      setFeedback(data);

      if (selectedQuestion) {
        setSessions([...sessions, {
          id: Date.now().toString(),
          questionId: selectedQuestion.id,
          timestamp: new Date().toISOString(),
          feedback: data
        }]);
      }
    } catch (error) {
      console.error('Error processing video:', error);
      alert("Failed to communicate with the backend.");
    } finally {
      setIsLoading(false);
    }
  };

    // 4. Try Another Question
    const handleTryAnother = () => {
        setSelectedQuestion(null);
        setFeedback(null);
    };

    // 5. Conditional Rendering
    if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-24">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-600 border-b-4 border-transparent mb-6"></div>
        <h2 className="text-3xl font-bold mb-2">Auditor is analyzing your logic...</h2>
        <p className="text-gray-400">Extracting audio, transcribing, and running models.</p>
      </div>
    );
  }

    if (feedback) {
        return (
            <div className="page-container flex flex-col items-center p-8">
                <FeedbackDisplay feedback={feedback} />
                <button onClick={handleTryAnother} className="btn-try-another mt-8 bg-blue-600 text-white px-6 py-2 rounded">
                    Try Another Question
                </button>
                <SessionHistory sessions={sessions} />
            </div>
        );
    }

    if (selectedQuestion) {
        return (
            <InterviewRecorder 
                question={selectedQuestion}
                onSubmit={handleSubmitRecording}
            />
        );
    }

    const filteredQuestions = companyFilter
        ? questions.filter(
            (q) => q.company.toLowerCase() === companyFilter.toLowerCase()
          )
        : questions;

    const companyLabel = companyFilter
        ? companyFilter.charAt(0).toUpperCase() + companyFilter.slice(1)
        : null;

    return (
        <div className="page-container p-8 text-white min-h-screen bg-black">
            <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
                <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
                    ← Back to dashboard
                </Link>
                {companyLabel && (
                    <span className="text-sm text-gray-400">Practicing for {companyLabel}</span>
                )}
            </div>
            <h1 className="text-4xl font-bold text-center mb-12">Hostile Logic-Trainer</h1>
            {filteredQuestions.length === 0 ? (
                <p className="text-center text-gray-400">
                    {companyFilter
                        ? `No questions found for ${companyLabel}. Is the backend running?`
                        : 'No questions loaded. Is the backend running?'}
                </p>
            ) : (
                <div className="questions-grid grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {filteredQuestions.map((question) => (
                        <QuestionDisplay
                            key={question.id}
                            question={question}
                            onSelect={() => setSelectedQuestion(question)}
                        />
                    ))}
                </div>
            )}
            <SessionHistory sessions={sessions} />
        </div>
    );
}