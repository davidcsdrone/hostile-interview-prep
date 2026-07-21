#convert audio to text using Whisper API

from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()



client = OpenAI(api_key = os.environ.get("OPENAI_API_KEY"))
async def transcribe(audio_path: str) -> str:
    audio_file = open(audio_path, "rb")

    transcription = client.audio.transcriptions.create(
    model="whisper-1", 
    file=audio_file
    )
    return transcription.text

