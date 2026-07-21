from anthropic import Anthropic
import os
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
async def evaluate (transcript: str) -> dict:
    prompt = f"""
    You are an expert interview evaluator. The transcript
    provided will be the interview response you receive
    in which you provide specific feedback given 
    the company the applicant choose and a score of 1-100.
    The score must be very honest with no fluff. Must have positive
    reinforcement however. Here is the answer to analyze: 

    {transcript}

    Provide a:
    1. Liklihood the answer is a strong answer, including a 
    strong pass, pass, neutral (could swing either way), 
    no pass or strong no pass
    2. Specific feedback based on what the company is looking for.
    3. A score from 1-100.

    Format your response as:
    Score
    Feebdack: Your feedback here
    Positive reassurence messaage

    """
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": prompt
        }]
    )
    text = response.content[0].text
    lines = text.split('\n')
    feedback = ""
    score = 5
    for line in lines:
        if line.startswith("Feedback:"):
            feedback = line.replace("FEEDBACK: ", "").strip()
        elif line.startswith("SCORE:" ):
            score = int(line.replace("SCORE: ", "").strip())

    return {
        "feedback": feedback,
        "transcript" : transcript,
        "metrics": {"score_out_of_100": score}
    }

    