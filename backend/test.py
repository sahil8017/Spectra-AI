# backend/tester.py
from youtube_transcript_api import YouTubeTranscriptApi

# If this prints, the library is fixed.
print("Library Location:", YouTubeTranscriptApi)

# Try to fetch a known working video
try:
    # This is a short 1-minute video for testing
    transcript = YouTubeTranscriptApi.get_transcript("JcVHf4X_dqY")
    print("SUCCESS! Transcript fetched.")
except Exception as e:
    print(f"Error: {e}")