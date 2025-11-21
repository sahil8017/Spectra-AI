import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get MongoDB URI from environment
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "youtube_summarizer")

# Initialize MongoDB client
client = None
db = None

try:
    # Create MongoDB client with timeout
    client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=5000,  # 5 second timeout
        connectTimeoutMS=10000,
        socketTimeoutMS=10000
    )
    
    # Test the connection
    client.admin.command('ping')
    
    # Get database
    db = client[DB_NAME]
    
    print(f"✓ Successfully connected to MongoDB: {DB_NAME}")
    
    # Create indexes for better performance
    try:
        # Chats collection indexes
        db["chats"].create_index("userId")
        db["chats"].create_index([("userId", 1), ("updatedAt", -1)])
        
        # User chats collection indexes
        db["user_chats"].create_index("userId", unique=True)
        
        # History collection indexes
        db["history"].create_index([("userId", 1), ("createdAt", -1)])
        db["history"].create_index([("userId", 1), ("videoId", 1)])
        
        print("✓ Database indexes created successfully")
    except Exception as e:
        print(f"⚠ Warning: Could not create indexes: {e}")
    
except ConnectionFailure as e:
    print(f"✗ Failed to connect to MongoDB: {e}")
    print("Please check your MONGODB_URI in .env file")
    
except ServerSelectionTimeoutError as e:
    print(f"✗ MongoDB server selection timeout: {e}")
    print("Please ensure MongoDB is running")
    
except Exception as e:
    print(f"✗ Unexpected database error: {e}")

# Export db object
if db is None:
    print("⚠ WARNING: Database connection failed. App may not work correctly.")
    # Create a dummy db object to prevent import errors
    class DummyDB:
        def __getitem__(self, key):
            raise RuntimeError("Database not connected")
    db = DummyDB()