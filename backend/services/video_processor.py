"""Save uploaded video and extract compact speech audio for Whisper."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile

from fastapi import UploadFile

# Whisper API hard ceiling is 25MB. Stay under with margin.
WHISPER_MAX_BYTES = 24 * 1024 * 1024


class AudioExtractionError(Exception):
    """Raised when ffmpeg cannot produce usable audio."""


async def save_upload(file: UploadFile, suffix: str = ".webm") -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        return tmp.name


def _run_ffmpeg(args: list[str]) -> None:
    if not shutil.which("ffmpeg"):
        raise AudioExtractionError(
            "ffmpeg is not installed on the server. Install ffmpeg to process recordings."
        )
    result = subprocess.run(
        args,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "unknown ffmpeg error").strip()
        raise AudioExtractionError(f"Could not extract audio from recording: {detail[:400]}")


def extract_speech_audio(video_path: str) -> str:
    """
    Strip video and compress to mono 16kHz MP3 for Whisper.
    Speech-only audio is tiny vs webcam video, so long answers stay under the 25MB API limit.
    """
    audio_path = f"{video_path}.speech.mp3"
    _run_ffmpeg(
        [
            "ffmpeg",
            "-y",
            "-i",
            video_path,
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-b:a",
            "48k",
            audio_path,
        ]
    )
    if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
        raise AudioExtractionError(
            "No audio track found in the recording. Check your microphone and try again."
        )
    return audio_path


def ensure_under_whisper_limit(audio_path: str) -> None:
    size = os.path.getsize(audio_path)
    if size > WHISPER_MAX_BYTES:
        raise AudioExtractionError(
            "Recording is too long/large to transcribe. Try a shorter answer "
            "(under about 3 minutes) or reduce recording length in Settings."
        )


# Backwards-compatible names used by older experiments
async def save_video(file: UploadFile) -> str:
    return await save_upload(file, suffix=".mp4")


async def extract_audio(video_path: str) -> str:
    return extract_speech_audio(video_path)
