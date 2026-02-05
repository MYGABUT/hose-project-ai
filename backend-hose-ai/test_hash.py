
from app.core.security import get_password_hash, verify_password

try:
    pwd = "admin123"
    hashed = get_password_hash(pwd)
    print(f"✅ Hash Success: {hashed}")
    
    valid = verify_password(pwd, hashed)
    print(f"✅ Verify Success: {valid}")
except Exception as e:
    print(f"❌ Error: {e}")
