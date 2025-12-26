# tax_engine/session_db.py
from pymongo import MongoClient
import os
from datetime import datetime
from bson import ObjectId

MONGO_URL = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URL)

db = client["taxsky"]
sessions = db["sessions"]


def get_or_create_tax_session(userId: str, taxYear: int):
    """Load existing tax session or create a new one."""
    session = sessions.find_one({"userId": userId, "taxYear": taxYear})

    if session:
        return session

    new_session = {
        "userId": userId,
        "taxYear": taxYear,
        "documents": [],
        "filingStatus": None,
        "dependents": [],
        "refundEstimate": 0,
        "createdAt": datetime.utcnow(),
    }

    result = sessions.insert_one(new_session)
    new_session["_id"] = result.inserted_id  # IMPORTANT FIX
    return new_session


def save_session(session):
    """Update MongoDB session document safely."""
    sid = session["_id"]

    # Convert string _id back to ObjectId if needed
    if isinstance(sid, str):
        sid = ObjectId(sid)

    sessions.update_one({"_id": sid}, {"$set": session})


def session_to_dict(session):
    """Return a JSON-safe version of the session without mutating the original."""
    cleaned = dict(session)
    cleaned["_id"] = str(session["_id"])  # convert to string safely
    return cleaned
