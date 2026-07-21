#provides an endpoint to actually get the interview questions. 
# we use this to call the questions we will have specific to each company
#this will return a list of questions (formatted in json)
from fastapi import FastAPI
from fastapi import APIRouter

app = FastAPI()
router = APIRouter()

# RED FLAG. why do we have the individla questions for a company here????? Should't there
#be large files where each company has a list of questions. It can also depend on what role
#they are applying for!

QUESTIONS = [
    {
    "id": "1",
    "company": "Google",
    "question": "Tell me about a time you failed",
    "category": "behavioral",
    "timeLimit": 120
    },
    {
    "id": "2",
    "company": "Meta",
    "question": "Describe a time you had to learn something new quickly",
    "category": "behavioral",
    "timeLimit": 120
    },
    {
    "id": "3",
    "company": "Amazon",
    "question": "Tell me about a time you had to deal with ambiguity",
    "category": "behavioral",
    "timeLimit": 120},
]



@router.get("/questions/")

async def get_questions():
        """router.get("/questions") works by using GET (retrieves data), 
        using path of /questions 
        """
        return QUESTIONS


#consider this. 

# from fastapi import APIRouter, HTTPException
# import json
# import os

# router = APIRouter(prefix="/interview", tags=["Questions"])

# # We use path parameters ({company}) and query parameters (?role=...) 
# # to dynamically fetch the right data.
# @router.get("/questions/{company}")
# def get_company_questions(company: str, role: str = "Software Engineer"):
#     # Clean the input to match your file names (e.g., "Google" -> "google")
#     filename = f"data/{company.lower()}_{role.lower().replace(' ', '_')}.json"
    
#     # Check if we actually have a file for this company/role combo
#     if not os.path.exists(filename):
#         raise HTTPException(status_code=404, detail="Questions for this company or role not found")
        
#     # Read the file and return the JSON payload dynamically
#     with open(filename, "r") as file:
#         questions_data = json.load(file)
        
#     return questions_data

#INSTEAD of a guess the user puts in. We have the user click on it
# so we don't worry about cleaning any strings or dealing with that. We can simply
#pull out of the existing files we have. Dont forget! We will basically scrape glassdoor/indeed
# other company website to see what questions they ask for specific roles.
