#!/usr/bin/env python3
"""
================================================================================
TAXSKY DATA FIX SCRIPT - For taxskyai.com
================================================================================
Run this script to fix the field name mismatch bug for existing users.

Usage:
    python fix_user_data.py                           # Check all users
    python fix_user_data.py user_1768797864971_s1pijfdzy  # Check specific user
    python fix_user_data.py user_1768797864971_s1pijfdzy --fix  # Fix specific user
    python fix_user_data.py --fix-all                 # Fix ALL users (careful!)

================================================================================
"""

import re
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

# ============================================================
# MongoDB Connection - Your DigitalOcean MongoDB
# ============================================================
MONGO_URI = "mongodb+srv://doadmin:9mb0I2r13P485ETp@db-mongodb-nyc3-29782-5b577e4b.mongo.ondigitalocean.com/ai_tax?authSource=admin&tls=true"

try:
    from pymongo import MongoClient
    PYMONGO_AVAILABLE = True
except ImportError:
    print("❌ pymongo not installed!")
    print("   Run: pip install pymongo")
    sys.exit(1)


def get_db():
    """Connect to MongoDB."""
    client = MongoClient(MONGO_URI)
    return client.ai_tax


def parse_amount(text: str) -> int:
    """Extract dollar amount from text."""
    if not text:
        return 0
    cleaned = re.sub(r'[$,]', '', str(text))
    match = re.search(r'-?\d+\.?\d*', cleaned)
    return int(float(match.group())) if match else 0


# ============================================================
# FIXED find_final_summary - handles both field formats
# ============================================================
def find_final_summary(messages: List[Dict]) -> str:
    """Find the final summary message - FIXED version."""
    for msg in reversed(messages):
        # ✅ Accept both "sender" (legacy) and "role" (frontend)
        sender = msg.get("sender") or msg.get("role")
        if sender == "assistant":
            # ✅ Accept both "text" (legacy) and "content" (frontend)
            text = msg.get("text") or msg.get("content", "")
            if any(indicator in text.lower() for indicator in [
                "complete summary",
                "here's your complete summary", 
                "is everything correct",
            ]) or "═══" in text:
                if len(text) > 200:
                    return text
    
    # Fallback: combine all assistant messages
    return "\n".join(
        msg.get("text") or msg.get("content", "")
        for msg in messages 
        if (msg.get("sender") or msg.get("role")) == "assistant"
    )


def extract_from_summary(summary: str) -> Dict[str, Any]:
    """Extract tax data from summary text."""
    extracted = {}
    
    # Filing Status
    fs_match = re.search(r"Filing Status[:\s]+([A-Za-z\s]+?)(?:\s{2,}|\n|$)", summary, re.IGNORECASE)
    if fs_match:
        status = fs_match.group(1).strip().lower()
        if "joint" in status:
            extracted["filing_status"] = "married_filing_jointly"
        elif "separate" in status:
            extracted["filing_status"] = "married_filing_separately"
        elif "head" in status:
            extracted["filing_status"] = "head_of_household"
        else:
            extracted["filing_status"] = "single"
    
    # Taxpayer W-2 (sum all)
    total_wages = 0
    total_fed = 0
    for m in re.finditer(r"•\s*Taxpayer W-2 #\d+ Wages[:\s]+\$?([\d,]+)", summary, re.IGNORECASE):
        total_wages += parse_amount(m.group(1))
    for m in re.finditer(r"•\s*Taxpayer W-2 #\d+ Federal Withheld[:\s]+\$?([\d,]+)", summary, re.IGNORECASE):
        total_fed += parse_amount(m.group(1))
    
    if total_wages > 0:
        extracted["taxpayer_wages"] = total_wages
        extracted["taxpayer_federal_withheld"] = total_fed
    
    # Spouse W-2 (sum all)
    spouse_wages = 0
    spouse_fed = 0
    for m in re.finditer(r"•\s*Spouse W-2 #\d+ Wages[:\s]+\$?([\d,]+)", summary, re.IGNORECASE):
        spouse_wages += parse_amount(m.group(1))
    for m in re.finditer(r"•\s*Spouse W-2 #\d+ Federal Withheld[:\s]+\$?([\d,]+)", summary, re.IGNORECASE):
        spouse_fed += parse_amount(m.group(1))
    
    if spouse_wages > 0:
        extracted["spouse_wages"] = spouse_wages
        extracted["spouse_federal_withheld"] = spouse_fed
    
    # IRA contributions
    ira_match = re.search(r"•\s*(?:Taxpayer|Your)\s*IRA[:\s]+\$?([\d,]+)", summary, re.IGNORECASE)
    if ira_match:
        extracted["taxpayer_ira"] = parse_amount(ira_match.group(1))
    
    spouse_ira = re.search(r"•\s*Spouse\s*IRA[:\s]+\$?([\d,]+)", summary, re.IGNORECASE)
    if spouse_ira:
        extracted["spouse_ira"] = parse_amount(spouse_ira.group(1))
    
    return extracted


def check_user(user_id: str, tax_year: int = 2025) -> Dict:
    """Check if a user's data needs fixing."""
    db = get_db()
    
    session = db.taxsessions.find_one({
        "userId": user_id,
        "taxYear": tax_year
    })
    
    if not session:
        session = db.taxsessions.find_one({"userId": user_id})
    
    if not session:
        return {"error": f"Session not found for {user_id}"}
    
    messages = session.get("messages", []) or session.get("conversation_history", [])
    
    if not messages:
        return {"error": "No messages in session"}
    
    # Current data in DB
    db_data = {
        "taxpayer_wages": session.get("taxpayer_wages", 0) or 0,
        "spouse_wages": session.get("spouse_wages", 0) or 0,
        "taxpayer_federal_withheld": session.get("taxpayer_federal_withheld", 0) or 0,
        "spouse_federal_withheld": session.get("spouse_federal_withheld", 0) or 0,
        "taxpayer_ira": session.get("taxpayer_ira", 0) or 0,
        "spouse_ira": session.get("spouse_ira", 0) or 0,
        "total_wages": session.get("total_wages", 0) or 0,
    }
    
    # Extract from messages using FIXED method
    summary = find_final_summary(messages)
    extracted = extract_from_summary(summary)
    
    # Find differences
    diffs = {}
    for key in ["taxpayer_wages", "spouse_wages", "taxpayer_federal_withheld", 
                "spouse_federal_withheld", "taxpayer_ira", "spouse_ira"]:
        db_val = db_data.get(key, 0)
        ext_val = extracted.get(key, 0)
        if db_val != ext_val:
            diffs[key] = {"db": db_val, "should_be": ext_val}
    
    return {
        "user_id": user_id,
        "message_count": len(messages),
        "summary_length": len(summary),
        "db_data": db_data,
        "extracted": extracted,
        "differences": diffs,
        "needs_fix": len(diffs) > 0
    }


def fix_user(user_id: str, tax_year: int = 2025) -> Dict:
    """Fix a user's data."""
    result = check_user(user_id, tax_year)
    
    if "error" in result:
        return result
    
    if not result.get("needs_fix"):
        return {"message": "No fix needed", "user_id": user_id}
    
    db = get_db()
    extracted = result["extracted"]
    
    # Calculate totals
    total_wages = extracted.get("taxpayer_wages", 0) + extracted.get("spouse_wages", 0)
    total_withheld = extracted.get("taxpayer_federal_withheld", 0) + extracted.get("spouse_federal_withheld", 0)
    total_ira = extracted.get("taxpayer_ira", 0) + extracted.get("spouse_ira", 0)
    
    # Update MongoDB
    update_data = {
        "taxpayer_wages": extracted.get("taxpayer_wages", 0),
        "spouse_wages": extracted.get("spouse_wages", 0),
        "taxpayer_federal_withheld": extracted.get("taxpayer_federal_withheld", 0),
        "spouse_federal_withheld": extracted.get("spouse_federal_withheld", 0),
        "taxpayer_ira": extracted.get("taxpayer_ira", 0),
        "spouse_ira": extracted.get("spouse_ira", 0),
        "total_wages": total_wages,
        "total_withheld": total_withheld,
        "ira_contributions": total_ira,
        "data_fixed": True,
        "fixed_at": datetime.utcnow(),
        "fix_version": "v18.2-FIXED",
    }
    
    db.taxsessions.update_one(
        {"userId": user_id, "taxYear": tax_year},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "user_id": user_id,
        "fixed_fields": list(result["differences"].keys()),
        "new_data": update_data
    }


def list_users_needing_fix(tax_year: int = 2025, limit: int = 50) -> List[Dict]:
    """Find all users that need fixing."""
    db = get_db()
    
    sessions = db.taxsessions.find({"taxYear": tax_year}).limit(limit)
    
    users_needing_fix = []
    
    for session in sessions:
        user_id = session.get("userId")
        result = check_user(user_id, tax_year)
        
        if result.get("needs_fix"):
            users_needing_fix.append({
                "user_id": user_id,
                "differences": result.get("differences", {})
            })
    
    return users_needing_fix


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 TAXSKY DATA FIX SCRIPT")
    print("=" * 60)
    
    if len(sys.argv) < 2:
        # List users needing fix
        print("\n📋 Checking users that need fixing...")
        users = list_users_needing_fix(limit=20)
        
        if not users:
            print("✅ No users need fixing!")
        else:
            print(f"\n⚠️ Found {len(users)} users needing fix:\n")
            for u in users:
                print(f"   • {u['user_id']}")
                for field, diff in u['differences'].items():
                    print(f"      {field}: {diff['db']} → {diff['should_be']}")
            
            print(f"\nRun: python {sys.argv[0]} <user_id> --fix")
    
    elif sys.argv[1] == "--fix-all":
        # Fix all users
        print("\n⚠️ FIXING ALL USERS...")
        users = list_users_needing_fix(limit=100)
        
        for u in users:
            result = fix_user(u['user_id'])
            if result.get("success"):
                print(f"   ✅ Fixed: {u['user_id']}")
            else:
                print(f"   ❌ Failed: {u['user_id']} - {result.get('error', 'unknown')}")
        
        print(f"\n✅ Fixed {len(users)} users")
    
    else:
        user_id = sys.argv[1]
        do_fix = "--fix" in sys.argv
        
        if do_fix:
            print(f"\n🔧 Fixing user: {user_id}")
            result = fix_user(user_id)
            
            if result.get("success"):
                print(f"\n✅ FIXED!")
                print(f"   Fixed fields: {result.get('fixed_fields')}")
                for key, val in result.get("new_data", {}).items():
                    if key not in ["data_fixed", "fixed_at", "fix_version"]:
                        print(f"   {key}: {val}")
            else:
                print(f"\n{result.get('message', result.get('error', 'Unknown error'))}")
        else:
            print(f"\n🔍 Checking user: {user_id}")
            result = check_user(user_id)
            
            if "error" in result:
                print(f"\n❌ {result['error']}")
            else:
                print(f"\n📊 Current data in MongoDB:")
                for key, val in result["db_data"].items():
                    print(f"   {key}: ${val:,}")
                
                print(f"\n📊 Extracted from messages:")
                for key, val in result["extracted"].items():
                    print(f"   {key}: ${val:,}")
                
                if result["needs_fix"]:
                    print(f"\n⚠️ NEEDS FIX! Differences:")
                    for field, diff in result["differences"].items():
                        print(f"   {field}: ${diff['db']:,} → ${diff['should_be']:,}")
                    print(f"\nRun: python {sys.argv[0]} {user_id} --fix")
                else:
                    print(f"\n✅ Data is correct!")
