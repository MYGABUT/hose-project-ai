"""
Parser Manager - Central Controller for Brand-Specific Parsers
Implements Factory Pattern to select appropriate parser based on detected brand
"""

import pandas as pd
from typing import Dict, Any, List, Optional
from fuzzywuzzy import process
from pathlib import Path

from .brand_parsers import (
    EatonParser,
    YokohamaParser,
    ParkerParser,
    ManuliParser,
    GenericParser,
    BaseHoseParser
)
from app.core.config import settings


class HoseScannerService:
    """
    Main service for processing hose detection.
    
    Responsibilities:
    1. Load product dataset into memory (once at startup)
    2. Detect brand from OCR text
    3. Delegate to appropriate brand-specific parser
    4. Return parsed specifications
    """
    
    def __init__(self, csv_path: str):
        """
        Initialize service with product dataset.
        
        Args:
            csv_path: Path to the CSV file containing product data
        """
        print(f"[INFO] Loading product dataset from: {csv_path}")
        
        # Load dataset into memory (High Performance)
        self.df = self._load_dataset(csv_path)
        
        # Initialize brand-specific parsers (Strategy Pattern)
        self.parsers: Dict[str, BaseHoseParser] = {
            'EATON': EatonParser(self.df),
            'YOKOHAMA': YokohamaParser(self.df),
            'PARKER': ParkerParser(self.df),
            'MANULI': ManuliParser(self.df),
        }
        
        # Generic parser as fallback
        self.generic_parser = GenericParser(self.df)
        
        # Known brand names for detection
        self.known_brands = list(self.parsers.keys())
        
        # Brand aliases (common OCR mistakes)
        self.brand_aliases = {
            'ETION': 'EATON',
            'EATAN': 'EATON',
            'EAT0N': 'EATON',
            'YOKO': 'YOKOHAMA',
            'YKH': 'YOKOHAMA',
            'YOKAHAMA': 'YOKOHAMA',
            'PARKAR': 'PARKER',
            'PARKR': 'PARKER',
            'MANUILI': 'MANULI',
            'MANNULI': 'MANULI',
        }
        
        print(f"[SUCCESS] Loaded {len(self.df)} products. Parsers ready: {self.known_brands}")
    
    def _load_dataset(self, csv_path: str) -> pd.DataFrame:
        """Load CSV dataset with error handling."""
        path = Path(csv_path)
        
        if not path.exists():
            print(f"[WARNING] CSV file not found: {csv_path}")
            print("[INFO] Creating sample dataset...")
            return self._create_sample_dataset()
        
        try:
            df = pd.read_csv(csv_path)
            print(f"[SUCCESS] Dataset loaded: {len(df)} rows, {len(df.columns)} columns")
            return df
        except Exception as e:
            print(f"[WARNING] Error loading CSV: {e}")
            return self._create_sample_dataset()
    
    def _create_sample_dataset(self) -> pd.DataFrame:
        """Create a sample dataset for testing."""
        sample_data = [
            {'MEREK': 'EATON', 'TIPE HOSE': 'EC525-8', 'Working Pressure Bar': 350, 'Hose I.D. (in)': '1/2', 'tipe kawat': '2 Wire Braid'},
            {'MEREK': 'EATON', 'TIPE HOSE': 'GH781-12', 'Working Pressure Bar': 280, 'Hose I.D. (in)': '3/4', 'tipe kawat': '4 Spiral'},
            {'MEREK': 'YOKOHAMA', 'TIPE HOSE': 'R2-08', 'Working Pressure Bar': 250, 'Hose I.D. (in)': '1/2', 'tipe kawat': '2 Wire'},
            {'MEREK': 'YOKOHAMA', 'TIPE HOSE': '4SP-12', 'Working Pressure Bar': 350, 'Hose I.D. (in)': '3/4', 'tipe kawat': '4 Spiral'},
            {'MEREK': 'PARKER', 'TIPE HOSE': '481-8', 'Working Pressure Bar': 345, 'Hose I.D. (in)': '1/2', 'tipe kawat': 'GlobalCore'},
            {'MEREK': 'PARKER', 'TIPE HOSE': '301-6', 'Working Pressure Bar': 225, 'Hose I.D. (in)': '3/8', 'tipe kawat': 'Compact'},
            {'MEREK': 'MANULI', 'TIPE HOSE': 'RK-8', 'Working Pressure Bar': 280, 'Hose I.D. (in)': '1/2', 'tipe kawat': 'Rockmaster'},
        ]
        return pd.DataFrame(sample_data)
    
    def process_image_text(self, raw_text: str) -> Dict[str, Any]:
        """
        Main processing function.
        
        Args:
            raw_text: Raw OCR text from image
            
        Returns:
            Parsed hose specifications
        """
        if not raw_text or len(raw_text.strip()) < 3:
            return {
                "status": "error",
                "message": "Teks input terlalu pendek atau kosong"
            }
        
        print(f"[INFO] Processing text: {raw_text[:100]}...")
        
        clean_text = raw_text.upper().strip()
        
        # 1. Detect Brand
        detected_brand = self._detect_brand(clean_text)
        
        if detected_brand:
            print(f"[SUCCESS] Brand detected: {detected_brand}")
            parser = self.parsers[detected_brand]
            result = parser.parse(clean_text)
        else:
            print("[WARNING] Brand not detected, using generic parser")
            result = self.generic_parser.parse(clean_text)
            result["warning"] = "Merek tidak terdeteksi. Menggunakan parser generik."
        
        # Add raw text to result for debugging
        result["raw_text_sample"] = raw_text[:50] + "..." if len(raw_text) > 50 else raw_text
        
        return result
    
    def _detect_brand(self, text: str) -> Optional[str]:
        """
        Detect brand from OCR text using fuzzy matching.
        
        Args:
            text: Cleaned uppercase text
            
        Returns:
            Detected brand name or None
        """
        words = text.split()
        
        for word in words:
            # 1. Check exact match
            if word in self.known_brands:
                return word
            
            # 2. Check aliases
            if word in self.brand_aliases:
                return self.brand_aliases[word]
            
            # 3. Fuzzy match
            match, score = process.extractOne(word, self.known_brands)
            if score >= settings.BRAND_MATCH_THRESHOLD:
                return match
        
        return None
    
    def get_supported_brands(self) -> List[str]:
        """Get list of supported brands."""
        return self.known_brands
    
    def get_stats(self) -> Dict[str, Any]:
        """Get dataset statistics."""
        if self.df.empty:
            return {"status": "error", "message": "Dataset is empty"}
        
        stats = {
            "status": "success",
            "total_products": len(self.df),
            "brands": {}
        }
        
        if 'MEREK' in self.df.columns:
            brand_counts = self.df['MEREK'].value_counts().to_dict()
            stats["brands"] = brand_counts
        
        return stats
