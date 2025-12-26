# tax_engine/refund.py
def estimate_refund(session):
    """
    Very basic placeholder refund calculator.
    Replace with real IRS logic later.
    """
    total_income = 0
    total_withheld = 0

    for doc in session.get("documents", []):
        data = doc.get("data", {})
        if doc["type"] == "W2":
            wages = float(data.get("wages", 0))
            federal = float(data.get("federal_withheld", 0))
            total_income += wages
            total_withheld += federal

        if doc["type"].startswith("1099"):
            income = float(data.get("amount", 0))
            federal = float(data.get("federal_withheld", 0))
            total_income += income
            total_withheld += federal

    # Very simple calculation: refund = withheld - flat tax 10%
    tax_owed = total_income * 0.10
    refund = total_withheld - tax_owed

    return round(refund, 2)
