# backend/models/user_chats.py
from backend.db import db
from datetime import datetime
from bson import ObjectId

user_chats_collection = db["userchats"]
chat_collection = db["chats"] 

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

def remove_user_chat(user_id, chat_id):
    """Removes a single chat reference from the user's list."""
    user_chats_collection.update_one(
        {"userId": user_id},
        {"$pull": {"chats": {"_id": str(chat_id)}}}
    )

def delete_all_user_chats(user_id):
    """
    1. Deletes the user_chats document (the index list of chats).
    2. Deletes all actual chat documents belonging to this user from the 'chats' collection.
    """
    # 1. Delete the directory
    user_chats_collection.delete_one({"userId": user_id})
    
    # 2. Delete all actual chat documents
    chat_collection.delete_many({"userId": user_id})
    
    return True