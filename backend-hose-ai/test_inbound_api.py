import requests
import json

def test_inbound():
    url = "http://localhost:8000/api/v1/batches/inbound"
    payload = {
        "brand": "EATON",
        "standard": "R2",
        "size_inch": "1/2",
        "lengthMeter": 50,
        "quantity": 50,
        "location_code": "WH1-STAGING-IN", # Ensure this location exists in DB seeds or standard
        "source_type": "MANUAL",
        "received_by": "tester"
    }
    
    print(f"🚀 Sending POST request to {url}...")
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ API Test PASSED")
        else:
            print("❌ API Test FAILED")
            
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    test_inbound()
