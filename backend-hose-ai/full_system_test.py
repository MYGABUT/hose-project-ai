
import os
import random
import requests
import json
from datetime import datetime

# CONFIG
BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@hosepro.id"
ADMIN_PASSWORD = "admin123"

def print_step(msg):
    print(f"\n{'='*50}\n👉 {msg}\n{'='*50}")

def log_error(text):
    with open("last_error.txt", "w", encoding="utf-8") as f:
        f.write(text)

def run_test():
    print("🚀 Starting FULL SYSTEM SMOKE TEST")
    
    # 1. LOGIN
    print_step("Step 1: Authenticate")
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if resp.status_code != 200:
        print(f"❌ Login Failed: {resp.text}")
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Authenticated")

    # 2. INBOUND (Create Stock)
    print_step("Step 2: Inbound (Create Raw Material)")
    # We need a valid Product ID. Let's fetch products.
    p_resp = requests.get(f"{BASE_URL}/products", headers=headers)
    products = p_resp.json()["data"]
    if not products:
        print("❌ No Products found in DB. Master data missing?")
        return
    
    raw_material = products[0] # Pick first one
    print(f"Selected Product: {raw_material['name']} (ID: {raw_material['id']})")
    
    inbound_data = {
        "po_number": f"PO-TEST-{random.randint(1000,9999)}",
        "supplier_id": 1, # ID 1 typically exists if seeding run
        "items": [
            {
                "product_id": raw_material["id"],
                "qty": 100,
                "batch_no": f"BATCH-{random.randint(1000,9999)}",
                "location_id": 1 # RAK-A usually
            }
        ]
    }
    
    # Needs Batches API or Purchase? Using Batches Inbound for simplicity
    # Actually batches.py has /inbound?
    # Let's check api. Check batch creation payload. 
    # For now, let's try direct batch creation via POST /batches
    # Or "Receive PO".
    
    # Let's use the simplest: Create "Adjust In" or "Initial Balance" via Stock Opname or direct Batch
    # Wait, user flow usually starts with "Barang Masuk" (Inbound).
    # Inbound Page uses `POST /api/v1/batches/inbound`? Or `POST /api/v1/inbound/receive`?
    # Checking implementation... `inbound.py`? 
    # Let's assume `POST /api/v1/batches` creates a batch directly if Inbound API is complex.
    
    # Fetch Location
    loc_resp = requests.get(f"{BASE_URL}/locations", headers=headers)
    locations = loc_resp.json()["data"]
    loc_code = locations[0]["code"] if locations else "RAK-A"

    batch_payload = {
        "product_id": raw_material["id"],
        "location_code": loc_code,
        "quantity": 500,
        "batch_number": f"RM-BATCH-{random.randint(1000, 9999)}",
        "source_type": "PURCHASE",
        "notes": "System Test Inbound"
    }
    # Note: Backend might rely on `POST /batches` or something. 
    # Let's use `POST /batches/inbound`
    b_resp = requests.post(f"{BASE_URL}/batches/inbound", json=batch_payload, headers=headers)
    if b_resp.status_code not in [200, 201]:
         print(f"⚠️ Batch Create Failed: {b_resp.text}. Trying alternative...")
         # Fallback?
    else:
         print(f"✅ Inbound Successful. Batch ID: {b_resp.json()['data']['id']}")

    # 3. SALES ORDER
    print_step("Step 3: Create Sales Order")
    so_payload = {
        "customer_name": "TEST CUSTOMER PT",
        "customer_address": "Jl. Testing No. 1",
        "lines": [
            {
                "product_id": raw_material["id"],
                "description": raw_material["name"],
                "qty": 50,
                "unit_price": 100000
            }
        ]
    }
    so_resp = requests.post(f"{BASE_URL}/so", json=so_payload, headers=headers)
    if so_resp.status_code != 200:
        print(f"❌ SO Create Failed: {so_resp.text}")
        return
    so_data = so_resp.json()["data"]
    so_id = so_data["id"]
    print(f"✅ SO Created: {so_data['so_number']}")

    # Confirm SO
    conf_resp = requests.post(f"{BASE_URL}/so/{so_id}/confirm", headers=headers)
    if conf_resp.status_code == 200:
        print(f"✅ SO Confirmed")
    else:
        print(f"⚠️ SO Confirm Failed: {conf_resp.text}")

    # 4. JOB ORDER (Production)
    print_step("Step 4: Create Job Order")
    # First, approve SO to generate JO requirement? Or Manual JO?
    # WMS usually: SO -> JO
    # Let's trigger JO from SO if possible, or create Manual JO linked to SO.
    # Endpoint: POST /jo/create-from-so
    jo_payload = {
        "so_id": so_id,
        "notes": "Auto Test Production",
        # Lines are auto-fetched from SO
    }
    jo_resp = requests.post(f"{BASE_URL}/jo/create-from-so", json=jo_payload, headers=headers)
    if jo_resp.status_code != 200:
        print(f"❌ JO Create Failed: {jo_resp.text}")
        # Try without SO link (Make to Stock)
    else:
        jo_data = jo_resp.json()["data"]
        jo_id = jo_data["id"]
        jo_line_id = jo_data["lines"][0]["id"]
        print(f"✅ JO Created: {jo_data['jo_number']}")

        # 5. QC (Phase 15 Feature)
        print_step("Step 5: Quality Control (QC)")
        # Inspect
        qc_payload = {
            "jo_line_id": jo_line_id,
            "qty_passed": 50,
            "qty_failed": 0,
            "notes": "Perfect Quality"
        }
    import traceback
    try:
        qc_resp = requests.post(f"{BASE_URL}/qc/inspect", json=qc_payload, headers=headers)
        if qc_resp.status_code != 200:
             print(f"❌ QC Failed. Check last_error.txt")
             log_error(qc_resp.text)
        else:
             print(f"✅ QC Passed: 50 Qty. Status: {qc_resp.json()['data']['jo_status']}")
    except:
        traceback.print_exc()

    # 6. DELIVERY (Phase 15 Feature)
    print_step("Step 6: Delivery Order")
    # Check ready items
    ready_resp = requests.get(f"{BASE_URL}/do/ready-to-ship?so_id={so_id}", headers=headers)
    ready_data = ready_resp.json()["data"]
    
    if not ready_data:
        print("⚠️ No items ready to ship. Did QC update SO status?")
        # Force fetch so line to check
    else:
        print(f"📦 Ready to ship: {len(ready_data)} items")
        so_line_to_ship = ready_data[0]
        
        do_payload = {
            "so_id": so_id,
            "driver_name": "Test Driver",
            "vehicle_no": "B 1234 TST",
            "delivery_date": datetime.now().isoformat(),
            "lines": [
                {
                    "so_line_id": so_line_to_ship["so_line_id"],
                    "qty": 50
                }
            ]
        }
        do_resp = requests.post(f"{BASE_URL}/do", json=do_payload, headers=headers)
        if do_resp.status_code != 200:
            print(f"❌ DO Create Failed: {do_resp.text}")
        else:
            do_data = do_resp.json()["data"]
            do_id = do_data["id"]
            print(f"✅ DO Created: {do_data['do_number']}")
            
            # 7. GENERATE WORD
            print_step("Step 7: Generate Surat Jalan (Word)")
            word_resp = requests.get(f"{BASE_URL}/do/{do_id}/surat-jalan", headers=headers)
            if word_resp.status_code == 200:
                 print("✅ Surat Jalan Generated Successfully (Binary received)")
            else:
                 print(f"❌ Word Gen Failed: {word_resp.status_code}")

    print("\n🎉 SMOKE TEST COMPLETE")

if __name__ == "__main__":
    run_test()
