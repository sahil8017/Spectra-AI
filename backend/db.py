# backend/db.py
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

# Environment variable name used in your .env (MONGO or MONGO_URI both supported)
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGO")

if not MONGO_URI:
    raise RuntimeError("Missing MONGO_URI environment variable")

client = MongoClient(MONGO_URI)
# Keep DB name same as you want; using "spectra_ai" to match app.py earlier
db = client["spectra_ai"]
