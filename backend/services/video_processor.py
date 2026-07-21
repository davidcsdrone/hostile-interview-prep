#this file will save the video and extract the audio. 
#Part of backend
# will receive an uploaded file
#save it to some disk
#Run FFmpeg to extract audio
#return the path to the audio file.

import tempfile
import ffmpeg
import subprocess
from fastapi import UploadFile

async def save_video(file: UploadFile):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        content = await file.read()
        tmp.write(content)
        return tmp.name


async def extract_audio(video_path: str) -> str:
    audio_path = str(video_path).replace(".mp4", ".mp3")
    (
        ffmpeg
        .input(video_path)
        .output(audio_path)
        .overwrite_output()
        .run()
    )
    return audio_path











# import cv2
# from cv2 import cv2
# webcam = cv2.VideoCapture(1)



# while True:
#     ret, frame = webcam.read()

#     if ret == True:
#         cv2.imshow("Koolac", frame)
#         key = cv2.waitKey(1)
#         if key == ord("q"): #user might press q which is quit
#             break
# webcam.release()
# cv2.destroyAllWindows()


