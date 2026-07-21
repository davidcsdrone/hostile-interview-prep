import { Question } from '../types';

// props refers to what the component receives. we will recevie a question and on select fn. 
interface Props {
    question: Question;
    onSelect: () => void;

}

// the component. 
export function QuestionDisplay ({question, onSelect} : Props) {
    return (
        <div className="question-container">
            <h2>{question.company}</h2>
            <p className="question-text"> {question.question}</p>
            < p className = "time-limit"> Time Limit: {question.timeLimit} seconds</p>
            <button onClick = {onSelect} className = "start-Button">
                Start Recording
            </button>
        </div>

    );

}