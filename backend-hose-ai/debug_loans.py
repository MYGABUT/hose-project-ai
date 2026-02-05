import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

def login():
    print("🔑 Logging in...")
    r = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin@hosepro.id", "password": "admin123"})
    if r.status_code == 200:
        token = r.json()["access_token"]
        print(f"✅ Login successful")
        return {"Authorization": f"Bearer {token}"}
    else:
        print(f"❌ Login failed: {r.text}")
        return None

def debug_loan_creation(headers):
    print("\n🐛 Debugging Loan Creation...")
    
    # 1. Get Batch Info
    print("   Checking Batch ID 1...")
    r = requests.get(f"{BASE_URL}/batches/1", headers=headers)
    if r.status_code != 200:
        print(f"   ⚠️ Batch 1 not found or error: {r.status_code} - {r.text}")
        print("   Trying to list batches to find a valid one...")
        r_list = requests.get(f"{BASE_URL}/batches", headers=headers)
        if r_list.status_code == 200:
            batches = r_list.json().get("data", [])
            if batches:
                batch_id = batches[0]["id"]
                print(f"   👉 Found Batch ID: {batch_id}")
            else:
                print("   ❌ No batches found. Cannot proceed.")
                return
        else:
             print("   ❌ Failed to list batches.")
             return
    else:
        batch_id = 1
        print(f"   ✅ Batch 1 found. Qty: {r.json()['data']['current_qty']}")

    # 2. Prepare Payload
    payload = {
        "customer_id": 1,
        "customer_name": "PT Project Client",
        "due_date": "2026-12-31",
        "notes": "Debug Loan",
        "items": [
            {
                "product_id": 1, # Assuming product 1 exists
                "batch_id": batch_id,
                "qty": 1
            }
        ]
    }
    
    print(f"   📤 Sending Payload: {json.dumps(payload, indent=2)}")
    
    # 3. Send Request
    r = requests.post(f"{BASE_URL}/loans", json=payload, headers=headers)
    
    print(f"\n   👉 Response Code: {r.status_code}")
    print(f"   👉 Response Body: {r.text}")

if __name__ == "__main__":
    headers = login()
    if headers:
        debug_loan_creation(headers)
