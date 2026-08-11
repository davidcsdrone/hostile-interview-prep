import os
import json
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
client = OpenAI()

# Fixed taxonomy — grader may ONLY use these (Phase 0 Weak Spots foundation)
ALLOWED_WEAKNESS_TAGS = {
    "no_metrics",
    "rambling",
    "no_structure",
    "vague_ownership",
    "buzzwords",
    "shallow_tradeoffs",
    "no_reflection",
    "off_question",
}


def normalize_weakness_tags(raw_tags) -> list:
    """Keep 0–3 tags from the allowlist only (countable, no NLP)."""
    if not isinstance(raw_tags, list):
        return []
    cleaned = []
    for tag in raw_tags:
        if not isinstance(tag, str):
            continue
        key = tag.strip().lower()
        if key in ALLOWED_WEAKNESS_TAGS and key not in cleaned:
            cleaned.append(key)
        if len(cleaned) >= 3:
            break
    return cleaned


@router.post("/process-video")
async def process_video(file: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_video:
            temp_video.write(await file.read())
            temp_video_path = temp_video.name

        with open(temp_video_path, "rb") as audio_file:
            transcript_response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
        transcript_text = transcript_response.text

        os.remove(temp_video_path)

        system_prompt = """You are a hostile, highly critical technical interviewer.
Evaluate the user's transcript.
You MUST return a valid JSON object with EXACTLY these five keys:
- "logical_score": an integer from 0 to 100 representing technical accuracy.
- "missed_points": an array of strings, each pointing out a specific missing detail or flaw.
- "hostile_critique": a single string containing a harsh, direct, and blunt critique of their logic.
- "next_step_action": a single string with one clear, actionable instruction on what to study next.
- "weakness_tags": an array of 0 to 3 tags chosen ONLY from this fixed list:
  no_metrics, rambling, no_structure, vague_ownership, buzzwords, shallow_tradeoffs, no_reflection, off_question

Tag meanings:
- no_metrics: no numbers or quantified impact
- rambling: slow to the point / filler
- no_structure: weak STAR or unclear structure
- vague_ownership: unclear what THEY personally did
- buzzwords: jargon without substance
- shallow_tradeoffs: no alternatives or tradeoffs
- no_reflection: no learning from failure when relevant
- off_question: does not answer what was asked

Use only tags clearly supported by the transcript. Prefer fewer tags over weak guesses. Never invent tags outside the list.
"""

        grading_response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Transcript: {transcript_text}"},
            ],
        )

        grade_data = json.loads(grading_response.choices[0].message.content)
        grade_data["transcript"] = transcript_text
        grade_data["weakness_tags"] = normalize_weakness_tags(
            grade_data.get("weakness_tags")
        )

        return grade_data

    except Exception as e:
        print(f"Pipeline Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process video")
