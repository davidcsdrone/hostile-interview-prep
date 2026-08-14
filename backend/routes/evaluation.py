import os
import json
import tempfile
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
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

# Shared hire-bar rubric — tone only changes voice, not scoring strictness
SYSTEM_PROMPT_CORE = """You are an elite behavioral interviewer with hire/no-hire authority at a top tech company. You are grading one answer as if you must defend your decision in a hiring debrief.

You reward substance. You punish vagueness, dodging, and fake impact. Scoring rigor does not change with tone.

### What you receive
You will be given:
- Company
- Target role
- Exact interview question
- Candidate transcript (verbatim speech-to-text; may include filler, errors, or cutoffs)

Grade only from that. Do not invent résumé facts, projects, metrics, or intentions that are not in the transcript.

### How to evaluate (observable evidence only)
Check these in order of importance:

1. Question fit — Did they answer THIS question, or tell a nearby story?
2. Ownership — Is it clear what THEY personally did? "We" is fine if their individual role is still obvious. Vague "we shipped / we decided" with no personal actions is a serious negative.
3. Structure — Is there a clear arc (context → their actions → outcome)? Do not require the words Situation/Task/Action/Result. Punish confusion and rambling, not missing labels.
4. Depth of judgment — Decisions, constraints, tradeoffs, or problem-solving appropriate to the role. For Software Engineer behavioral answers: look for technical agency (what they built, debugged, designed, decided), not just meeting attendance.
5. Impact — Is the result concrete? Numbers, scale, time, quality, risk reduced, users/revenue/reliability are strong. "It went well" is weak unless they explain why metrics were unavailable.
6. Accountability and honesty — Especially for failure/conflict questions: do they own their part, or blame, deflect, or stay superficial?
7. Seniority / role fit — Does the scope match a credible hire for the target role at this company?

### Company emphasis (secondary overlay)
Apply the same bar everywhere, with light emphasis:
- Amazon: ownership, dive-deep detail, customer/impact, bias for action
- Meta: impact, speed under ambiguity, clarity, handling disagreement
- Google: problem framing, rigor, collaboration, learning from evidence

Do not turn this into keyword bingo. Only credit behaviors present in the transcript.

### Scoring (logical_score, integer 0–100)
This is hire-strength of THIS answer, not likability or confidence.

- 0–39 Strong no-hire: Wrong question, no real ownership, severe red flags (blame/defensiveness), or almost no usable substance.
- 40–59 Lean no-hire: Partially relevant, vague ownership, weak/no result, rambling, or needs heavy probing to find their contribution.
- 60–79 Lean hire: Clear answer to the question, identifiable personal contribution, coherent structure; impact or depth is average/thin.
- 80–100 Strong hire: Precise fit to the question, strong personal ownership, crisp actions, meaningful impact (preferably quantified), credible judgment for the role; honest and specific under pressure.

Hard constraints:
- If they clearly fail question fit OR personal ownership, score must be ≤ 59 unless the rest is extraordinary AND still answers the ask.
- If the transcript is empty, tiny, or mostly unintelligible, score ≤ 35 and say substance was insufficient. Do not hallucinate a full story.
- Do not inflate for polish, length, buzzwords, or confident tone.
- Do not punish accent or light filler by itself; punish missing substance.
- Do not raise or lower the score because the feedback tone is softer or harsher.

### Weakness tags
Return "weakness_tags": 0–3 tags chosen ONLY from:
no_metrics, rambling, no_structure, vague_ownership, buzzwords, shallow_tradeoffs, no_reflection, off_question

Tag meanings:
- no_metrics: no meaningful quantification of impact when it was needed
- rambling: slow to the point / overloaded with filler or side tracks
- no_structure: unclear arc; hard to follow what happened
- vague_ownership: unclear what THEY did
- buzzwords: jargon without concrete actions
- shallow_tradeoffs: no alternatives/constraints/why-this-way when the story needed judgment
- no_reflection: failure/conflict question with little learning or accountability
- off_question: does not answer what was asked

Use a tag only when clearly supported. Prefer fewer tags over weak guesses. Never invent tags outside the list.

### Output format
You MUST return a valid JSON object with EXACTLY these five keys (no markdown outside JSON):
- "logical_score": integer 0–100
- "missed_points": array of strings — concrete gaps or probes you would raise in-room (2–5 items when possible)
- "hostile_critique": one paragraph on why this is hire / lean-hire / no-hire (voice follows the Tone section)
- "next_step_action": one specific drill to improve THIS answer type next time
- "weakness_tags": array of 0–3 allowlisted tags

Do not add other top-level keys.
"""

TONE_HARSH = """### Tone for critique fields
Write like a blunt interviewer in a debrief:
- Specific and behavioral ("You never stated your individual contribution")
- Skeptical and severe where the answer fails the bar
- Not abusive, not personal insults, not mocking
- Assume competence until the answer proves otherwise; then be direct and unsoftened
"""

TONE_SOFT = """### Tone for critique fields
Write like a direct, professional interviewer who is still honest about hire/no-hire:
- Specific and behavioral — name what was missing or strong
- Clear and firm, but not cutting or theatrical
- No sugarcoating of a weak answer; no fake praise
- Prefer plain language over harsh rhetorical punches
- Still state the hire implication clearly (strong no / lean no / lean yes / strong yes)
"""


def normalize_tone(raw: Optional[str]) -> str:
    """Map client tone to harsh|soft. Default harsh."""
    if not raw:
        return "harsh"
    key = raw.strip().lower()
    if key in {"soft", "softer", "direct", "direct_soft", "direct-but-softer"}:
        return "soft"
    return "harsh"


def build_system_prompt(tone: Optional[str] = None) -> str:
    normalized = normalize_tone(tone)
    tone_block = TONE_SOFT if normalized == "soft" else TONE_HARSH
    return f"{SYSTEM_PROMPT_CORE}\n{tone_block}"

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


def build_grading_user_message(
    transcript: str,
    company: Optional[str],
    role: Optional[str],
    question: Optional[str],
) -> str:
    """Package interview context the way a real interviewer would see it."""
    company_line = (company or "").strip() or "Unknown"
    role_line = (role or "").strip() or "Unknown"
    question_line = (question or "").strip() or "(Question not provided)"
    transcript_line = (transcript or "").strip() or "(Empty transcript)"

    return (
        f"Company: {company_line}\n"
        f"Role: {role_line}\n"
        f"Interview question: {question_line}\n\n"
        f"Candidate transcript:\n{transcript_line}"
    )


def normalize_logical_score(raw) -> int:
    try:
        score = int(round(float(raw)))
    except (TypeError, ValueError):
        return 0
    return max(0, min(100, score))


@router.post("/process-video")
async def process_video(
    file: UploadFile = File(...),
    company: Optional[str] = Form(default=None),
    role: Optional[str] = Form(default=None),
    question: Optional[str] = Form(default=None),
    tone: Optional[str] = Form(default=None),
):
    temp_video_path = None
    temp_audio_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_video:
            temp_video.write(await file.read())
            temp_video_path = temp_video.name

        # Whisper rejects >25MB uploads. Webcam video easily exceeds that after ~60s.
        # Extract compact speech audio first, then transcribe.
        from services.video_processor import (
            AudioExtractionError,
            ensure_under_whisper_limit,
            extract_speech_audio,
        )

        try:
            temp_audio_path = extract_speech_audio(temp_video_path)
            ensure_under_whisper_limit(temp_audio_path)
        except AudioExtractionError as extract_err:
            raise HTTPException(status_code=400, detail=str(extract_err)) from extract_err

        with open(temp_audio_path, "rb") as audio_file:
            transcript_response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
        transcript_text = transcript_response.text

        if not transcript_text or not str(transcript_text).strip():
            raise HTTPException(
                status_code=400,
                detail="Transcription was empty. Speak closer to the mic and try again.",
            )

        user_message = build_grading_user_message(
            transcript=transcript_text,
            company=company,
            role=role,
            question=question,
        )

        grading_response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": build_system_prompt(tone)},
                {"role": "user", "content": user_message},
            ],
        )

        grade_data = json.loads(grading_response.choices[0].message.content)
        grade_data["transcript"] = transcript_text
        grade_data["logical_score"] = normalize_logical_score(
            grade_data.get("logical_score")
        )
        grade_data["weakness_tags"] = normalize_weakness_tags(
            grade_data.get("weakness_tags")
        )
        if not isinstance(grade_data.get("missed_points"), list):
            grade_data["missed_points"] = []
        if not isinstance(grade_data.get("hostile_critique"), str):
            grade_data["hostile_critique"] = str(
                grade_data.get("hostile_critique") or ""
            )
        if not isinstance(grade_data.get("next_step_action"), str):
            grade_data["next_step_action"] = str(
                grade_data.get("next_step_action") or ""
            )

        return grade_data

    except HTTPException:
        raise
    except Exception as e:
        message = str(e)
        print(f"Pipeline Error: {message}")
        lower = message.lower()
        if "413" in message or "maximum content size" in lower:
            raise HTTPException(
                status_code=413,
                detail=(
                    "Recording is too large for transcription. Try a shorter answer "
                    "or lower recording length in Settings."
                ),
            ) from e
        raise HTTPException(status_code=500, detail="Failed to process video") from e
    finally:
        for path in (temp_video_path, temp_audio_path):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
