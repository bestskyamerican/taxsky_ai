"""
================================================================================
TAXSKY - MONGODB CLIENT v2.0
================================================================================
File: python_tax_api/tax_engine/mongodb_client.py

Direct MongoDB access for Python extractor.
================================================================================
"""

import os
from typing import Dict, Any, Optional, List
from datetime import datetime

# Try to import pymongo
try:
    from pymongo import MongoClient
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False
    print("⚠️ pymongo not installed. Run: pip install pymongo")

# ============================================================
# CONFIGURATION
# ============================================================
# DigitalOcean MongoDB
MONGODB_URI = os.getenv(
    "MONGODB_URI", 
    "mongodb+srv://doadmin:9mb0I2r13P485ETp@db-mongodb-nyc3-29782-5b577e4b.mongo.ondigitalocean.com/ai_tax?authSource=admin&tls=true"
)
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "ai_tax")
COLLECTION_NAME = "taxsessions"

# Global client (reuse connection)
_client = None
_db = None


def get_db():
    """Get MongoDB database connection."""
    global _client, _db
    
    if not PYMONGO_AVAILABLE:
        raise ImportError("pymongo not installed. Run: pip install pymongo")
    
    if _client is None:
        print(f"📡 Connecting to MongoDB: {MONGODB_URI[:50]}...")
        _client = MongoClient(MONGODB_URI)
        _db = _client[DATABASE_NAME]
        print(f"✅ Connected to database: {DATABASE_NAME}")
    
    return _db


def get_session(user_id: str, tax_year: int = 2025) -> Optional[Dict[str, Any]]:
    """
    Get TaxSession directly from MongoDB.
    """
    try:
        db = get_db()
        collection = db[COLLECTION_NAME]
        
        # Try with taxYear first
        session = collection.find_one({
            "userId": user_id,
            "taxYear": tax_year
        })
        
        # Fallback: try without taxYear filter
        if not session:
            session = collection.find_one({"userId": user_id})
        
        if not session:
            print(f"❌ Session not found: {user_id}")
            return None
        
        # Convert ObjectId to string
        if "_id" in session:
            session["_id"] = str(session["_id"])
        
        print(f"✅ Found session: {user_id}")
        print(f"   Messages: {len(session.get('messages', []))}")
        print(f"   Status: {session.get('status', 'unknown')}")
        
        return session
        
    except Exception as e:
        print(f"❌ MongoDB get error: {e}")
        return None


def update_session(user_id: str, tax_year: int, update_data: Dict[str, Any]) -> bool:
    """
    Update TaxSession in MongoDB.
    
    ✅ This saves the extracted data back to MongoDB so Dashboard shows correct values.
    """
    try:
        db = get_db()
        collection = db[COLLECTION_NAME]
        
        # Add updatedAt timestamp
        update_data["updatedAt"] = datetime.utcnow()
        
        # Try to update with taxYear filter
        result = collection.update_one(
            {"userId": user_id, "taxYear": tax_year},
            {"$set": update_data}
        )
        
        # If no match, try without taxYear
        if result.matched_count == 0:
            result = collection.update_one(
                {"userId": user_id},
                {"$set": update_data}
            )
        
        if result.modified_count > 0:
            print(f"✅ Updated session: {user_id}")
            return True
        elif result.matched_count > 0:
            print(f"⚠️ Session matched but not modified (same data?): {user_id}")
            return True
        else:
            print(f"❌ No session found to update: {user_id}")
            return False
        
    except Exception as e:
        print(f"❌ MongoDB update error: {e}")
        return False


def save_form1040_to_session(user_id: str, tax_year: int, form1040: Dict, tax_result: Dict = None) -> bool:
    """
    Save Form 1040 data to a TaxSession.
    """
    update_data = {
        "form1040": form1040,
        "status": "extracted",
        "ragVerified": True,
    }
    
    if tax_result:
        update_data["taxCalculation"] = tax_result
    
    return update_session(user_id, tax_year, update_data)


def list_sessions(status: str = None, limit: int = 20) -> List[Dict]:
    """List recent sessions."""
    try:
        db = get_db()
        collection = db[COLLECTION_NAME]
        
        query = {}
        if status:
            query["status"] = status
        
        sessions = collection.find(query).sort("updatedAt", -1).limit(limit)
        
        results = []
        for session in sessions:
            results.append({
                "userId": session.get("userId"),
                "taxYear": session.get("taxYear"),
                "status": session.get("status"),
                "messageCount": len(session.get("messages", [])),
                "hasForm1040": bool(session.get("form1040")),
                "updatedAt": session.get("updatedAt")
            })
        
        return results
        
    except Exception as e:
        print(f"❌ MongoDB list error: {e}")
        return []


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🧪 MONGODB CLIENT TEST")
    print("="*60)
    
    if not PYMONGO_AVAILABLE:
        print("❌ pymongo not installed!")
        exit(1)
    
    try:
        db = get_db()
        print("✅ Connection successful!")
        
        # Count sessions
        count = db[COLLECTION_NAME].count_documents({})
        print(f"   Total sessions: {count}")
        
        # List recent
        sessions = list_sessions(limit=5)
        print(f"\nRecent sessions:")
        for s in sessions:
            print(f"   {s['userId']} | {s['status']} | {s['messageCount']} msgs")
        
    except Exception as e:
        print(f"❌ Error: {e}")