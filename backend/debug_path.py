import sys
import os

print("\n" + "="*50)
print("🔍 FINDING THE ROGUE FILE")
print("="*50)

try:
    import youtube_transcript_api
    location = youtube_transcript_api.__file__
    print(f"📂 LOADED FROM: {location}")
    
    if "site-packages" not in location:
        print("\n❌ PROBLEM FOUND!")
        print("Python is loading a local file instead of the library.")
        print(f"👉 DELETE THIS FILE: {location}")
    else:
        print("\n✅ Library looks correct. Check your pip version.")

except ImportError:
    print("❌ Library not found at all. Run: pip install youtube-transcript-api")
except AttributeError:
    # This happens if the local file is empty or doesn't have __file__
    print("❌ PROBLEM FOUND! A local 'youtube_transcript_api' script is shadowing the library.")
    print(f"Check this folder for a file named 'youtube_transcript_api.py': {os.getcwd()}")

print("="*50 + "\n")