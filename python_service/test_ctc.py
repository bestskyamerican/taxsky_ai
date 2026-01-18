#!/usr/bin/env python3
# ============================================================
# TEST SCRIPT - Run from C:\ai_tax\python_service\
# ============================================================
# Run: cd C:\ai_tax\python_service
#      python test_ctc.py
# ============================================================

import json
import sys

# Import from your actual module path
try:
    from tax_engine.calculate_cli import fallback_calculate_tax
    print("✅ Imported from tax_engine.calculate_cli")
except ImportError:
    try:
        # Try direct import if running from tax_engine folder
        from calculate_cli import fallback_calculate_tax
        print("✅ Imported from calculate_cli (direct)")
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("\nMake sure you're running from: C:\\ai_tax\\python_service\\")
        print("Or from: C:\\ai_tax\\python_service\\tax_engine\\")
        sys.exit(1)

def test(name, data, expected_ctc):
    """Run a single test"""
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}")
    
    result = fallback_calculate_tax(data)
    
    actual_ctc = result['federal']['child_tax_credit']
    validation = result['federal'].get('ctc_validation', 'N/A')
    refund = result['federal']['refund']
    
    print(f"  Input: has_dependents={data.get('has_dependents')}, dependents={data.get('dependents', [])}")
    print(f"  CTC: ${actual_ctc}")
    print(f"  Validation: {validation}")
    print(f"  Federal Refund: ${refund}")
    
    if actual_ctc == expected_ctc:
        print(f"  ✅ PASSED")
        return True
    else:
        print(f"  ❌ FAILED - Expected ${expected_ctc}, got ${actual_ctc}")
        return False

def main():
    print("="*60)
    print("🧪 CTC FIX VERIFICATION")
    print("="*60)
    
    passed = 0
    failed = 0
    
    # TEST 1: User says NO dependents
    if test(
        "User explicitly says NO dependents",
        {
            "filing_status": "married_filing_jointly",
            "wages": 50000,
            "federal_withholding": 5000,
            "has_dependents": False,
            "dependents": [],
            "state": "CA"
        },
        expected_ctc=0
    ):
        passed += 1
    else:
        failed += 1
    
    # TEST 2: User has 2 children
    if test(
        "User has 2 children under 17",
        {
            "filing_status": "married_filing_jointly",
            "wages": 50000,
            "federal_withholding": 5000,
            "has_dependents": True,
            "dependents": [
                {"name": "Child 1", "age": 8},
                {"name": "Child 2", "age": 12}
            ],
            "state": "CA"
        },
        expected_ctc=5400
    ):
        passed += 1
    else:
        failed += 1
    
    # TEST 3: Empty dependents array
    if test(
        "Empty dependents array",
        {
            "filing_status": "single",
            "wages": 40000,
            "federal_withholding": 4000,
            "dependents": [],
            "state": "CA"
        },
        expected_ctc=0
    ):
        passed += 1
    else:
        failed += 1
    
    # TEST 4: Bug scenario
    if test(
        "BUG FIX: Legacy field but has_dependents=false",
        {
            "filing_status": "married_filing_jointly",
            "wages": 50000,
            "federal_withholding": 5000,
            "qualifying_children_under_17": 2,
            "has_dependents": False,
            "state": "CA"
        },
        expected_ctc=0
    ):
        passed += 1
    else:
        failed += 1
    
    # TEST 5: Real scenario
    print(f"\n{'='*60}")
    print("TEST 5: Real scenario - MFJ $23,500 wages, NO dependents")
    print("="*60)
    
    result = fallback_calculate_tax({
        "filing_status": "married_filing_jointly",
        "wages": 23500,
        "federal_withholding": 1500,
        "state_withholding": 800,
        "ira_contributions": 16000,
        "has_dependents": False,
        "dependents": [],
        "state": "CA"
    })
    
    print(f"\nResult:")
    print(f"  AGI: ${result['federal']['agi']}")
    print(f"  Child Tax Credit: ${result['federal']['child_tax_credit']}")
    print(f"  CTC Validation: {result['federal']['ctc_validation']}")
    print(f"  EITC: ${result['federal']['eitc']}")
    print(f"  Federal Refund: ${result['federal']['refund']}")
    print(f"  State Refund: ${result['state']['refund'] if result['state'] else 0}")
    print(f"  TOTAL REFUND: ${result['total_refund']}")
    
    if result['federal']['child_tax_credit'] == 0:
        passed += 1
        print(f"\n  ✅ PASSED")
    else:
        failed += 1
        print(f"\n  ❌ FAILED")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("="*60)
    
    if failed == 0:
        print("🎉 ALL TESTS PASSED!")
    else:
        print("❌ SOME TESTS FAILED!")
    
    return failed

if __name__ == "__main__":
    sys.exit(main())