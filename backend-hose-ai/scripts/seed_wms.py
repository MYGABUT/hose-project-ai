"""
WMS Enterprise - Seed Data
Initialize default storage locations and sample products
"""
import sys
sys.path.append(".")

from app.core.database import SessionLocal, init_db
from app.models import StorageLocation, Product, ProductAlias, LocationType, ProductCategory, ProductUnit


def seed_locations():
    """Create default storage locations"""
    db = SessionLocal()
    
    try:
        # Check if already seeded
        existing = db.query(StorageLocation).first()
        if existing:
            print("⚠️ Storage locations already exist. Skipping seed.")
            return
        
        locations = [
            # Main Warehouse - Hose Zone
            {"code": "WH1-HOSE-A01-L1", "warehouse": "MAIN", "zone": "HOSE", "rack": "A01", "level": "L1", "type": LocationType.HOSE_RACK, "capacity": 500},
            {"code": "WH1-HOSE-A01-L2", "warehouse": "MAIN", "zone": "HOSE", "rack": "A01", "level": "L2", "type": LocationType.HOSE_RACK, "capacity": 500},
            {"code": "WH1-HOSE-A01-L3", "warehouse": "MAIN", "zone": "HOSE", "rack": "A01", "level": "L3", "type": LocationType.HOSE_RACK, "capacity": 500},
            {"code": "WH1-HOSE-A02-L1", "warehouse": "MAIN", "zone": "HOSE", "rack": "A02", "level": "L1", "type": LocationType.HOSE_RACK, "capacity": 500},
            {"code": "WH1-HOSE-A02-L2", "warehouse": "MAIN", "zone": "HOSE", "rack": "A02", "level": "L2", "type": LocationType.HOSE_RACK, "capacity": 500},
            {"code": "WH1-HOSE-B01-L1", "warehouse": "MAIN", "zone": "HOSE", "rack": "B01", "level": "L1", "type": LocationType.HOSE_RACK, "capacity": 500},
            {"code": "WH1-HOSE-B01-L2", "warehouse": "MAIN", "zone": "HOSE", "rack": "B01", "level": "L2", "type": LocationType.HOSE_RACK, "capacity": 500},
            
            # Main Warehouse - Fitting Zone
            {"code": "WH1-FIT-C01-B01", "warehouse": "MAIN", "zone": "FITTING", "rack": "C01", "bin": "B01", "type": LocationType.FITTING_BIN, "capacity": 1000},
            {"code": "WH1-FIT-C01-B02", "warehouse": "MAIN", "zone": "FITTING", "rack": "C01", "bin": "B02", "type": LocationType.FITTING_BIN, "capacity": 1000},
            {"code": "WH1-FIT-C01-B03", "warehouse": "MAIN", "zone": "FITTING", "rack": "C01", "bin": "B03", "type": LocationType.FITTING_BIN, "capacity": 1000},
            {"code": "WH1-FIT-C02-B01", "warehouse": "MAIN", "zone": "FITTING", "rack": "C02", "bin": "B01", "type": LocationType.FITTING_BIN, "capacity": 1000},
            {"code": "WH1-FIT-C02-B02", "warehouse": "MAIN", "zone": "FITTING", "rack": "C02", "bin": "B02", "type": LocationType.FITTING_BIN, "capacity": 1000},
            
            # Special Areas
            {"code": "WH1-STAGING-IN", "warehouse": "MAIN", "zone": "STAGING", "type": LocationType.STAGING_AREA, "description": "Receiving Area"},
            {"code": "WH1-STAGING-OUT", "warehouse": "MAIN", "zone": "STAGING", "type": LocationType.STAGING_AREA, "description": "Shipping Area"},
            {"code": "WH1-STAGING-DO", "warehouse": "MAIN", "zone": "STAGING", "type": LocationType.STAGING_AREA, "description": "Ready for Delivery"},
            {"code": "WH1-RETURN-QC", "warehouse": "MAIN", "zone": "RETURN", "type": LocationType.RETURN_AREA, "description": "Return Inspection"},
            {"code": "WH1-SCRAP", "warehouse": "MAIN", "zone": "SCRAP", "type": LocationType.SCRAP, "description": "Damaged/Scrap Items"},
        ]
        
        for loc_data in locations:
            location = StorageLocation(**loc_data)
            db.add(location)
        
        db.commit()
        print(f"✅ Created {len(locations)} storage locations")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding locations: {e}")
        raise
    finally:
        db.close()


def seed_sample_products():
    """Create sample products with aliases"""
    db = SessionLocal()
    
    try:
        # Check if already seeded
        existing = db.query(Product).first()
        if existing:
            print("⚠️ Products already exist. Skipping seed.")
            return
        
        products = [
            {
                "sku": "HOSE-EAT-R2-050",
                "name": "Hydraulic Hose R2 1/2 inch EATON",
                "brand": "EATON",
                "category": ProductCategory.HOSE,
                "unit": ProductUnit.METER,
                "specifications": {
                    "standard": "R2",
                    "size_inch": "1/2",
                    "size_dn": "DN12",
                    "working_pressure_bar": 330,
                    "burst_pressure_bar": 1320,
                    "wire_type": "2 Wire Braid"
                },
                "aliases": [
                    {"alias_type": "MANUFACTURER", "alias_value": "EC110-08", "is_primary": True},
                    {"alias_type": "BARCODE", "alias_value": "8801234567890"},
                ]
            },
            {
                "sku": "HOSE-YOK-R1-075",
                "name": "Hydraulic Hose R1 3/4 inch YOKOHAMA",
                "brand": "YOKOHAMA",
                "category": ProductCategory.HOSE,
                "unit": ProductUnit.METER,
                "specifications": {
                    "standard": "R1",
                    "size_inch": "3/4",
                    "size_dn": "DN19",
                    "working_pressure_bar": 160,
                    "wire_type": "1 Wire Braid"
                },
                "aliases": [
                    {"alias_type": "MANUFACTURER", "alias_value": "PA-716", "is_primary": True},
                ]
            },
            {
                "sku": "FIT-EAT-JIC-M08",
                "name": "JIC Male Fitting 1/2 EATON",
                "brand": "EATON",
                "category": ProductCategory.FITTING,
                "unit": ProductUnit.PCS,
                "specifications": {
                    "type": "JIC Male",
                    "size": "1/2",
                    "thread": "7/8-14 UNF"
                },
                "aliases": [
                    {"alias_type": "MANUFACTURER", "alias_value": "1A-202-08", "is_primary": True},
                    {"alias_type": "AI_SCAN", "alias_value": "B22910"},
                ]
            },
            {
                "sku": "FIT-PAR-FLANGE-100",
                "name": "Split Flange 1 inch PARKER",
                "brand": "PARKER",
                "category": ProductCategory.FITTING,
                "unit": ProductUnit.PCS,
                "specifications": {
                    "type": "Split Flange",
                    "size": "1"
                },
                "aliases": [
                    {"alias_type": "MANUFACTURER", "alias_value": "SF-16", "is_primary": True},
                ]
            },
        ]
        
        for prod_data in products:
            aliases_data = prod_data.pop("aliases", [])
            product = Product(**prod_data)
            
            # Update search keywords
            keywords = [
                product.sku,
                product.name,
                product.brand or "",
            ]
            for alias in aliases_data:
                keywords.append(alias["alias_value"])
            if product.specifications:
                for v in product.specifications.values():
                    if v:
                        keywords.append(str(v))
            product.search_keywords = " ".join(keywords).upper()
            
            db.add(product)
            db.flush()  # Get product ID
            
            # Add aliases
            for alias_data in aliases_data:
                alias = ProductAlias(product_id=product.id, **alias_data)
                db.add(alias)
        
        db.commit()
        print(f"✅ Created {len(products)} sample products with aliases")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding products: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🌱 Seeding WMS Database...")
    print("-" * 40)
    
    # Initialize tables first
    init_db()
    
    # Seed data
    seed_locations()
    seed_sample_products()
    
    print("-" * 40)
    print("✅ Seeding complete!")
