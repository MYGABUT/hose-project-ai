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
LOCATION_ID_A = 1
BATCH_ID = None # Will come from inbound
SO_ID = None
SALESMAN_ID = None
INVOICE_ID = None

def print_step(title):
    print(f"\n{'='*70}\n👉 {title}\n{'='*70}")

def check_resp(resp, desc):
    if resp.status_code in [200, 201]:
        print(f"✅ {desc} Passed")
        return resp.json().get("data")
    else:
        print(f"❌ {desc} Failed: {resp.status_code} - {resp.text}")
        return None

def run_test():
    global TOKEN, HEADERS, PRODUCT_ID, BATCH_ID, SO_ID, SALESMAN_ID, INVOICE_ID

    print("🚀 STARTING EXPANDED SYSTEM VERIFICATION")
    
    # -------------------------------------------------------------
    # 1. AUTH & MASTER
    # -------------------------------------------------------------
    print_step("Step 1: Auth & Master Data")
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if resp.status_code != 200: return
    TOKEN = resp.json()["access_token"]
    HEADERS = {"Authorization": f"Bearer {TOKEN}"}
    
    products = requests.get(f"{BASE_URL}/products", headers=HEADERS).json()["data"]
    PRODUCT_ID = products[0]["id"]
    print(f"✅ Selected Product: {products[0]['name']}")

    # -------------------------------------------------------------
    # 2. INVENTORY BASE (Inbound)
    # -------------------------------------------------------------
    print_step("Step 2: Inventory Inbound")
    # Fetch Locations
    locs_resp = requests.get(f"{BASE_URL}/locations", headers=HEADERS)
    if locs_resp.status_code == 200:
        locs = locs_resp.json()["data"]
        # Filter for storage locations (not virtual/scrap if possible, but first one is ok for test)
        valid_loc = next((l["code"] for l in locs if "WH1" in l["code"]), locs[0]["code"])
        print(f"✅ Selected Location: {valid_loc}")
    else:
        print("❌ Failed to fetch locations")
        return

    payload = {
        "product_id": PRODUCT_ID,
        "location_code": valid_loc, 
        "quantity": 5000,
        "batch_number": f"EXPANDED-{random.randint(1000,9999)}",
        "source_type": "PURCHASE"
    }
    data = check_resp(requests.post(f"{BASE_URL}/batches/inbound", json=payload, headers=HEADERS), "Inbound Stock")
    if data: BATCH_ID = data["id"]


    # -------------------------------------------------------------
    # 2.5 MASTER: SUPPLIER
    # -------------------------------------------------------------
    print_step("Step 2.5: Create Supplier")
    supp_payload = {
        "name": "PT Supplier Utama",
        "email": "vendor@test.com", 
        "phone": "021-555555",
        "address": "Jakarta Industrial Park"
    }
    supp_data = check_resp(requests.post(f"{BASE_URL}/suppliers", json=supp_payload, headers=HEADERS), "Create Supplier")
    if supp_data:
        SUPPLIER_ID = supp_data["id"]
        print(f"✅ Supplier Created: {supp_data['name']} (ID: {SUPPLIER_ID})")
    else:
        print("❌ Failed to create supplier, using None")
        SUPPLIER_ID = None

    # -------------------------------------------------------------
    # 2.6 MASTER: CUSTOMER
    # -------------------------------------------------------------
    print_step("Step 2.6: Create Customer")
    cust_payload = {
        "name": "PT Project Client",
        "email": "client@project.com", 
        "phone": "081-111111",
        "address": "Jakarta Central"
    }
    cust_data = check_resp(requests.post(f"{BASE_URL}/customers", json=cust_payload, headers=HEADERS), "Create Customer")
    if cust_data:
        CUSTOMER_ID = cust_data["id"]
        print(f"✅ Customer Created: {cust_data['name']} (ID: {CUSTOMER_ID})")
    else:
        print("❌ Failed to create customer, using None")
        CUSTOMER_ID = 1 # Fallback

    # -------------------------------------------------------------
    # 3. PROCUREMENT (PR -> PO)
    # -------------------------------------------------------------
    print_step("Step 3: Procurement (PR -> PO)")
    # Create PR
    pr_payload = {
        "requested_by": "Manager",
        "supplier_id": SUPPLIER_ID,
        "supplier_name": supp_data['name'] if supp_data else "Unknown",
        "lines": [{
            "product_id": PRODUCT_ID,
            "product_name": "Testing Item", 
            "qty_requested": 100, 
            "estimated_price": 5000,
            "unit": "PCS"
        }]
    }
    pr_data = check_resp(requests.post(f"{BASE_URL}/pr", json=pr_payload, headers=HEADERS), "Create PR")
    if pr_data:
        pr_id = pr_data["id"]
        # Submit
        check_resp(requests.post(f"{BASE_URL}/pr/{pr_id}/submit", headers=HEADERS), "Submit PR")
        # Approve
        requests.post(f"{BASE_URL}/pr/{pr_id}/approve", json={"approved_by": "Bos"}, headers=HEADERS)
        # Convert
        po_data = check_resp(requests.post(f"{BASE_URL}/pr/{pr_id}/convert-to-po", headers=HEADERS), "Convert to PO")
        if po_data: print(f"   PO Created: {po_data['po']['po_number']}")

    # -------------------------------------------------------------
    # 4. PROJECTS (SPPD)
    # -------------------------------------------------------------
    print_step("Step 4: Projects & SPPD")
    proj_payload = {
        "customer_id": CUSTOMER_ID, 
        "name": "Installation Project X", 
        "start_date": datetime.now().strftime("%Y-%m-%d"),
        "total_value": 50000000
    }
    proj_data = check_resp(requests.post(f"{BASE_URL}/projects/", json=proj_payload, headers=HEADERS), "Create Project")
    if proj_data:
        pid = proj_data["id"]
        # SPPD
        sppd_payload = {
            "technician_name": "Tech A", 
            "destination": "Site B", 
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "end_date": datetime.now().strftime("%Y-%m-%d"),
            "transport_cost": 500000
        }
        check_resp(requests.post(f"{BASE_URL}/projects/{pid}/sppd", json=sppd_payload, headers=HEADERS), "Create SPPD")

    # -------------------------------------------------------------
    # 5. SALES & COMMISSION
    # -------------------------------------------------------------
    print_step("Step 5: Sales & Commission")
    # Create Salesman
    sales_payload = {
        "name": "Budi Salesman",
        "commission_rate": 2.5,
        "monthly_target": 100000000
    }
    sales_data = check_resp(requests.post(f"{BASE_URL}/salesmen", json=sales_payload, headers=HEADERS), "Create Salesman")
    if sales_data:
        SALESMAN_ID = sales_data["id"]

        # Create SO with Salesman
        so_payload = {
            "customer_name": "Commission Client",
            "salesman_id": SALESMAN_ID,
            "lines": [{"product_id": PRODUCT_ID, "qty": 10, "unit_price": 100000, "description": "Hose X"}]
        }
        so_data = check_resp(requests.post(f"{BASE_URL}/so", json=so_payload, headers=HEADERS), "Create SO with Salesman")
        if so_data:
            SO_ID = so_data["id"]
            requests.post(f"{BASE_URL}/so/{SO_ID}/confirm", headers=HEADERS)
            
            # Invoice (Assuming generic create needs SO link)
            # Standard Create Invoice usually takes SO ID or is created from Delivery. 
            # Let's try creating Invoice manually via `invoices` endpoint for now if possible, 
            # Or use DP endpoint which is easier to force invoice creation.
            # Using DP endpoint `so/{id}/create-dp`
            dp_resp = requests.post(f"{BASE_URL}/so/{SO_ID}/create-dp?amount=500000", headers=HEADERS)
            if dp_resp.status_code == 200:
                print("✅ DP Invoice Created")
                INVOICE_ID = dp_resp.json().get("invoice_id")
                
                # Pay Invoice
                pay_payload = {"invoice_id": INVOICE_ID, "amount": 500000, "payment_method": "CASH", "payment_date": datetime.now().strftime("%Y-%m-%d")}
                check_resp(requests.post(f"{BASE_URL}/payments", json=pay_payload, headers=HEADERS), "Pay Invoice")
                
                # Calculate Commission
                check_resp(requests.post(f"{BASE_URL}/salesmen/calculate-commission/{INVOICE_ID}", headers=HEADERS), "Calculate Commission")

    # -------------------------------------------------------------
    # 6. FINANCE: GIRO
    # -------------------------------------------------------------
    print_step("Step 6: Giro Mundur")
    giro_payload = {
        "giro_number": f"GR-{random.randint(100,999)}",
        "bank_name": "BCA",
        "amount": 1000000,
        "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        "customer_name": "Giro Client"
    }
    g_data = check_resp(requests.post(f"{BASE_URL}/giro", json=giro_payload, headers=HEADERS), "Receive Giro")
    if g_data:
        gid = g_data["id"]
        check_resp(requests.post(f"{BASE_URL}/giro/{gid}/deposit", headers=HEADERS), "Deposit Giro")

    # -------------------------------------------------------------
    # 7. INVENTORY: LOAN & BOOKING
    # -------------------------------------------------------------
    print_step("Step 7: Loan & Booking")
    # Booking
    if BATCH_ID:
        book_payload = {
            "product_id": PRODUCT_ID, "batch_id": BATCH_ID, 
            "qty": 50, "booked_by_name": "Test User", "customer_name": "Test Cust"
        }
        b_data = check_resp(requests.post(f"{BASE_URL}/bookings", json=book_payload, headers=HEADERS), "Stock Booking")
        if b_data:
            bid = b_data["id"]
            check_resp(requests.post(f"{BASE_URL}/bookings/{bid}/release", headers=HEADERS), "Release Booking")
            
        # Loan
        loan_payload = {
            "customer_id": 1, "customer_name": "Loan Cust", "due_date": "2026-12-31",
            "items": [{"product_id": PRODUCT_ID, "qty": 10, "batch_id": BATCH_ID}]
        }
        l_data = check_resp(requests.post(f"{BASE_URL}/loans", json=loan_payload, headers=HEADERS), "Create Loan")
        if l_data:
            lid = l_data["id"]
            # Return
            # Need item ID from response usually. 
            # Assuming list_loans gives item ids.
            pass # Skip concise return for now to avoid complexity in fetching IDs, mostly verify Create works.

    # -------------------------------------------------------------
    # 8. RMA
    # -------------------------------------------------------------
    print_step("Step 8: RMA")
    rma_payload = {"client": "RMA Cust", "invoice": "INV-001", "item": "Broken Hose", "qty": 1}
    check_resp(requests.post(f"{BASE_URL}/rma/rma", json=rma_payload, headers=HEADERS), "Create RMA Ticket")

    print("\n🎉 EXPANDED TEST SUITE COMPLETE")

if __name__ == "__main__":
    run_test()
