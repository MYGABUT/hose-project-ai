import requests
import json
import sys

URL = "http://localhost:8000/api/v1/batches/inbound"

payload = {
    "location_code": "WH1-STAGING-IN",
    "quantity": 10.5,
    "brand": "EATON",
    "standard": "R2",
    "size_inch": "1/2",
    "wire_type": "2 Wire",
    "source_type": "MANUAL",
    "ai_confidence": 95,
    "notes": "Debug Script Injection"
}

print(f"🚀 Sending POST request to {URL}...")
try:
    response = requests.post(URL, json=payload, timeout=10)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"❌ Request failed: {e}")
