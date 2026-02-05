"""
Manuli Hose Parser
Handles Manuli-specific label formats (Rockmaster/Flexor series)
"""

import re
from typing import Dict, Any
from fuzzywuzzy import process
from .base import BaseHoseParser


class ManuliParser(BaseHoseParser):
    """
    Parser for MANULI hydraulic hoses.
    
    Manuli uses brand series names:
    - Rockmaster (RK series)
    - Flexor (FX series)
    - Goldeniso
    """
    
    BRAND_NAME = "MANULI"
    PATTERNS = [
        r'RK[\s\-]?\d{1,2}',      # RK-4, RK-8
        r'FX[\s\-]?\d{1,2}',      # FX-4, FX-6
        r'ROCKMASTER',
        r'FLEXOR',
        r'GOLDENISO',
    ]
    
    def parse(self, text_blob: str) -> Dict[str, Any]:
        """
        Parse Manuli hose label text.
        """
        clean_text = self.clean_text(text_blob)
        
        # 1. Detect product series
        series = self._detect_series(clean_text)
        product_code = self._extract_code(clean_text)
        
        if not series and not product_code:
            return self._fail_response(
                "Pola kode Manuli (Rockmaster/Flexor/RK/FX) tidak ditemukan"
            )
        
        # 2. Database lookup
        if self.brand_products.empty:
            return self._fail_response("Database produk Manuli kosong")
        
        # Try fuzzy match
        possible_types = self.brand_products['TIPE HOSE'].tolist()
        search_term = product_code or series
        best_match, score = process.extractOne(search_term, possible_types)
        
        if score < 65:
            return self._fail_response(
                f"Kode '{search_term}' tidak cocok dengan katalog Manuli"
            )
        
        product_data = self.brand_products[
            self.brand_products['TIPE HOSE'] == best_match
        ].iloc[0]
        
        pressure = self._get_pressure(product_data)
        
        return self._success_response(
            sku=best_match,
            pressure_bar=pressure,
            size_inch=str(product_data.get('Hose I.D. (in)', '')),
            desc=f"Manuli {series or product_code} Hydraulic Hose",
            confidence=score
        )
    
    def _detect_series(self, text: str) -> str:
        """Detect Manuli series name."""
        if 'ROCKMASTER' in text:
            return "Rockmaster"
        elif 'FLEXOR' in text:
            return "Flexor"
        elif 'GOLDENISO' in text:
            return "Goldeniso"
        return ""
    
    def _extract_code(self, text: str) -> str:
        """Extract product code."""
        for pattern in [r'RK[\s\-]?\d{1,2}', r'FX[\s\-]?\d{1,2}']:
            match = re.search(pattern, text)
            if match:
                return match.group(0).replace(' ', '-')
        return ""
    
    def _get_pressure(self, product_data) -> int:
        """Extract pressure from product data."""
        for col in ['Working Pressure Bar', 'WorkingPressure(Bar)', 'Pressure Bar']:
            if col in product_data.index:
                try:
                    return int(float(product_data[col]))
                except:
                    continue
        return 0
