
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.database import DATABASE_URL
from app.models import JobOrder, JOLine

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("🔍 Inspecting JO-20260126-DB90E7...")
jo = db.query(JobOrder).filter(JobOrder.jo_number == "JO-20260126-DB90E7").first()

if not jo:
    print("❌ JO not found.")
else:
    print(f"✅ JO Found: ID {jo.id}")
    for line in jo.lines:
        print(f"   Line {line.line_number}: Product ID = {line.product_id}, Desc = {line.description}")
        if line.product_id is None:
            print("   ⚠️ WARNING: Product ID is None!")

print("\n🔍 Checking DB Schema for jo_lines.product_id...")
with engine.connect() as conn:
    try:
        result = conn.execute(text("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'jo_lines' AND column_name = 'product_id'"))
        row = result.fetchone()
        print(f"   Schema is_nullable: {row[0] if row else 'Unknown'}")
    except Exception as e:
        print(f"   Error checking schema: {e}")
