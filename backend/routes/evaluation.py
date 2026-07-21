import os
import json
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import OpenAI
from dotenv import load_dotenv

# 1. Load keys and initialize router
load_dotenv()
router = APIRouter()
client = OpenAI()

# 2. This MUST be named /process-video so the frontend can find it
@router.post("/process-video")
async def process_video(file: UploadFile = File(...)):
    try:
        # Step A: Save the incoming video to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_video:
            temp_video.write(await file.read())
            temp_video_path = temp_video.name

        # Step B: Transcribe the audio using OpenAI's Whisper model
        with open(temp_video_path, "rb") as audio_file:
            transcript_response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        transcript_text = transcript_response.text

        # Clean up the video file so it doesn't fill up your hard drive
        os.remove(temp_video_path)

        # Step C: Grade the logic using GPT-4o
        system_prompt = """You are a hostile, highly critical technical interviewer. 
        Evaluate the user's transcript. 
        You MUST return a valid JSON object with EXACTLY these four keys:
        - "logical_score": an integer from 0 to 100 representing technical accuracy.
        - "missed_points": an array of strings, each pointing out a specific missing detail or flaw.
        - "hostile_critique": a single string containing a harsh, direct, and blunt critique of their logic.
        - "next_step_action": a single string with one clear, actionable instruction on what to study next.
        """

        grading_response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Transcript: {transcript_text}"}
            ]
        )

        # Step D: Package the exact JSON format the frontend needs
        # Step D: Package the exact JSON format the frontend needs
        grade_data = json.loads(grading_response.choices[0].message.content)
        
        # ADD THIS LINE: Attach the Whisper transcript to the final payload
        grade_data["transcript"] = transcript_text 
        
        return grade_data

    except Exception as e:
        print(f"Pipeline Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process video")