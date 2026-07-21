export interface Question {

    id: string;
    company: string;
    question: string;
    category: string;
    timeLimit: number;
}

export interface Feedback{
    score: string;
    feedback: string;
    transcript: string;
    metrics: {
        score_out_of_100: number;
    };
}

export interface Session {
    id: string;
    questionID: string;
    timestamp: string;
    feedback: Feedback;
    recordingUrl?: string;
}

// this provides all the interfaces we need: questions, feedback and session. 
// this is basically all the tyhpescript we will be using in the front end. 
// we use 'export interface' to define a type that other files can use. 

