import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import anthropic
from dotenv import load_dotenv
from routes import questions, evaluation, account

load_dotenv()
client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
)

app = FastAPI()

#we set up Cross-origin resource sharing (CORS). 

# this allows frontend to call backend (3000 to 8000 connection)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"]  
  
)

app.include_router(questions.router) 
app.include_router(evaluation.router)
app.include_router(account.router)

@app.get("/")
def health_check():
    """
    Simple endpoint to check if the server is running.

    """
    return {"status": "Backend is live"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)








# def read_root():
#     return {"Status": "Backend is live", "client_ready": True}

# @app.post("/test-claude")
# async def test_claude(user_input: str):
#     response = client.messages.create(
#         model="claude-3-5-sonnet-20241022",
#         max_tokens=1024, 
#         messages=[{
#             "role": "user",
#             "content": "Hello, Claude"}
#         ]
#         )
#     return {"reply:": response.content[0].text}



# def read_root():
#     return {"status": "Backend is live", "client_ready": True}


# app.add_middleware(
#         CORSMiddleware,
#         allow_origins=["http://localhost:3000"],
#         allow_credentials = True,
#         allow_methods = ["*"],
#         allow_headers = ["*"],

# )

# @app.get("/")

# def health_check():
#     return {"Status": "Online"}

# @app.post("/process-video")

# async def evaluate_logic(video_data: bytes):
#     #we will receive the video file.
#     #extract audio
#     #transcripe with API
#     #Use anthropic or openAI to grade the file
#     return {"Score": "Pass", "Feedback": "Logical Structure Maintained"}



