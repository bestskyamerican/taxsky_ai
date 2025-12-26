# cpa_assistant.py
# Copy this ENTIRE file to: C:\ai_tax\python_service\tax_engine\cpa_assistant.py

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# FIXED: Use actual OpenAI model name
MODEL = os.getenv("MODEL", "gpt-4o-mini")

def ask_cpa(question: str, tax_context: dict | None = None):
    """
    Use ChatGPT as Certified Public Accountant (CPA)
    """

    system_prompt = """
    You are a licensed CPA specializing in U.S. Federal and California state income tax.
    You must:
    - Ask missing questions
    - Explain IRS rules clearly
    - Provide refund/tax calculations when enough info is provided
    - Correct errors based on real IRS guidelines
    - Help user understand tax credits, deductions, and forms (W-2, 1099, 1098)
    
    IMPORTANT: Keep responses concise and practical. Ask one question at a time.
    """

    messages = [
        {"role": "system", "content": system_prompt}
    ]

    if tax_context:
        context_str = f"Current tax data: {tax_context}"
        messages.append({"role": "user", "content": context_str})

    messages.append({"role": "user", "content": question})

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=500
    )

    return response.choices[0].message.content