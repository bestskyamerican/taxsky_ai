"""
================================================================================
TAXSKY 2025 - MONGODB CLIENT v2.2 (ENV VARIABLE FIX)
================================================================================
File: python_tax_api/tax_engine/mongodb_client.py

FIXES in v2.2:
  ✅ FIXED: Read MONGODB_URI from environment variable (REQUIRED!)
  ✅ FIXED: Better error handling for DNS/connection issues
  ✅ ADDED: PYMONGO_AVAILABLE constant for import checking
  ✅ FIXED: Use camelCase field names to match Mongoose schema

HOW TO USE:
  Set MONGODB_URI environment variable before running!
  
  Windows:
    set MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ai_tax
  
  Linux/Mac:
    export MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ai_tax
  
  Or create a .env file in the python_service directory.

================================================================================
"""

import os
from typing import Optional, Dict, Any

# ============================================================
# CHECK IF PYMONGO IS AVAILABLE
# ============================================================
try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, ConfigurationError
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False
    MongoClient = None
    ConnectionFailure = Exception
    ServerSelectionTimeoutError = Exception
    ConfigurationError = Exception
    print("⚠️ pymongo not installed - MongoDB features disabled")

# ============================================================
# CONFIGURATION - LOCAL MONGODB DEFAULT
# ============================================================

# Try to load from .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    # Try multiple .env locations
    env_paths = [
        '.env',
        '../.env',
        '../../backend/.env',
        'C:/ai_tax/backend/.env',
        'C:/ai_tax/python_service/.env'
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            print(f"📁 Loaded .env from: {env_path}")
            break
except ImportError:
    pass  # python-dotenv not installed, use os.environ directly

# ✅ DEFAULT TO LOCAL MONGODB!
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ai_tax")

print(f"📡 MongoDB URI: {MONGODB_URI[:50]}...")

DATABASE_NAME = os.getenv("MONGODB_DATABASE", "ai_tax")

# ✅ CORRECT: Collection name matches Mongoose (lowercase, no underscore)
COLLECTION_NAME = "taxsessions"

# Global client (reused for connection pooling)
_client: Optional[MongoClient] = None
_db = None
_connection_failed = False
_connection_error = None


def get_mongodb_client() -> Optional[MongoClient]:
    """Get or create MongoDB client with connection pooling."""
    global _client, _connection_failed, _connection_error
    
    if not PYMONGO_AVAILABLE:
        raise ImportError("pymongo is not installed")
    
    if _connection_failed:
        # Don't retry if we already failed
        raise ConnectionError(f"MongoDB connection previously failed: {_connection_error}")
    
    if _client is None:
        try:
            # Only show first 50 chars of URI (hide password)
            safe_uri = MONGODB_URI[:50] + "..." if len(MONGODB_URI) > 50 else MONGODB_URI
            print(f"📡 Connecting to MongoDB: {safe_uri}")
            
            _client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=10000
            )
            
            # Test connection
            _client.admin.command('ping')
            print(f"✅ Connected to database: {DATABASE_NAME}")
            
        except ConfigurationError as e:
            _connection_failed = True
            _connection_error = str(e)
            print(f"❌ MongoDB configuration error: {e}")
            print("   This usually means the connection string is invalid or the cluster doesn't exist.")
            _client = None
            raise
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            _connection_failed = True
            _connection_error = str(e)
            print(f"❌ MongoDB connection failed: {e}")
            print("   Make sure MongoDB is running locally!")
            print("   Windows: net start MongoDB")
            print("   Or start MongoDB Compass")
            _client = None
            raise
            
        except Exception as e:
            _connection_failed = True
            _connection_error = str(e)
            print(f"❌ MongoDB error: {e}")
            _client = None
            raise
    
    return _client


def get_database():
    """Get the database instance."""
    global _db
    
    if not PYMONGO_AVAILABLE:
        raise ImportError("pymongo is not installed")
    
    if _db is None:
        client = get_mongodb_client()
        if client:
            _db = client[DATABASE_NAME]
    
    return _db


def get_collection():
    """Get the taxsessions collection."""
    db = get_database()
    if db is None:
        return None
    return db[COLLECTION_NAME]


# ============================================================
# MAIN FUNCTION: Get Session
# ============================================================
def get_session(user_id: str, tax_year: int = 2025) -> Optional[Dict[str, Any]]:
    """
    Get a tax session from MongoDB.
    
    ✅ FIXED: Uses camelCase field names to match Mongoose schema:
       - "userId" (not "user_id")
       - "taxYear" (not "tax_year")
    
    Args:
        user_id: The user ID (e.g., "user_1769353868618_5vbaosmun")
        tax_year: The tax year (default: 2025)
    
    Returns:
        The session document or None if not found
    """
    if not PYMONGO_AVAILABLE:
        print("⚠️ MongoDB not available - pymongo not installed")
        return None
    
    try:
        collection = get_collection()
        
        if collection is None:
            print("⚠️ Could not get MongoDB collection")
            return None
        
        # ✅ CORRECT: Use camelCase field names!
        query = {
            "userId": user_id,      # ✅ camelCase (not user_id)
            "taxYear": tax_year     # ✅ camelCase (not tax_year)
        }
        
        session = collection.find_one(query)
        
        if session:
            print(f"✅ Found session: {user_id}, year={tax_year}")
            print(f"   Messages: {len(session.get('messages', []))}")
            print(f"   Status: {session.get('status', 'unknown')}")
            return session
        else:
            print(f"❌ Session not found: {user_id}")
            # Debug: Show what's in the collection
            count = collection.count_documents({})
            print(f"   📊 Total documents in collection: {count}")
            return None
            
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        print(f"❌ MongoDB connection failed: {e}")
        return None
    except ConfigurationError as e:
        print(f"❌ MongoDB configuration error: {e}")
        return None
    except Exception as e:
        print(f"❌ MongoDB error: {e}")
        import traceback
        traceback.print_exc()
        return None


def update_session(user_id: str, tax_year: int, update_data: Dict[str, Any]) -> bool:
    """
    Update a tax session in MongoDB.
    
    Args:
        user_id: The user ID
        tax_year: The tax year
        update_data: Dictionary of fields to update
    
    Returns:
        True if successful, False otherwise
    """
    if not PYMONGO_AVAILABLE:
        print("⚠️ MongoDB not available")
        return False
    
    try:
        collection = get_collection()
        
        if collection is None:
            return False
        
        # ✅ CORRECT: Use camelCase field names!
        query = {
            "userId": user_id,
            "taxYear": tax_year
        }
        
        result = collection.update_one(
            query,
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


def get_all_sessions(tax_year: int = 2025, limit: int = 100) -> list:
    """
    Get all sessions for a tax year.
    
    Args:
        tax_year: The tax year
        limit: Maximum number of sessions to return
    
    Returns:
        List of session documents
    """
    if not PYMONGO_AVAILABLE:
        print("⚠️ MongoDB not available")
        return []
    
    try:
        collection = get_collection()
        
        if collection is None:
            return []
        
        # ✅ CORRECT: Use camelCase!
        query = {"taxYear": tax_year}
        
        sessions = list(collection.find(query).limit(limit))
        print(f"📋 Found {len(sessions)} sessions for year {tax_year}")
        
        return sessions
        
    except Exception as e:
        print(f"❌ MongoDB error: {e}")
        return []


def save_extraction_result(user_id: str, tax_year: int, extracted: Dict, tax_result: Dict, rag_verified: bool = False) -> bool:
    """
    Save extraction results back to MongoDB.
    
    Args:
        user_id: The user ID
        tax_year: The tax year
        extracted: Extracted data dictionary
        tax_result: Tax calculation result
        rag_verified: Whether RAG verification passed
    
    Returns:
        True if successful
    """
    if not PYMONGO_AVAILABLE:
        print("⚠️ MongoDB not available")
        return False
    
    try:
        collection = get_collection()
        
        if collection is None:
            return False
        
        from datetime import datetime
        
        update_data = {
            "extractedData": extracted,
            "taxCalculation": tax_result,
            "ragVerified": rag_verified,
            "status": "ready_for_review",
            "updatedAt": datetime.utcnow()
        }
        
        # ✅ CORRECT: Use camelCase!
        result = collection.update_one(
            {"userId": user_id, "taxYear": tax_year},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            print(f"✅ Saved extraction to MongoDB: {user_id}")
            return True
        else:
            print(f"⚠️ No session found to update: {user_id}")
            return False
            
    except Exception as e:
        print(f"❌ MongoDB save error: {e}")
        return False


# ============================================================
# TEST CONNECTION
# ============================================================
def test_connection() -> Dict[str, Any]:
    """Test MongoDB connection and return status."""
    if not PYMONGO_AVAILABLE:
        return {
            "success": False,
            "error": "pymongo not installed",
            "message": "MongoDB client not available"
        }
    
    try:
        client = get_mongodb_client()
        client.admin.command('ping')
        
        db = get_database()
        collection = get_collection()
        
        # Count documents
        count = collection.count_documents({})
        
        # Get sample document (for debugging)
        sample = collection.find_one({})
        sample_fields = list(sample.keys()) if sample else []
        
        return {
            "success": True,
            "uri": MONGODB_URI[:30] + "...",
            "database": DATABASE_NAME,
            "collection": COLLECTION_NAME,
            "document_count": count,
            "sample_fields": sample_fields,
            "message": "Connected successfully"
        }
        
    except Exception as e:
        return {
            "success": False,
            "uri": MONGODB_URI[:30] + "...",
            "error": str(e),
            "message": "Connection failed"
        }


# ============================================================
# DEBUG: List all user IDs in collection
# ============================================================
def list_user_ids(limit: int = 10) -> list:
    """List all user IDs in the collection (for debugging)."""
    if not PYMONGO_AVAILABLE:
        print("⚠️ MongoDB not available")
        return []
    
    try:
        collection = get_collection()
        
        if collection is None:
            return []
        
        # Get unique userIds
        user_ids = collection.distinct("userId")
        
        print(f"📋 Found {len(user_ids)} unique users")
        for uid in user_ids[:limit]:
            print(f"   - {uid}")
        
        return user_ids[:limit]
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []


# ============================================================
# INIT: Test on import
# ============================================================
if __name__ == "__main__":
    print("\n" + "="*50)
    print("🧪 Testing MongoDB Connection")
    print("="*50)
    print(f"📡 URI: {MONGODB_URI}")
    print("")
    
    if not PYMONGO_AVAILABLE:
        print("❌ pymongo not installed - run: pip install pymongo")
    else:
        result = test_connection()
        print(f"\n📊 Result: {result}")
        
        if result["success"]:
            print("\n📋 User IDs in database:")
            list_user_ids()