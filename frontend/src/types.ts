export interface Question {
    id: string; // Added ID because the page loops through question.id
    company: string;
    question: string;
    timeLimit: number;
}

export interface Feedback {
    logical_score: number;
    missed_points: string[];
    hostile_critique: string;
    next_step_action: string;
    transcript: string;
}

// Add this missing interface structure
export interface Session {
    id: string;
    questionId: string;
    timestamp: string;
    feedback: Feedback;
}