# backend/models/history.py
from backend.db import db
from datetime import datetime
from bson import ObjectId

history_collection = db["history"]

def save_history(user_id, video_id, title, summary, mode="Video Summary"):
    """Save summary to history"""
    print(f"[DEBUG] Saving history for user {user_id}: {title}")
    
    history_entry = {
        "userId": user_id,
        "videoId": video_id,
        "title": title,
        "summary": summary,
        "mode": mode,
        "createdAt": datetime.utcnow()
    }
    
    try:
        result = history_collection.insert_one(history_entry)
        print(f"[DEBUG] ✓ History saved with ID: {result.inserted_id}")
        return str(result.inserted_id)
    except Exception as e:
        print(f"[DEBUG] ❌ Error saving history: {e}")
        raise


def get_all_history(user_id):
    """Get all history for a user"""
    print(f"[DEBUG] Getting history for user {user_id}")
    
    try:
        history = list(history_collection.find(
            {"userId": user_id}
        ).sort("createdAt", -1))
        
        # Convert ObjectId to string
        for item in history:
            item["_id"] = str(item["_id"])
            if "createdAt" in item:
                item["createdAt"] = item["createdAt"].isoformat()
        
        print(f"[DEBUG] ✓ Found {len(history)} history items")
        return history
    except Exception as e:
        print(f"[DEBUG] ❌ Error getting history: {e}")
        return []


def get_history_by_video(user_id, video_id):
    """Get history for specific video"""
    print(f"[DEBUG] Getting history for video {video_id}")
    
    try:
        history = history_collection.find_one({
            "userId": user_id,
            "videoId": video_id
        })
        
        if history:
            history["_id"] = str(history["_id"])
            if "createdAt" in history:
                history["createdAt"] = history["createdAt"].isoformat()
            print(f"[DEBUG] ✓ History found")
        else:
            print(f"[DEBUG] No history found")
        
        return history
    except Exception as e:
        print(f"[DEBUG] ❌ Error getting video history: {e}")
        return None
