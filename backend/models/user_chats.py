# backend/models/user_chats.py
from backend.db import db
from datetime import datetime

user_chats_collection = db["user_chats"]

def add_user_chat(user_id, chat_id, title="New Chat"):
    """Add a chat to user's chat list"""
    print(f"[DEBUG] Adding chat {chat_id} to user {user_id} chat list")
    
    try:
        result = user_chats_collection.update_one(
            {"userId": user_id},
            {
                "$push": {
                    "chats": {
                        "chatId": chat_id,
                        "title": title,
                        "createdAt": datetime.utcnow()
                    }
                }
            },
            upsert=True  # Create if doesn't exist
        )
        print(f"[DEBUG] User chat list update - Matched: {result.matched_count}, Modified: {result.modified_count}, Upserted: {result.upserted_id}")
        return True
    except Exception as e:
        print(f"[DEBUG] ❌ Error adding to user chats: {e}")
        return False


def get_user_chats(user_id):
    """Get all chats for a user"""
    print(f"[DEBUG] Getting chats for user {user_id}")
    
    try:
        user_data = user_chats_collection.find_one({"userId": user_id})
        if user_data and "chats" in user_data:
            chats = user_data["chats"]
            print(f"[DEBUG] ✓ Found {len(chats)} chats for user")
            return chats
        else:
            print(f"[DEBUG] No chats found for user")
            return []
    except Exception as e:
        print(f"[DEBUG] ❌ Error getting user chats: {e}")
        return []


def remove_user_chat(user_id, chat_id):
    """Remove a chat from user's chat list"""
    print(f"[DEBUG] Removing chat {chat_id} from user {user_id}")
    
    try:
        result = user_chats_collection.update_one(
            {"userId": user_id},
            {"$pull": {"chats": {"chatId": chat_id}}}
        )
        print(f"[DEBUG] Remove result - Modified: {result.modified_count}")
        return result.modified_count > 0
    except Exception as e:
        print(f"[DEBUG] ❌ Error removing user chat: {e}")
        return False


def delete_all_user_chats(user_id):
    """Delete all chats for a user"""
    print(f"[DEBUG] Deleting all chats for user {user_id}")
    
    try:
        result = user_chats_collection.delete_one({"userId": user_id})
        print(f"[DEBUG] Delete all result - Deleted: {result.deleted_count}")
        return result.deleted_count > 0
    except Exception as e:
        print(f"[DEBUG] ❌ Error deleting all user chats: {e}")
        return False
