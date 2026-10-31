import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
print("Using API Key:", api_key[:8] + "..." if api_key else "NONE FOUND")

try:
    client = genai.Client(api_key=api_key)S
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents="Say hello",
    )
    print("\nSUCCESS! Gemini Response:", response.text)
except Exception as e:
    print("\nFAILED! Gemini Error:", e)