# backend/models/chat.py
from backend.db import db
from datetime import datetime
from bson import ObjectId

chat_collection = db["chats"]

def create_chat(user_id, text=None, img=None, title="New chat"):
    new_chat = {
        "userId": user_id,
        "title": title,
        "history": [],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    # optionally include initial user message
    if text is not None:
        new_chat["history"].append({
            "role": "user",
            "parts": [{"text": text}],
            "img": img
        })

    result = chat_collection.insert_one(new_chat)
    return str(result.inserted_id)

def get_chat(chat_id, user_id):
    try:
        oid = ObjectId(chat_id)
    except Exception:
        return None
    return chat_collection.find_one({"_id": oid, "userId": user_id})

def add_to_chat(chat_id, user_id, question=None, answer=None, img=None):
    try:
        oid = ObjectId(chat_id)
    except Exception:
        return None

    new_items = []

    if question:
        new_items.append({
            "role": "user",
            "parts": [{"text": question}],
            "img": img
        })

    if answer:
        new_items.append({
            "role": "model",
            "parts": [{"text": answer}]
        })

    if not new_items:
        return None

    res = chat_collection.update_one(
        {"_id": oid, "userId": user_id},
        {"$push": {"history": {"$each": new_items}}, "$set": {"updatedAt": datetime.utcnow()}}
    )
    return res

def delete_chat(chat_id, user_id):
    """Deletes a single chat document."""
    try:
        oid = ObjectId(chat_id)
    except Exception:
        return False
    
    result = chat_collection.delete_one({"_id": oid, "userId": user_id})
    return result.deleted_count > 0