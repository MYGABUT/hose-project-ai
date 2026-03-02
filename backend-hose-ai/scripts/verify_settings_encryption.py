import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.models.system_settings import SystemSettings
from app.core.encryption import get_encryption_service

def verify_encryption():
    print("Verifying Settings Encryption...")
    
    # Connect as Superuser (or hose_app if granted SELECT)
    # Using hose_app credentials from .env which is now hose_app
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        s = db.query(SystemSettings).order_by(SystemSettings.id.desc()).first()
        if not s:
            print("❌ No settings found!")
            return
            
        print("✅ Settings found.")
        print(f"   Company: {s.company_profile.get('name')}")
        
        # Check Encryption Fields
        enc_service = get_encryption_service()
        
        if s.wa_api_key_enc:
            print(f"   WA Key Encrypted: {s.wa_api_key_enc[:10]}...")
            decrypted = enc_service.decrypt(s.wa_api_key_enc)
            print(f"   WA Key Decrypted: {decrypted}")
        else:
            print("   WA Key: (Empty/Not Set)")
            
        # TEST WRITE
        print("\n🧪 Testing Encryption Write...")
        test_secret = "SUPER_SECRET_KEY_123"
        encrypted = enc_service.encrypt(test_secret)
        s.wa_api_key_enc = encrypted
        db.commit()
        
        # Verify Read
        db.refresh(s)
        decrypted_check = enc_service.decrypt(s.wa_api_key_enc)
        print(f"   Original: {test_secret}")
        print(f"   Encrypted (DB): {s.wa_api_key_enc[:15]}...")
        print(f"   Decrypted: {decrypted_check}")
        
        if decrypted_check == test_secret:
            print("✅ Encryption Read/Write Success!")
        else:
            print("❌ Encryption Mismatch!")
        
    except Exception as e:
        print(f"❌ Verification Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_encryption()
