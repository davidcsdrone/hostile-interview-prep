import { Session } from '../types';

interface Props {
    sessions: Session[];
}

export function SessionHistory({ sessions }: Props) {
    return (
        <div className="history-container">
            <h3 className="text-xl font-bold mb-4">Past Sessions ({sessions.length})</h3>
            <div className="space-y-2">
                {sessions.map(session => (
                    <div key={session.id} className="p-3 bg-gray-900 rounded flex justify-between">
                        <span>Attempted Problem</span>
                        <span className="text-green-400">{session.feedback.logical_score}/100</span>
                    </div>
                ))}
            </div>
        </div>
    );
}