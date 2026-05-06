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

def get_transcript(url: str, language_prefs: list = None) -> str:
    if language_prefs is None:
        language_prefs = ['en', 'en-US', 'en-GB']
        
    video_id = extract_video_id(url)
    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)
        
        try:
            # 1. Try preferred languages (includes auto-generated if they match code)
            transcript = transcript_list.find_transcript(language_prefs)
        except Exception:
            # 2. If preferred fails, just pick the first one available in the list
            # transcript_list is an iterable of Transcript objects
            try:
                transcript = next(iter(transcript_list))
            except StopIteration:
                raise ValueError(f"No transcripts available for video '{video_id}'")

        data = transcript.fetch()
        
        # Handle different versions of youtube-transcript-api (dict vs object)
        text_parts = []
        for snippet in data:
            if isinstance(snippet, dict):
                text_parts.append(snippet.get('text', ''))
            else:
                text_parts.append(getattr(snippet, 'text', str(snippet)))
                
        return " ".join(text_parts)
    except Exception as e:
        raise ValueError(f"Could not retrieve transcript for video '{video_id}': {str(e)}")

def generate_summary(transcript: str) -> str:
    pass  # Handled in the router via llm_service
