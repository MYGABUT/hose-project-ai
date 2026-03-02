"""
Excel/CSV Importer Core Module 📊
 Universal engine for parsing, validating, and previewing capabilities.
"""
import pandas as pd
from typing import List, Dict, Any, Optional
from fastapi import UploadFile, HTTPException

class DataImporter:
    """
    Base class for handling Excel/CSV imports with:
    - File parsing (pandas)
    - Column normalization
    - Preview generation
    - Validation (to be extended by subclasses)
    """
    
    ACCEPTED_MIME_TYPES = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", # .xlsx
        "application/vnd.ms-excel", # .xls
        "text/csv", # .csv
    ]

    def __init__(self, file: UploadFile):
        self.file = file
        self.df: Optional[pd.DataFrame] = None
        self.filename = file.filename

    async def read_file(self, check_mime: bool = True) -> pd.DataFrame:
        """Read uploaded file into Pandas DataFrame."""
        if check_mime and self.file.content_type not in self.ACCEPTED_MIME_TYPES:
            # Fallback check for extension
            if not any(self.filename.endswith(ext) for ext in ['.xlsx', '.xls', '.csv']):
                raise HTTPException(400, "Invalid file format. Please upload .xlsx, .xls, or .csv")

        try:
            contents = await self.file.read()
            
            if self.filename.endswith('.csv'):
                self.df = pd.read_csv(pd.io.common.BytesIO(contents))
            else:
                self.df = pd.read_excel(pd.io.common.BytesIO(contents))
                
            # Normalize: strip whitespace from headers and values
            self.df.columns = self.df.columns.str.strip()
            self.df = self.df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
            
            return self.df
            
        except Exception as e:
            raise HTTPException(400, f"Failed to parse file: {str(e)}")

    def get_preview(self, limit: int = 5) -> Dict[str, Any]:
        """Return columns and first N rows for UI preview."""
        if self.df is None:
            raise ValueError("File not read yet. Call read_file() first.")
            
        # Replace NaN with None for JSON compatibility
        preview_df = self.df.head(limit).replace({float('nan'): None})
        
        return {
            "filename": self.filename,
            "total_rows": len(self.df),
            "columns": list(self.df.columns),
            "preview_data": preview_df.to_dict(orient="records")
        }

    def validate_columns(self, required_columns: List[str]) -> List[str]:
        """Check if required columns exist. Return missing columns."""
        if self.df is None: 
            return required_columns
            
        missing = [col for col in required_columns if col not in self.df.columns]
        return missing

    def map_columns(self, mapping: Dict[str, str]) -> pd.DataFrame:
        """
        Rename columns based on user mapping.
        mapping: {'User Header': 'db_field'}
        """
        if self.df is None: return pd.DataFrame()
        
        # Only keep columns present in mapping keys
        valid_cols = [c for c in mapping.keys() if c in self.df.columns]
        
        # Select & Rename
        mapped_df = self.df[valid_cols].rename(columns=mapping)
        return mapped_df
