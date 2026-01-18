"""
================================================================================
TAXSKY - MONGODB CLIENT
================================================================================
File: python_tax_api/tax_engine/mongodb_client.py

Direct MongoDB access for TaxSky Python extractor.
Eliminates the need to call Node.js API.

USAGE:
    from mongodb_client import get_session, update_session

CONFIGURATION:
    Set environment variable:
    export MONGODB_URI=mongodb://localhost:27017/ai_tax12

================================================================================
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime

# Try to import pymongo
try:
    from pymongo import MongoClient
    from bson import ObjectId
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False
    print("⚠️ pymongo not installed. Run: pip install pymongo")

# ============================================================
# CONFIGURATION
# ============================================================

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ai_tax")
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
        print(f"📡 Connecting to MongoDB: {MONGODB_URI}")
        _client = MongoClient(MONGODB_URI)
        _db = _client[DATABASE_NAME]
        print(f"✅ Connected to database: {DATABASE_NAME}")
    
    return _db


def get_session(user_id: str, tax_year: int = 2025) -> Optional[Dict[str, Any]]:
    """
    Get TaxSession directly from MongoDB.
    
    Args:
        user_id: The user ID (e.g., "user_1767066185683_qxlzx840c")
        tax_year: Tax year (default 2025)
    
    Returns:
        Session dict with messages, answers, etc. or None if not found
    """
    try:
        db = get_db()
        collection = db[COLLECTION_NAME]
        
        session = collection.find_one({
            "userId": user_id,
            "taxYear": tax_year
        })
        
        if not session:
            print(f"❌ Session not found: {user_id}, year {tax_year}")
            return None
        
        # Convert ObjectId to string
        if "_id" in session:
            session["_id"] = str(session["_id"])
        
        print(f"✅ Found session: {user_id}")
        print(f"   Messages: {len(session.get('messages', []))}")
        print(f"   Status: {session.get('status', 'unknown')}")
        
        return session
        
    except Exception as e:
        print(f"❌ MongoDB error: {e}")
        return None


def update_session(user_id: str, tax_year: int, update_data: Dict[str, Any]) -> bool:
    """
    Update TaxSession in MongoDB.
    
    Args:
        user_id: The user ID
        tax_year: Tax year
        update_data: Fields to update (e.g., {"status": "ready_for_review", "form1040": {...}})
    
    Returns:
        True if successful, False otherwise
    """
    try:
        db = get_db()
        collection = db[COLLECTION_NAME]
        
        # Add timestamp
        update_data["updatedAt"] = datetime.utcnow()
        
        result = collection.update_one(
            {"userId": user_id, "taxYear": tax_year},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            print(f"✅ Updated session: {user_id}")
            return True
        else:
            print(f"⚠️ No changes made to session: {user_id}")
            return False
            
    except Exception as e:
        print(f"❌ MongoDB update error: {e}")
        return False


def save_form1040_to_session(user_id: str, tax_year: int, form1040: Dict, 
                              tax_result: Dict, rag_verified: bool = False,
                              validation_errors: list = None) -> bool:
    """
    Save Form 1040 and tax calculation results to MongoDB session.
    
    Args:
        user_id: The user ID
        tax_year: Tax year
        form1040: Complete Form 1040 JSON
        tax_result: Tax calculation results from calculator.py
        rag_verified: Whether RAG validation passed
        validation_errors: List of validation errors/warnings
    
    Returns:
        True if successful
    """
    update_data = {
        "form1040": form1040,
        "taxResult": {
            "total_income": tax_result.get("total_income", 0),
            "agi": tax_result.get("agi", 0),
            "standard_deduction": tax_result.get("standard_deduction", 0),
            "taxable_income": tax_result.get("taxable_income", 0),
            "bracket_tax": tax_result.get("bracket_tax", 0),
            "total_tax": tax_result.get("tax_before_credits", 0),
            "child_tax_credit": tax_result.get("child_tax_credit", 0),
            "other_dependent_credit": tax_result.get("other_dependent_credit", 0),
            "eitc": tax_result.get("eitc", 0),
            "actc": tax_result.get("actc", 0),
            "total_credits": tax_result.get("total_credits", 0),
            "tax_after_credits": tax_result.get("tax_after_credits", 0),
            "federal_withheld": tax_result.get("withholding", 0),
            "refund": tax_result.get("refund", 0),
            "amount_owed": tax_result.get("amount_owed", 0),
        },
        "status": "ready_for_review",
        "ragVerified": rag_verified,
        "validationErrors": validation_errors or [],
        "extractedAt": datetime.utcnow()
    }
    
    return update_session(user_id, tax_year, update_data)


def list_sessions(status: str = None, limit: int = 10) -> list:
    """
    List TaxSessions from MongoDB.
    
    Args:
        status: Filter by status (optional)
        limit: Max number of results
    
    Returns:
        List of session summaries
    """
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
                "ragVerified": session.get("ragVerified", False),
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
        print("   Run: pip install pymongo")
        exit(1)
    
    print(f"\nConfiguration:")
    print(f"  MONGODB_URI: {MONGODB_URI}")
    print(f"  DATABASE: {DATABASE_NAME}")
    print(f"  COLLECTION: {COLLECTION_NAME}")
    
    # Test connection
    print(f"\n{'─'*60}")
    print("Testing connection...")
    
    try:
        db = get_db()
        print("✅ Connection successful!")
        
        # List collections
        collections = db.list_collection_names()
        print(f"   Collections: {collections}")
        
        # Count sessions
        count = db[COLLECTION_NAME].count_documents({})
        print(f"   Total sessions: {count}")
        
        # List recent sessions
        print(f"\n{'─'*60}")
        print("Recent sessions:")
        sessions = list_sessions(limit=5)
        for s in sessions:
            print(f"   {s['userId']} | {s['status']} | {s['messageCount']} msgs")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print(f"\n{'='*60}\n")