# Provides interview questions filtered by company and role.
from typing import Optional

from fastapi import APIRouter, Query

router = APIRouter()

QUESTIONS = [
    # Amazon
    {
        "id": "amz-1",
        "company": "Amazon",
        "role": "software-engineer",
        "question": "Tell me about a time you had to deal with ambiguity.",
        "timeLimit": 120,
    },
    {
        "id": "amz-2",
        "company": "Amazon",
        "role": "software-engineer",
        "question": "Tell me about a time you disagreed with a decision.",
        "timeLimit": 120,
    },
    {
        "id": "amz-3",
        "company": "Amazon",
        "role": "software-engineer",
        "question": "Tell me about a time you had to dive deep.",
        "timeLimit": 120,
    },
    {
        "id": "amz-4",
        "company": "Amazon",
        "role": "data-analyst",
        "question": "Tell me about a time your analysis changed a business decision.",
        "timeLimit": 120,
    },
    {
        "id": "amz-5",
        "company": "Amazon",
        "role": "data-engineer",
        "question": "Tell me about a time you fixed a broken data pipeline under pressure.",
        "timeLimit": 120,
    },
    {
        "id": "amz-6",
        "company": "Amazon",
        "role": "product-manager",
        "question": "Tell me about a time you had to prioritize competing customer needs.",
        "timeLimit": 120,
    },
    {
        "id": "amz-7",
        "company": "Amazon",
        "role": "data-scientist",
        "question": "Tell me about a time a model you built failed in production.",
        "timeLimit": 120,
    },
    # Meta
    {
        "id": "meta-1",
        "company": "Meta",
        "role": "software-engineer",
        "question": "Describe a time you had to learn something new quickly.",
        "timeLimit": 120,
    },
    {
        "id": "meta-2",
        "company": "Meta",
        "role": "software-engineer",
        "question": "Describe a time you moved fast and it backfired.",
        "timeLimit": 120,
    },
    {
        "id": "meta-3",
        "company": "Meta",
        "role": "data-analyst",
        "question": "Tell me about a time you found an insight others had missed.",
        "timeLimit": 120,
    },
    {
        "id": "meta-4",
        "company": "Meta",
        "role": "data-engineer",
        "question": "Tell me about a time you scaled a data system for growth.",
        "timeLimit": 120,
    },
    {
        "id": "meta-5",
        "company": "Meta",
        "role": "product-manager",
        "question": "Tell me about a time you said no to a feature request.",
        "timeLimit": 120,
    },
    {
        "id": "meta-6",
        "company": "Meta",
        "role": "data-scientist",
        "question": "Tell me about a time you had to explain a complex model to non-technical stakeholders.",
        "timeLimit": 120,
    },
    # Google
    {
        "id": "goog-1",
        "company": "Google",
        "role": "software-engineer",
        "question": "Tell me about a time you failed.",
        "timeLimit": 120,
    },
    {
        "id": "goog-2",
        "company": "Google",
        "role": "software-engineer",
        "question": "Tell me about a time you improved a system’s reliability.",
        "timeLimit": 120,
    },
    {
        "id": "goog-3",
        "company": "Google",
        "role": "data-analyst",
        "question": "Tell me about a time incomplete data forced you to make a judgment call.",
        "timeLimit": 120,
    },
    {
        "id": "goog-4",
        "company": "Google",
        "role": "data-engineer",
        "question": "Tell me about a time you redesigned a messy data schema.",
        "timeLimit": 120,
    },
    {
        "id": "goog-5",
        "company": "Google",
        "role": "product-manager",
        "question": "Tell me about a time you launched something with incomplete information.",
        "timeLimit": 120,
    },
    {
        "id": "goog-6",
        "company": "Google",
        "role": "data-scientist",
        "question": "Tell me about a time you chose the wrong metric and had to course-correct.",
        "timeLimit": 120,
    },
]


@router.get("/questions/")
async def get_questions(
    company: Optional[str] = Query(default=None),
    role: Optional[str] = Query(default=None),
):
    results = QUESTIONS

    if company:
        results = [q for q in results if q["company"].lower() == company.lower()]

    if role:
        results = [q for q in results if q["role"] == role]

    return results
