import sys
import os
from sqlalchemy import create_engine, text

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def verify():
    print("🕵️ Verifying RLS Policies...")
    
    # 1. Connect as 'hose_app' (Least Privilege User)
    # Construct URL manually using the new credentials
    # Original: postgresql://postgres:postgress@localhost:5432/hose_pro_db
    # New: postgresql://hose_app:TJycVY2_Ae09vsdtlVLLYg@localhost:5432/hose_pro_db
    
    # helper: parse original url
    from sqlalchemy.engine.url import make_url
    original_url = make_url(settings.DATABASE_URL)
    
    # hardcoded for this test based on previous step
    new_url = f"postgresql://hose_app:TJycVY2_Ae09vsdtlVLLYg@{original_url.host}:{original_url.port}/{original_url.database}"
    
    engine = create_engine(new_url)
    
    try:
        with engine.connect() as conn:
            print("✅ Connected as 'hose_app'")
            
            # 2. Get a valid Company ID (Companies table has NO RLS, so it should work)
            result = conn.execute(text("SELECT id, name FROM companies LIMIT 1")).fetchone()
            if not result:
                print("❌ No companies found. Cannot test.")
                return
            
            company_id = result[0]
            company_name = result[1]
            print(f"🏢 Found Company: {company_name} (ID: {company_id})")
            
            # 3. Test RLS on 'inventory_batches'
            print("\n🧪 Testing 'inventory_batches' isolation:")
            
            # A. Without Session Variable
            print("   Scenario A: No session variable set")
            try:
                count_a = conn.execute(text("SELECT COUNT(*) FROM inventory_batches")).scalar()
                print(f"   -> Rows visible: {count_a}")
                if count_a == 0:
                    print("   ✅ CORRECT (Should be 0)")
                else:
                    print("   ⚠️ WARNING: Rows visible without session var (Policy might be too loose or Superuser?)")
            except Exception as e:
                print(f"   ❌ Error: {e}")

            # B. With Valid Session Variable
            print(f"\n   Scenario B: Setting app.current_company_id = '{company_id}'")
            conn.execute(text(f"SET app.current_company_id = '{company_id}'"))
            
            count_b = conn.execute(text("SELECT COUNT(*) FROM inventory_batches")).scalar()
            print(f"   -> Rows visible: {count_b}")
            if count_b > 0:
                print("   ✅ CORRECT (Should see rows)")
            else:
                print("   ❓ NOTE: 0 rows found. Either table is empty or data belongs to another company.")
                
            # C. With Invalid Session Variable
            fake_id = 999999
            print(f"\n   Scenario C: Setting app.current_company_id = '{fake_id}'")
            conn.execute(text(f"SET app.current_company_id = '{fake_id}'"))
            
            count_c = conn.execute(text("SELECT COUNT(*) FROM inventory_batches")).scalar()
            print(f"   -> Rows visible: {count_c}")
            if count_c == 0:
                print("   ✅ CORRECT (Should be 0)")
            else:
                print("   ❌ FAILURE: Leaked rows from another company!")

    except Exception as e:
        print(f"🔥 Connection Failed or RLS Error: {e}")
        # Hint: check if pg_hba.conf allows password auth for hose_app
        # But locally usually 'trust' or 'md5' is on.

if __name__ == "__main__":
    verify()
