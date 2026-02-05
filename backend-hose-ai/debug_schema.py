
from app.models.customer import Customer
from sqlalchemy.inspection import inspect

print("🔍 Inspecting Customer Model...")
inst = inspect(Customer)
for col in inst.columns:
    print(f" - {col.name}: {col.type}")

if 'sales_target' in inst.columns:
    print("⚠️ Found 'sales_target' in Customer model definition!")
else:
    print("✅ 'sales_target' NOT found in Customer model definition.")
