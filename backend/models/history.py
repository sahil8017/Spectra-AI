# backend/models/history.py
from backend.db import db
from datetime import datetime

history_collection = db["youtube_history"]

def save_history(user_id, video_id, title, summary, language="English", mode="Video Summary"):
    doc = {
        "userId": user_id,
        "videoId": video_id,
        "title": title,
        "summary": summary,
        "language": language,
        "mode": mode,
        "createdAt": datetime.utcnow()
    }
    history_collection.insert_one(doc)
    return doc

def get_all_history(user_id):
    return list(history_collection.find({"userId": user_id}).sort("createdAt", -1))

def get_history_by_video(user_id, video_id):
    return history_collection.find_one({"userId": user_id, "videoId": video_id})
