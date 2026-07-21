import { Feedback } from '../types';

interface Props {
    feedback: Feedback;
}

export function FeedbackDisplay({ feedback }: Props) {
    return (
        <div className="feedback-container">
            <h2>Auditor Evaluation</h2>
            
            <div className="score-number">
                {feedback.logical_score}/100
            </div>

            <div className="feedback-text">
                <h3>Hostile Critique</h3>
                <p>{feedback.hostile_critique}</p>
            </div>

            <div className="missed-points">
                <h3>Flaws Detected</h3>
                <ul>
                    {feedback.missed_points?.map((point, index) => (
                        <li key={index}>{point}</li>
                    ))}
                </ul>
            </div>

            <div className="action-step">
                <h3>Next Step</h3>
                <p>{feedback.next_step_action}</p>
            </div>
            {/* The Transcript Dropdown */}
            <div className="transcript-section mt-8 border-t border-gray-800 pt-6">
                <details className="group">
                    <summary className="cursor-pointer text-gray-400 font-bold hover:text-white transition-colors flex justify-between items-center outline-none">
                        VIEW RAW TRANSCRIPT
                        <span className="text-xl group-open:rotate-180 transition-transform">↓</span>
                    </summary>
                    <div className="mt-4 p-5 bg-gray-900 rounded-lg text-gray-300 italic border border-gray-700 leading-relaxed">
                        "{feedback.transcript}"
                    </div>
                </details>
            </div>
        </div>
    );
}