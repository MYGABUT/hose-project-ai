"""
Eaton Hose Parser
Handles Eaton-specific label formats (EC###, GH###, EG###)
"""

import re
from typing import Dict, Any
from fuzzywuzzy import process
from .base import BaseHoseParser


class EatonParser(BaseHoseParser):
    """
    Parser for EATON hydraulic hoses.
    
    Eaton uses distinctive product codes:
    - EC### series (e.g., EC525, EC420)
    - GH### series (e.g., GH781, GH663)
    - EG### series (e.g., EG200, EG100)
    """
    
    BRAND_NAME = "EATON"
    PATTERNS = [
        r'EC\d{3}',   # EC525, EC420, etc.
        r'GH\d{3}',   # GH781, GH663, etc.
        r'EG\d{3}',   # EG200, EG100, etc.
        r'H\d{4}'     # H0425, H0850, etc.
    ]
    
    def parse(self, text_blob: str) -> Dict[str, Any]:
        """
        Parse Eaton hose label text.
        
        Example inputs:
        - "EATON EC525-12 HYDRAULIC HOSE 250BAR"
        - "GH781 3/4 INCH 350 BAR"
        """
        clean_text = self.clean_text(text_blob)
        
        # 1. Try to find Eaton product code patterns
        product_code = None
        for pattern in self.PATTERNS:
            match = re.search(pattern, clean_text)
            if match:
                product_code = match.group(0)
                break
        
        if not product_code:
            return self._fail_response(
                "Pola kode Eaton (EC/GH/EG) tidak ditemukan dalam teks"
            )
        
        # 2. Find size (if present)
        size = self._extract_size(clean_text)
        
        # 3. Fuzzy match against database
        if self.brand_products.empty:
            return self._fail_response("Database produk Eaton kosong")
        
        # Get all product types
        possible_types = self.brand_products['TIPE HOSE'].tolist()
        
        # Fuzzy search for best match
        best_match, score = process.extractOne(product_code, possible_types)
        
        if score < 75:
            return self._fail_response(
                f"Kode '{product_code}' tidak cocok dengan katalog Eaton (score: {score})"
            )
        
        # 4. Get full product data
        product_data = self.brand_products[
            self.brand_products['TIPE HOSE'] == best_match
        ].iloc[0]
        
        # Extract pressure (handle various column names)
        pressure = self._get_pressure(product_data)
        
        return self._success_response(
            sku=best_match,
            pressure_bar=pressure,
            size_inch=size or str(product_data.get('Hose I.D. (in)', '')),
            desc=f"Eaton {best_match} - {product_data.get('tipe kawat', 'Hydraulic Hose')}",
            confidence=score
        )
    
    def _extract_size(self, text: str) -> str:
        """Extract hose size (inches) from text."""
        # Common inch fractions
        size_patterns = [
            r'(\d+)/(\d+)',      # 1/4, 3/8, 1/2
            r'(\d+)[\s\-]?INCH',  # 1 INCH, 2 INCH
            r'(\d+)"',           # 1/2"
        ]
        
        for pattern in size_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(0).replace('INCH', '').replace('"', '').strip()
        
        return ""
    
    def _get_pressure(self, product_data) -> int:
        """Extract pressure from product data, handling various column names."""
        pressure_columns = [
            'Working Pressure Bar',
            'WorkingPressure(Bar)',
            'Pressure Bar',
            'WP Bar'
        ]
        
        for col in pressure_columns:
            if col in product_data.index:
                try:
                    return int(float(product_data[col]))
                except (ValueError, TypeError):
                    continue
        
        return 0
