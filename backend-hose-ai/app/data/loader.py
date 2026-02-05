"""
Data Loader - Handles loading and caching of product datasets
"""

import pandas as pd
from pathlib import Path
from typing import Optional
from app.core.config import settings


class DataLoader:
    """
    Singleton data loader for product datasets.
    Loads data once into memory for fast access.
    """
    
    _instance = None
    _dataset: Optional[pd.DataFrame] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def load_csv(self, path: Optional[str] = None) -> pd.DataFrame:
        """
        Load CSV dataset into memory.
        
        Args:
            path: Path to CSV file (uses config default if None)
            
        Returns:
            DataFrame with product data
        """
        if self._dataset is not None:
            return self._dataset
        
        csv_path = Path(path or settings.CSV_PATH)
        
        if not csv_path.exists():
            print(f"[WARNING] CSV file not found: {csv_path}")
            self._dataset = self._create_sample_data()
        else:
            try:
                self._dataset = pd.read_csv(csv_path)
                print(f"[SUCCESS] Loaded {len(self._dataset)} products from {csv_path.name}")
            except Exception as e:
                print(f"❌ Error loading CSV: {e}")
                self._dataset = self._create_sample_data()
        
        return self._dataset
    
    def _create_sample_data(self) -> pd.DataFrame:
        """Create sample dataset for development."""
        print("📝 Creating sample dataset...")
        
        data = [
            # EATON Products
            {'MEREK': 'EATON', 'TIPE HOSE': 'EC525-6', 'Working Pressure Bar': 400, 'Hose I.D. (in)': '3/8', 'tipe kawat': '2 Wire Braid'},
            {'MEREK': 'EATON', 'TIPE HOSE': 'EC525-8', 'Working Pressure Bar': 350, 'Hose I.D. (in)': '1/2', 'tipe kawat': '2 Wire Braid'},
            {'MEREK': 'EATON', 'TIPE HOSE': 'EC525-12', 'Working Pressure Bar': 280, 'Hose I.D. (in)': '3/4', 'tipe kawat': '2 Wire Braid'},
            {'MEREK': 'EATON', 'TIPE HOSE': 'GH781-8', 'Working Pressure Bar': 420, 'Hose I.D. (in)': '1/2', 'tipe kawat': '4 Spiral'},
            {'MEREK': 'EATON', 'TIPE HOSE': 'GH781-12', 'Working Pressure Bar': 380, 'Hose I.D. (in)': '3/4', 'tipe kawat': '4 Spiral'},
            
            # YOKOHAMA Products
            {'MEREK': 'YOKOHAMA', 'TIPE HOSE': 'R1-06', 'Working Pressure Bar': 180, 'Hose I.D. (in)': '3/8', 'tipe kawat': '1 Wire'},
            {'MEREK': 'YOKOHAMA', 'TIPE HOSE': 'R1-08', 'Working Pressure Bar': 160, 'Hose I.D. (in)': '1/2', 'tipe kawat': '1 Wire'},
            {'MEREK': 'YOKOHAMA', 'TIPE HOSE': 'R2-06', 'Working Pressure Bar': 280, 'Hose I.D. (in)': '3/8', 'tipe kawat': '2 Wire'},
            {'MEREK': 'YOKOHAMA', 'TIPE HOSE': 'R2-08', 'Working Pressure Bar': 250, 'Hose I.D. (in)': '1/2', 'tipe kawat': '2 Wire'},
            {'MEREK': 'YOKOHAMA', 'TIPE HOSE': '4SP-08', 'Working Pressure Bar': 380, 'Hose I.D. (in)': '1/2', 'tipe kawat': '4 Spiral'},
            {'MEREK': 'YOKOHAMA', 'TIPE HOSE': '4SP-12', 'Working Pressure Bar': 350, 'Hose I.D. (in)': '3/4', 'tipe kawat': '4 Spiral'},
            
            # PARKER Products
            {'MEREK': 'PARKER', 'TIPE HOSE': '481-4', 'Working Pressure Bar': 420, 'Hose I.D. (in)': '1/4', 'tipe kawat': 'GlobalCore'},
            {'MEREK': 'PARKER', 'TIPE HOSE': '481-6', 'Working Pressure Bar': 400, 'Hose I.D. (in)': '3/8', 'tipe kawat': 'GlobalCore'},
            {'MEREK': 'PARKER', 'TIPE HOSE': '481-8', 'Working Pressure Bar': 345, 'Hose I.D. (in)': '1/2', 'tipe kawat': 'GlobalCore'},
            {'MEREK': 'PARKER', 'TIPE HOSE': '301-6', 'Working Pressure Bar': 225, 'Hose I.D. (in)': '3/8', 'tipe kawat': 'Compact'},
            {'MEREK': 'PARKER', 'TIPE HOSE': '301-8', 'Working Pressure Bar': 180, 'Hose I.D. (in)': '1/2', 'tipe kawat': 'Compact'},
            
            # MANULI Products
            {'MEREK': 'MANULI', 'TIPE HOSE': 'RK-06', 'Working Pressure Bar': 280, 'Hose I.D. (in)': '3/8', 'tipe kawat': 'Rockmaster'},
            {'MEREK': 'MANULI', 'TIPE HOSE': 'RK-08', 'Working Pressure Bar': 250, 'Hose I.D. (in)': '1/2', 'tipe kawat': 'Rockmaster'},
            {'MEREK': 'MANULI', 'TIPE HOSE': 'FX-06', 'Working Pressure Bar': 200, 'Hose I.D. (in)': '3/8', 'tipe kawat': 'Flexor'},
            {'MEREK': 'MANULI', 'TIPE HOSE': 'FX-08', 'Working Pressure Bar': 175, 'Hose I.D. (in)': '1/2', 'tipe kawat': 'Flexor'},
        ]
        
        return pd.DataFrame(data)
    
    def get_brands(self) -> list:
        """Get list of unique brands in dataset."""
        if self._dataset is None:
            return []
        return self._dataset['MEREK'].unique().tolist() if 'MEREK' in self._dataset.columns else []
    
    def get_stats(self) -> dict:
        """Get dataset statistics."""
        if self._dataset is None:
            return {}
        
        return {
            'total_products': len(self._dataset),
            'brands': self.get_brands(),
            'columns': self._dataset.columns.tolist()
        }


# Singleton instance
data_loader = DataLoader()
