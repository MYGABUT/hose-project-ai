import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

def print_step(msg):
    print(f"\n{'='*50}\n{msg}\n{'='*50}")

def print_json(data):
    print(json.dumps(data, indent=2))

def test_order_to_cash_flow():
    # 0. Stock Injection (Inbound)
    print_step("0. Stock Injection (Inbound)")
    inbound_payload = {
        "product_id": 1,
        "location_code": "WH1-HOSE-A01-L1", 
        "quantity": 100,
        "source_type": "MANUAL",
        "notes": "Integration Test Stock",
        "status": "AVAILABLE"
    }
    res = requests.post(f"{BASE_URL}/batches/inbound", json=inbound_payload)
    if res.status_code == 200:
        print("Stock Injected Successfully")
    else:
        print(f"Stock Injection Failed (Might already exist or loc missing): {res.text}")
        # We continue anyway, hoping stock exists.

    # 1. Create Sales Order
    print_step("1. Create Sales Order")
    so_payload = {
        "customer_name": "Integration Test Customer",
        "customer_phone": "08123456789",
        "customer_address": "Test Address",
        "required_date": "2026-12-31T00:00:00",
        "status": "DRAFT",
        "notes": "Integration Test Order",
        "lines": [
            {
                "product_id": 1, 
                "description": "Test Item",
                "qty": 5,
                "unit_price": 100000,
                "is_assembly": False
            }
        ]
    }
    
    res = requests.post(f"{BASE_URL}/so", json=so_payload)
    if res.status_code != 200:
        print(f"Failed to create SO: {res.text}")
        return
    
    so_data = res.json()["data"]
    so_id = so_data["id"]
    print(f"SO Created: {so_data['so_number']} (ID: {so_id})")
    
    # 2. Confirm SO
    print_step("2. Confirm Sales Order")
    res = requests.post(f"{BASE_URL}/so/{so_id}/confirm")
    if res.status_code != 200:
       print(f"Failed to confirm SO: {res.text}")
    else:
       print("SO Confirmed")

    # 2.5 Job Order / Production (Required to set qty_produced)
    print_step("2.5 Process Job Order (Picking/Production)")
    
    # Create JO
    jo_payload = {"so_id": so_id}
    res = requests.post(f"{BASE_URL}/jo/create-from-so", json=jo_payload)
    if res.status_code != 200:
        print(f"Failed to create JO: {res.text}")
        return
    jo_data = res.json()["data"]
    jo_id = jo_data["id"]
    print(f"JO Created: {jo_data['jo_number']} (ID: {jo_id})")
    
    # Start JO
    requests.post(f"{BASE_URL}/jo/{jo_id}/start")
    
    # Update Progress (Simulate Picking/Assembly)
    for line in jo_data["lines"]:
        progress_payload = {"qty_completed": line["qty_ordered"], "notes": "Auto-Test"}
        res = requests.post(f"{BASE_URL}/jo/{jo_id}/lines/{line['id']}/update-progress", json=progress_payload)
        if res.status_code != 200:
             print(f"Failed to update progress for line {line['id']}: {res.text}")
    
    # Complete JO
    res = requests.post(f"{BASE_URL}/jo/{jo_id}/complete")
    if res.status_code == 200:
        print("JO Completed (Qty Produced Updated)")
    else:
        print(f"Failed to complete JO: {res.text}")

    # 3. Create Delivery Order (Draft)
    print_step("3. Create Delivery Order (Draft)")
    # Get Ready Items first to get SO Line IDs
    res = requests.get(f"{BASE_URL}/do/ready-to-ship?so_id={so_id}")
    ready_items = res.json()["data"]
    
    if not ready_items:
        print("No items ready to ship! Auto-Assembly might be needed or stock missing.")
        # If trading item, it should be ready if stock exists.
        # If assembly, it needs production.
        return

    do_payload = {
        "so_id": so_id,
        "lines": [
            {
                "so_line_id": item["so_line_id"],
                "qty": item["qty_ready"],
                "notes": "Test DO Line"
            } for item in ready_items
        ],
        "driver_name": "Test Driver",
        "vehicle_no": "B 1234 TES"
    }
    
    res = requests.post(f"{BASE_URL}/do", json=do_payload)
    if res.status_code != 200:
        print(f"Failed to create DO: {res.text}")
        return
        
    do_data = res.json()["data"]
    do_id = do_data["id"]
    print(f"DO Created: {do_data['do_number']} (ID: {do_id})")

    # 4. Confirm & Dispatch DO
    print_step("4. Confirm & Dispatch DO")
    res = requests.post(f"{BASE_URL}/do/{do_id}/confirm")
    if res.status_code != 200:
        print(f"Failed to confirm DO: {res.text}")
        return
        
    res = requests.post(f"{BASE_URL}/do/{do_id}/dispatch")
    if res.status_code != 200:
        print(f"Failed to dispatch DO: {res.text}")
        return
        
    print("DO Dispatched")
    
    # 5. Complete DO (Deliver)
    print_step("5. Complete DO")
    res = requests.post(f"{BASE_URL}/do/{do_id}/complete")
    if res.status_code == 200:
        print("DO Completed (Delivered)")
    else:
        print(f"Failed to complete DO: {res.text}")
        return

    # 6. Create Invoice from DO (The New Feature!)
    print_step("6. Create Invoice from DO")
    inv_payload = {
        "due_days": 30,
        "include_tax": True,
        "notes": "Generated from Integration Test"
    }
    res = requests.post(f"{BASE_URL}/invoices/from-do/{do_id}", json=inv_payload)
    
    if res.status_code == 200:
        inv_data = res.json()["data"]
        print(f"SUCCESS! Invoice Created: {inv_data['invoice_number']}")
        print(f"Total Amount: {inv_data['total']}")
        print(f"Linked SO: {inv_data['so_number']}")
    else:
        print(f"FAILED to create Invoice: {res.text}")

if __name__ == "__main__":
    try:
        test_order_to_cash_flow()
    except Exception as e:
        print(f"Test Error: {e}")
