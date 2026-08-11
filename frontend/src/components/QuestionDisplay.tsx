import { Question } from "../types";

interface Props {
  question: Question;
  onSelect: () => void;
}

export function QuestionDisplay({ question, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 hover:border-gray-300 transition-colors">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
        {question.company}
      </p>
      <p className="text-sm text-gray-900 mb-1">{question.question}</p>
      <p className="text-xs text-gray-400 mb-4">{question.timeLimit} seconds</p>
      <button
        type="button"
        onClick={onSelect}
        className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        Start recording
      </button>
    </div>
  );
}
