import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings

def debug_policy():
    print("Policy Debugger...")
    
    # 1. Check Policy Definition (as Superuser)
    su_engine = create_engine(settings.DATABASE_URL)
    with su_engine.connect() as conn:
        print("\nActive Policies on inventory_batches:")
        policies = conn.execute(text("SELECT polname, pg_get_expr(polqual, polrelid) as qual FROM pg_policy WHERE polrelid = 'inventory_batches'::regclass")).fetchall()
        for p in policies:
            print(f"   Name: {p[0]}")
            print(f"   Expr: {p[1]}")
            
    # 2. Check Session Variable Behavior (as hose_app)
    url = make_url(settings.DATABASE_URL)
    new_url = f"postgresql://hose_app:TJycVY2_Ae09vsdtlVLLYg@{url.host}:{url.port}/{url.database}"
    app_engine = create_engine(new_url)
    
    with app_engine.connect() as conn:
        print("\nTesting Session Variable:")
        
        # Initial State
        val = conn.execute(text("SELECT current_setting('app.current_company_id', true)")).scalar()
        print(f"   Initial Value: '{val}' (Type: {type(val)})")
        
        # Set Fake ID
        fake_id = 999999
        conn.execute(text(f"SET app.current_company_id = '{fake_id}'"))
        
        # Verify Set
        val_after = conn.execute(text("SELECT current_setting('app.current_company_id', true)")).scalar()
        print(f"   After SET '{fake_id}': '{val_after}'")
        
        # Check Visibility
        count = conn.execute(text("SELECT COUNT(*) FROM inventory_batches")).scalar()
        print(f"   Visible Rows: {count}")
        
        # Check Logic directly
        logic_check = conn.execute(text(f"SELECT (1 = current_setting('app.current_company_id', true)::integer) as match_check")).scalar()
        print(f"   Logic Check (1 == {val_after}?): {logic_check}")

if __name__ == "__main__":
    debug_policy()
