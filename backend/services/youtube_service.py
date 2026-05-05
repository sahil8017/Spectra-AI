from youtube_transcript_api import YouTubeTranscriptApi
import urllib.parse as urlparse
from urllib.parse import parse_qs

def extract_video_id(url: str) -> str:
    parsed_url = urlparse.urlparse(url)
    hostname = parsed_url.hostname or ""
    
    if hostname in ('youtu.be', 'www.youtu.be'):
        return parsed_url.path[1:]
    
    if hostname in ('youtube.com', 'www.youtube.com'):
        if parsed_url.path == '/watch':
            params = parse_qs(parsed_url.query)
            if 'v' in params:
                return params['v'][0]
        # Handle /shorts/ and /embed/ URLs
        parts = parsed_url.path.split('/')
        if len(parts) >= 3 and parts[1] in ('shorts', 'embed'):
            return parts[2]
    
    raise ValueError(f"Invalid YouTube URL: {url}")

def get_transcript(url: str, language: str = "en") -> str:
    video_id = extract_video_id(url)
    try:
        # New youtube-transcript-api v2.x API: use instance method .fetch()
        api = YouTubeTranscriptApi()
        transcript_list = api.fetch(video_id, languages=[language])
        text = " ".join([snippet.text for snippet in transcript_list])
        return text
    except Exception as e:
        # Fallback: try without language preference
        try:
            api = YouTubeTranscriptApi()
            transcript_list = api.fetch(video_id)
            text = " ".join([snippet.text for snippet in transcript_list])
            return text
        except Exception as e2:
            raise ValueError(f"Could not retrieve transcript for video '{video_id}': {str(e2)}")

def generate_summary(transcript: str) -> str:
    pass  # Handled in the router via llm_service
