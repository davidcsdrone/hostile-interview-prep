import { Feedback, WEAKNESS_TAGS } from "../types";

interface Props {
  feedback: Feedback;
}

function tagLabel(id: string): string {
  return WEAKNESS_TAGS.find((t) => t.id === id)?.label ?? id;
}

export function FeedbackDisplay({ feedback }: Props) {
  const tags = feedback.weakness_tags ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
          Score
        </p>
        <p className="text-3xl font-semibold text-gray-900">
          {feedback.logical_score}
          <span className="text-lg text-gray-400 font-normal">/100</span>
        </p>
      </div>

      {tags.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Weakness tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                {tagLabel(tag)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Hostile critique</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{feedback.hostile_critique}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Flaws detected</h3>
        <ul className="space-y-2">
          {feedback.missed_points?.map((point, index) => (
            <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Next step</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{feedback.next_step_action}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Raw transcript</h3>
        <p className="text-sm text-gray-500 leading-relaxed italic">
          {feedback.transcript
            ? `\u201C${feedback.transcript}\u201D`
            : "No transcript saved for this session."}
        </p>
      </div>
    </div>
  );
}
