import os
from dotenv import load_dotenv
load_dotenv()

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

HOST = "0.0.0.0"
PORT = 0000
ALLOWED_ORIGINS = ["http://localhost:3000"]







