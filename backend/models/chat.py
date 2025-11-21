# backend/models/chat.py
from backend.db import db
from datetime import datetime
from bson import ObjectId

chat_collection = db["chats"]

def create_chat(user_id, text=None, img=None, title="New chat"):
    print(f"[DEBUG] Creating chat for user: {user_id}")
    
    new_chat = {
        "userId": user_id,
        "title": title,
        "history": [],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    # Optionally include initial user message
    if text is not None:
        new_chat["history"].append({
            "role": "user",
            "parts": [{"text": text}],
            "img": img
        })
        print(f"[DEBUG] Initial message added to chat")

    try:
        result = chat_collection.insert_one(new_chat)
        chat_id = str(result.inserted_id)
        print(f"[DEBUG] ✓ Chat created successfully with ID: {chat_id}")
        
        # Verify it was saved
        verify = chat_collection.find_one({"_id": result.inserted_id})
        if verify:
            print(f"[DEBUG] ✓ Chat verified in database")
        else:
            print(f"[DEBUG] ❌ WARNING: Chat not found after insert!")
        
        return chat_id
    except Exception as e:
        print(f"[DEBUG] ❌ Error creating chat: {e}")
        raise


def get_chat(chat_id, user_id):
    print(f"[DEBUG] Getting chat {chat_id} for user {user_id}")
    try:
        oid = ObjectId(chat_id)
    except Exception as e:
        print(f"[DEBUG] Invalid ObjectId: {e}")
        return None
    
    chat = chat_collection.find_one({"_id": oid, "userId": user_id})
    if chat:
        print(f"[DEBUG] ✓ Chat found: {chat.get('title')}")
    else:
        print(f"[DEBUG] ❌ Chat not found")
    return chat


def add_to_chat(chat_id, user_id, question=None, answer=None, img=None):
    print(f"[DEBUG] Adding to chat {chat_id}")
    try:
        oid = ObjectId(chat_id)
    except Exception as e:
        print(f"[DEBUG] Invalid ObjectId: {e}")
        return None

    new_items = []

    if question:
        new_items.append({
            "role": "user",
            "parts": [{"text": question}],
            "img": img
        })
        print(f"[DEBUG] Added question to history")

    if answer:
        new_items.append({
            "role": "model",
            "parts": [{"text": answer}]
        })
        print(f"[DEBUG] Added answer to history")

    if not new_items:
        print(f"[DEBUG] ❌ No items to add")
        return None

    try:
        res = chat_collection.update_one(
            {"_id": oid, "userId": user_id},
            {
                "$push": {"history": {"$each": new_items}}, 
                "$set": {"updatedAt": datetime.utcnow()}
            }
        )
        print(f"[DEBUG] Update result - Matched: {res.matched_count}, Modified: {res.modified_count}")
        
        if res.matched_count == 0:
            print(f"[DEBUG] ❌ WARNING: Chat not found for update!")
        elif res.modified_count == 0:
            print(f"[DEBUG] ⚠ WARNING: Chat found but not modified!")
        else:
            print(f"[DEBUG] ✓ Chat updated successfully")
        
        return res
    except Exception as e:
        print(f"[DEBUG] ❌ Error updating chat: {e}")
        raise


def delete_chat(chat_id, user_id):
    """Deletes a single chat document."""
    print(f"[DEBUG] Deleting chat {chat_id}")
    try:
        oid = ObjectId(chat_id)
    except Exception as e:
        print(f"[DEBUG] Invalid ObjectId: {e}")
        return False
    
    try:
        result = chat_collection.delete_one({"_id": oid, "userId": user_id})
        print(f"[DEBUG] Delete result - Deleted: {result.deleted_count}")
        return result.deleted_count > 0
    except Exception as e:
        print(f"[DEBUG] ❌ Error deleting chat: {e}")
        return False
