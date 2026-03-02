
from sqlalchemy.orm import Session
from app.core.importer import DataImporter
from app.core.exporter import DataExporter
from app.models.product import Product
from app.models.enums import ProductCategory, ProductUnit
from typing import List, Dict, Any

class ProductImportService:
    @staticmethod
    async def preview_import(file) -> Dict[str, Any]:
        importer = DataImporter(file)
        await importer.read_file()
        
        # Define required columns for product
        required = ["sku", "name", "brand", "category", "unit", "cost_price", "sell_price"]
        
        # Check missing columns
        missing = importer.validate_columns(required)
        
        # Get preview data (first 5 rows)
        preview = importer.get_preview(limit=5)
        
        return {
            "filename": preview["filename"],
            "total_rows": preview["total_rows"],
            "columns": preview["columns"],
            "missing_columns": missing,
            "preview_data": preview["preview_data"],
            "status": "Ready" if not missing else "Missing Columns"
        }

    @staticmethod
    async def commit_import(db: Session, file) -> Dict[str, Any]:
        importer = DataImporter(file)
        df = await importer.read_file()
        
        # Validate critical columns
        required = ["sku", "name"]
        missing = importer.validate_columns(required)
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(missing)}")
            
        # Convert DataFrame to list of dicts
        records = df.to_dict(orient="records")
        
        success_count = 0
        errors = []
        
        for index, row in enumerate(records):
            try:
                sku = str(row.get("sku")).strip()
                if not sku:
                    errors.append(f"Row {index+1}: SKU is empty")
                    continue
                    
                # Check if product exists
                existing = db.query(Product).filter(Product.sku == sku).first()
                
                if existing:
                    # Update existing
                    existing.name = row.get("name", existing.name)
                    existing.brand = row.get("brand", existing.brand)
                    existing.description = row.get("description", existing.description)
                    existing.cost_price = row.get("cost_price", existing.cost_price)
                    existing.sell_price = row.get("sell_price", existing.sell_price)
                    # Helper to update search keywords
                    existing.update_search_keywords()
                else:
                    # Create new
                    new_product = Product(
                        sku=sku,
                        name=row.get("name"),
                        brand=row.get("brand"),
                        description=row.get("description"),
                        cost_price=row.get("cost_price", 0),
                        sell_price=row.get("sell_price", 0),
                        min_stock=row.get("min_stock", 0),
                        # Default enums if invalid
                        category=ProductCategory.HOSE, 
                        unit=ProductUnit.METER
                    )
                    new_product.update_search_keywords()
                    db.add(new_product)
                    
                success_count += 1
                
            except Exception as e:
                errors.append(f"Row {index+1} ({sku}): {str(e)}")
                
        db.commit()
        
        return {
            "total_processed": len(records),
            "success_count": success_count,
            "error_count": len(errors),
            "errors": errors[:50] # Limit error feedback
        }

    @staticmethod
    def export_products(db: Session, format: str = "xlsx"):
        products = db.query(Product).all()
        data = [p.to_dict() for p in products]
        
        # Flatten for export if needed (e.g. nested objects) or export raw dicts
        # For simplicity, we use the dict representation
        
        if format == "csv":
            return DataExporter.export_csv(data, filename="products_export.csv")
        else:
            return DataExporter.export_excel(data, filename="products_export.xlsx")
