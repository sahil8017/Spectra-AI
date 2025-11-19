# models/user_chats.py
from backend.db import db
from datetime import datetime
from bson import ObjectId

user_chats_collection = db["userchats"]

def add_user_chat(user_id, chat_id, title):
    # chat_id should be string; store it as string for easy client-side usage
    existing = user_chats_collection.find_one({"userId": user_id})

    chat_entry = {
        "_id": str(chat_id),
        "title": title,
        "createdAt": datetime.utcnow()
    }

    if not existing:
        new_doc = {
            "userId": user_id,
            "chats": [chat_entry],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        user_chats_collection.insert_one(new_doc)
    else:
        user_chats_collection.update_one(
            {"userId": user_id},
            {"$push": {"chats": chat_entry}, "$set": {"updatedAt": datetime.utcnow()}}
        )

def get_user_chats(user_id):
    doc = user_chats_collection.find_one({"userId": user_id})
    return doc.get("chats", []) if doc else []
