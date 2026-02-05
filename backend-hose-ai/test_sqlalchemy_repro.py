import os
import sys
from app.core.database import SessionLocal
from app.models.product import Product, ProductCategory, ProductUnit

def test_sqlalchemy():
    print("Testing SQLAlchemy ORM Query...")
    db = SessionLocal()
    try:
        # 1. Test Select by SKU
        print("  1. Querying by SKU...")
        sku = "HOSE-TEST-001"
        try:
            p = db.query(Product).filter(Product.sku == sku).first()
            print(f"     Query 1 Success. Result: {p}")
        except Exception as e:
            print(f"     Query 1 Failed: {e}")

        # 2. Test Create Product
        print("\n  2. Testing Product Creation (Simulation)...")
        try:
            new_sku = "HOSE-SQLALCHEMY-TEST"
            # Check if exists first to avoid unique constraint
            existing = db.query(Product).filter(Product.sku == new_sku).first()
            if existing:
                print("     Product already exists, skipping creation.")
            else:
                new_product = Product(
                    sku=new_sku,
                    name="Test Product SQLAlchemy",
                    brand="TESTBRAND",
                    # Note: using strings here because we set native_enum=False? 
                    # Actually with native_enum=False, we should pass Enum objects, 
                    # and SQLAlchemy handles the conversion to string for the DB.
                    # BUT wait, I made the previous fix to pass .value in batches.py!
                    # Let's try passing Enum objects first as is standard.
                    category=ProductCategory.HOSE, 
                    unit=ProductUnit.METER,
                    specifications={}
                )
                db.add(new_product)
                db.commit() # This triggers the INSERT
                print("     Product Creation Success!")
        except Exception as e:
            print(f"     Product Creation Failed: {e}")
            db.rollback()

        # 3. Test Create InventoryBatch
        print("\n  3. Testing Batch Creation...")
        try:
            # Need a product ID
            prod = db.query(Product).first()
            if not prod:
                print("     No product found, skipping batch test.")
            else:
                from app.models.inventory_batch import InventoryBatch, BatchStatus
                new_batch = InventoryBatch(
                    product_id=prod.id,
                    initial_qty=100,
                    current_qty=100,
                    status=BatchStatus.AVAILABLE,
                    batch_number="TEST-BATCH-001",
                    barcode="BARCODE-TEST-001"
                )
                db.add(new_batch)
                db.commit()
                print("     Batch Creation Success!")
                
                # 4. Test BatchMovement
                print("\n  4. Testing Movement Creation...")
                from app.models.batch_movement import BatchMovement, MovementType
                movement = BatchMovement(
                    batch_id=new_batch.id,
                    movement_type=MovementType.INBOUND,
                    qty=100,
                    qty_before=0,
                    qty_after=100
                )
                db.add(movement)
                db.commit()
                print("     Movement Creation Success!")
                
        except Exception as e:
            print(f"     Batch/Movement Creation Failed: {e}")
            db.rollback()

    finally:
        db.close()

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    test_sqlalchemy()
