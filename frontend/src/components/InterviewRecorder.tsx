import { useEffect } from 'react';
import { Question, Feedback } from '../types';
import { useVideoRecorder } from '../hooks/useVideoRecorder';

interface Props {
question: Question;
onSubmit: (blob: Blob) => void;
}
export function InterviewRecorder({ question, onSubmit }: Props) {
    const {
        isRecording,
        timeRemaining,
        videoRef,
        recordedBlob,
        startRecording,
        stopRecording,
        initializeWebcam
    } = useVideoRecorder();
    // Step 3b: Initialize webcam when component mounts
    useEffect(() => {
    initializeWebcam();
    
    }, []);
        // Step 3c: Handle submit
            const handleSubmit = () => {
        if (recordedBlob) {
            onSubmit(recordedBlob);
        }
    };

// Step 3d: Render
return (
    <div className="recorder-container">
    <div className="question-display">
    <h3>{question.question}</h3>
    </div>
    <video ref={videoRef} autoPlay  playsInline className="video-preview" />
    <div className="timer">{timeRemaining}s</div>
    <div className="controls">
    <button onClick={startRecording} disabled={isRecording}  className="btn-start" >
         Start Recording
    </button>
        <button onClick={stopRecording} disabled={!isRecording}  className="btn-stop">
            Stop Recording
        </button>

        <button onClick={handleSubmit} disabled={!recordedBlob} className="btn-submit">
        Submit Answer
        </button>

    </div>
    </div>
    );
}