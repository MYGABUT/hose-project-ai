import requests
import json
import random
from datetime import datetime, timedelta

# CONFIG
BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@hosepro.id"
ADMIN_PASSWORD = "admin123"

# GLOBAL STATE
TOKEN = None
HEADERS = {}
PRODUCT_ID = None
LOCATION_ID_A = 1 # RAK-A (Default from seed)
LOCATION_ID_B = 2 # RAK-B (Default from seed) or will fetch
BATCH_ID = None
SO_ID = None
INVOICE_ID = None

def print_step(msg):
    print(f"\n{'='*60}\n👉 {msg}\n{'='*60}")

def log_error(text):
    with open("comprehensive_test_error.txt", "a", encoding="utf-8") as f:
        f.write(f"\n{'='*20} {datetime.now().isoformat()} {'='*20}\n")
        f.write(text)

def run_test():
    global TOKEN, HEADERS, PRODUCT_ID, BATCH_ID, SO_ID, INVOICE_ID, LOCATION_ID_B

    print("🚀 Starting COMPREHENSIVE SYSTEM VERIFICATION")
    
    # ---------------------------------------------------------
    # 1. AUTHENTICATION
    # ---------------------------------------------------------
    print_step("Step 1: Authenticate")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if resp.status_code != 200:
            print(f"❌ Login Failed: {resp.text}")
            return
        TOKEN = resp.json()["access_token"]
        HEADERS = {"Authorization": f"Bearer {TOKEN}"}
        print("✅ Authenticated")
    except Exception as e:
        print(f"❌ Auth Error: {e}")
        return

    # ---------------------------------------------------------
    # 2. MASTER DATA CHECK
    # ---------------------------------------------------------
    print_step("Step 2: Check Master Data")
    try:
        # Products
        p_resp = requests.get(f"{BASE_URL}/products", headers=HEADERS)
        products = p_resp.json()["data"]
        if not products:
            print("❌ No Products found. Seed data missing.")
            return
        PRODUCT_ID = products[0]["id"]
        print(f"✅ Selected Product: {products[0]['name']} (ID: {PRODUCT_ID})")

        # Locations
        l_resp = requests.get(f"{BASE_URL}/locations", headers=HEADERS)
        locations = l_resp.json()["data"]
        if len(locations) < 2:
            print("❌ Need at least 2 locations for Transfer test.")
            return
        # Ensure we have IDs
        LOCATION_ID_A = locations[0]["id"]
        LOCATION_ID_B = locations[1]["id"]
        print(f"✅ Locations: {locations[0]['code']} -> {locations[1]['code']}")

    except Exception as e:
        print(f"❌ Master Data Error: {e}")
        return

    # ---------------------------------------------------------
    # 3. INVENTORY: INBOUND (Base Stock)
    # ---------------------------------------------------------
    print_step("Step 3: Inbound (Create Stock)")
    try:
        payload = {
            "product_id": PRODUCT_ID,
            "location_code": locations[0]["code"], # Use first loc
            "quantity": 1000,
            "batch_number": f"FULL-TEST-{random.randint(1000,9999)}",
            "source_type": "PURCHASE",
            "notes": "Comprehensive Test Stock"
        }
        resp = requests.post(f"{BASE_URL}/batches/inbound", json=payload, headers=HEADERS)
        if resp.status_code not in [200, 201]:
            print(f"❌ Inbound Failed: {resp.text}")
            log_error(resp.text)
            return
        BATCH_ID = resp.json()["data"]["id"]
        print(f"✅ Stock Created. Batch ID: {BATCH_ID}")
    except Exception as e:
        print(f"❌ Inbound Error: {e}")
        return

    # ---------------------------------------------------------
    # 4. INVENTORY: WAREHOUSE TRANSFER
    # ---------------------------------------------------------
    print_step("Step 4: Warehouse Transfer (Req -> Appr -> Ship -> Recv)")
    try:
        # A. Request
        req_payload = {
            "from_location_id": LOCATION_ID_A,
            "to_location_id": LOCATION_ID_B,
            "items": [
                {"product_id": PRODUCT_ID, "qty": 100, "notes": "Test Transfer"}
            ],
            "notes": "Moving stock to Loc B"
        }
        resp = requests.post(f"{BASE_URL}/warehouse-transfer/request", json=req_payload, headers=HEADERS)
        if resp.status_code != 200:
             print(f"❌ Transfer Request Failed: {resp.text}")
             log_error(resp.text)
        else:
             transfer_id = resp.json()["data"]["id"]
             print(f"  - Request created: ID {transfer_id}")
             
             # B. Approve
             resp = requests.post(f"{BASE_URL}/warehouse-transfer/{transfer_id}/approve", headers=HEADERS)
             if resp.status_code == 200:
                 print("  - Approved")
             else:
                 print(f"❌ Approve Failed: {resp.text}")

             # C. Ship
             # Need to specify batch to pick from? Or auto-FIFO?
             # Endpoint typically needs batch selection if stricter. 
             # Assuming auto-pick or generic logic for now based on implementation plan.
             # Wait, `warehouse_transfer.py` might implement logic. 
             # Let's try simple endpoint.
             resp = requests.post(f"{BASE_URL}/warehouse-transfer/{transfer_id}/ship", headers=HEADERS)
             if resp.status_code == 200:
                 print("  - Shipped")
             else:
                 print(f"❌ Ship Failed: {resp.text}")

             # D. Receive
             resp = requests.post(f"{BASE_URL}/warehouse-transfer/{transfer_id}/receive", headers=HEADERS)
             if resp.status_code == 200:
                 print("✅ Transfer Cycle Complete")
             else:
                 print(f"❌ Receive Failed: {resp.text}")

    except Exception as e:
        print(f"❌ Transfer Error: {e}")

    # ---------------------------------------------------------
    # 5. INVENTORY: STOCK OPNAME (Scope Based)
    # ---------------------------------------------------------
    print_step("Step 5: Stock Opname (Scope: Location A)")
    try:
        # A. Start Session
        start_payload = {
            "scope_type": "LOCATION",
            "scope_value": LOCATION_ID_A,
            "notes": "Test Opname"
        }
        resp = requests.post(f"{BASE_URL}/opname/start", json=start_payload, headers=HEADERS)
        if resp.status_code != 200:
             print(f"❌ Opname Start Failed: {resp.text}")
        else:
             opname_id = resp.json()["data"]["id"]
             print(f"  - Session Started: ID {opname_id}")
             
             # B. Submit Result (Count 900, should be 900 left after transfer)
             # Wait, we started with 1000, transferred 100. So 900 rem in A.
             # Let's count 899 (variance -1)
             submit_payload = {
                 "items": [
                     {"product_id": PRODUCT_ID, "qty_actual": 899}
                 ]
             }
             resp = requests.post(f"{BASE_URL}/opname/{opname_id}/submit", json=submit_payload, headers=HEADERS)
             if resp.status_code == 200:
                 print("  - Results Submitted")
                 
                 # C. Finalize/Adjust
                 resp = requests.post(f"{BASE_URL}/opname/{opname_id}/finalize", headers=HEADERS)
                 if resp.status_code == 200:
                     print("✅ Opname Finalized (Variance Adjusted)")
                 else:
                     print(f"❌ Opname Finalize Failed: {resp.text}")
             else:
                 print(f"❌ Opname Submit Failed: {resp.text}")

    except Exception as e:
        print(f"❌ Opname Error: {e}")

    # ---------------------------------------------------------
    # 6. FINANCE: PETTY CASH
    # ---------------------------------------------------------
    print_step("Step 6: Petty Cash")
    try:
        # Top Up First
        topup_payload = {"amount": 1000000, "description": "Initial Capital"}
        resp = requests.post(f"{BASE_URL}/petty-cash/topup", json=topup_payload, headers=HEADERS)
        if resp.status_code == 200:
             print(f"✅ Petty Cash Top Up: {1000000}")
        else:
             print(f"❌ Top Up Failed: {resp.text}")

        # Create Expense
        pc_payload = {
            "amount": 50000,
            "category": "MEALS",
            "description": "Team Lunch",
            "transaction_type": "OUT"
        }
        resp = requests.post(f"{BASE_URL}/petty-cash/expense", json=pc_payload, headers=HEADERS)
        if resp.status_code in [200, 201]:
             print(f"✅ Petty Cash Recorded: {resp.json()['data']['transaction_number']}")
        else:
             print(f"❌ Petty Cash Failed: {resp.text}")
             log_error(resp.text)
    except Exception as e:
        print(f"❌ Petty Cash Error: {e}")

    # ---------------------------------------------------------
    # 7. FINANCE: FIXED ASSETS
    # ---------------------------------------------------------
    print_step("Step 7: Fixed Assets")
    try:
        asset_payload = {
            "name": "New Laptop",
            "category": "COMPUTER",
            "purchase_value": 15000000,
            "purchase_date": datetime.now().strftime("%Y-%m-%d"),
            "useful_life_months": 36
        }
        resp = requests.post(f"{BASE_URL}/assets", json=asset_payload, headers=HEADERS)
        if resp.status_code in [200, 201]:
             asset_id = resp.json()["data"]["id"]
             print(f"  - Asset Created: ID {asset_id}")
             
             # Run Depreciation
             resp = requests.post(f"{BASE_URL}/assets/calculate-depreciation", headers=HEADERS)
             if resp.status_code == 200:
                 print("✅ Depreciation Calculated")
             else:
                 print(f"❌ Depreciation Failed: {resp.text}")
        else:
             print(f"❌ Asset Creation Failed: {resp.text}")
    except Exception as e:
        print(f"❌ Asset Error: {e}")
        
    # ---------------------------------------------------------
    # 8. SALES & FINANCE: INVOICING (From Direct SO)
    # ---------------------------------------------------------
    print_step("Step 8: Sales -> Invoice -> Payment")
    try:
        # Create SO
        so_payload = {
            "customer_name": "Cash Client",
            "lines": [{"product_id": PRODUCT_ID, "qty": 10, "unit_price": 50000}]
        }
        resp = requests.post(f"{BASE_URL}/so", json=so_payload, headers=HEADERS)
        if resp.status_code == 200:
            so_id = resp.json()["data"]["id"]
            # Confirm
            requests.post(f"{BASE_URL}/so/{so_id}/confirm", headers=HEADERS)
            
            # Create Invoice directly (Short circuit DO for this test)
            inv_payload = {
                "so_id": so_id,
                "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            }
            # Check Invoice Endpoint (might normally require DO, but let's see if SO direct works or we need DO)
            # Usually Invoice is from DO. But some systems allow Invoice from SO.
            # Let's try `POST /invoices/create-from-so` if exists, or `create` with source.
            # Assessing endpoint... defaulting to generic create.
            
            # Actually, `delivery_orders.py` usually handles flow. 
            # Let's try create Invoice generic.
            resp = requests.post(f"{BASE_URL}/invoices", json=inv_payload, headers=HEADERS)
            if resp.status_code in [200, 201]:
                inv_id = resp.json()["data"]["id"]
                print(f"  - Invoice Created: ID {inv_id}")
                
                # Payment
                pay_payload = {
                    "invoice_id": inv_id,
                    "amount": 500000,
                    "payment_method": "TRANSFER",
                    "payment_date": datetime.now().strftime("%Y-%m-%d")
                }
                resp = requests.post(f"{BASE_URL}/payments", json=pay_payload, headers=HEADERS)
                if resp.status_code in [200, 201]:
                    print("✅ Payment Recorded")
                else:
                    print(f"❌ Payment Failed: {resp.text}")
            else:
                 print(f"⚠️ Invoice Create (Direct SO) Failed: {resp.text}. Might require DO first.")
    except Exception as e:
        print(f"❌ Finance Error: {e}")

    print("\n🎉 COMPREHENSIVE TEST COMPLETE")

if __name__ == "__main__":
    run_test()
