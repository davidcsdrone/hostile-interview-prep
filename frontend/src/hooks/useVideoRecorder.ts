// This will encapsulate all the video recording logic such as starting up the user's webcam, their recording, and stopping the video. 
// This seperates the "how to record the video" with that of "what do i display on the screen"

// 1. If webcam permission is off, indicate the browser to start the webcame (get permission from user). If not, then 
// we are ready to go.

// 2. We then begin the recording. 

// 3. Then the recording stops if the user chooses to stop it or if end of 90 to 120 second mark. I think if user is still talking after the
// 90 second mark, it shold still continue to record. It should only stop while interrputing them if they relaly talk alot like beyond 120 
// seconds.

// 4. We then return the recorded blob. I think we need a way to store this. 

// this will encapsulate all video recording logic. 

/// a hook is a reusable piece of React logic. It manages state (recording status, time remaining, etc)

// it provides functions to start/stop recording

//components use this hook instead of writing record code themselves

import { useState, useRef, useEffect} from 'react';

export function useVideoRecorder(){
    const [isRecording, setIsRecording] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(120);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null> (null);
    const mediaRecorderRef = useRef<MediaRecorder | null> (null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null> (null);

    //this will initialize the webcam
    const initializeWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {width: {ideal: 1280}, height: {ideal: 720}}, 
                audio: true
            });
            streamRef.current=stream;
            
            if (videoRef.current){ 
                videoRef.current.srcObject = stream;
            }
            

    }
    catch (error) {
        console.error("Error accessing webcame:", error);
    }

};

// this creates a mediaRecorder from the stream
const startRecording = () => {
    if (!streamRef.current) return;
    const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8, opus'
    });

    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size>0) {
            chunks.push(event.data);

        }
    };
    //when the recordering stops, we create a blob.
    mediaRecorder.onstop= () => {
        const blob = new Blob(chunks, { type: 'video/webm'});
        setRecordedBlob(blob);

    };
    mediaRecorder.start()
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
};

    // function to stop the recording.
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false);



        }
    };

    // Step 2e: The Math Engine (Only counts down)
  useEffect(() => {
    if (!isRecording) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRecording]);

  // Step 2f: The Camera Shutdown Engine (Watches the math)
  useEffect(() => {
    if (timeRemaining <= 0 && isRecording) {
      stopRecording();
    }
  }, [timeRemaining, isRecording]);

    return {
        isRecording,
        timeRemaining,
        videoRef,
        recordedBlob,
        startRecording,
        stopRecording,
        initializeWebcam
    };
}
        
    
    
    
    
    
    
    
    
    
    
     
