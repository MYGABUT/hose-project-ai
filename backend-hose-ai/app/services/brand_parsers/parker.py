"""
Parker Hose Parser
Handles Parker-specific label formats (481/482/301/No-Skive series)
"""

import re
from typing import Dict, Any
from fuzzywuzzy import process
from .base import BaseHoseParser


class ParkerParser(BaseHoseParser):
    """
    Parser for PARKER hydraulic hoses.
    
    Parker uses numeric series codes:
    - 481/482 series (GlobalCore)
    - 301/302 series (Compact)
    - 426 series (Tough Cover)
    - No-Skive series (NS)
    """
    
    BRAND_NAME = "PARKER"
    PATTERNS = [
        r'48[12][-\s]?\d{1,2}',   # 481-4, 482-8
        r'30[12][-\s]?\d{1,2}',   # 301-6, 302-12
        r'42[46][-\s]?\d{1,2}',   # 424-8, 426-6
        r'NO[\s\-]?SKIVE',        # No-Skive
        r'NS[-\s]?\d{1,2}',       # NS-4, NS-8
        r'\d{3}[-\s]?\d{1,2}',    # Generic pattern
    ]
    
    def parse(self, text_blob: str) -> Dict[str, Any]:
        """
        Parse Parker hose label text.
        
        Example inputs:
        - "PARKER 481-8 GLOBALCORE 5000PSI"
        - "PARKER 301-6 COMPACT SERIES 250BAR"
        """
        clean_text = self.clean_text(text_blob)
        
        # 1. Try to find Parker product code patterns
        product_code = None
        for pattern in self.PATTERNS:
            match = re.search(pattern, clean_text)
            if match:
                product_code = match.group(0).replace(' ', '-')
                break
        
        if not product_code:
            return self._fail_response(
                "Pola kode Parker (481/482/301/302/NS) tidak ditemukan"
            )
        
        # 2. Database lookup with fuzzy matching
        if self.brand_products.empty:
            return self._fail_response("Database produk Parker kosong")
        
        possible_types = self.brand_products['TIPE HOSE'].tolist()
        best_match, score = process.extractOne(product_code, possible_types)
        
        if score < 70:
            return self._fail_response(
                f"Kode '{product_code}' tidak cocok dengan katalog Parker (score: {score})"
            )
        
        # 3. Get product data
        product_data = self.brand_products[
            self.brand_products['TIPE HOSE'] == best_match
        ].iloc[0]
        
        pressure = self._get_pressure(product_data)
        size = str(product_data.get('Hose I.D. (in)', ''))
        
        # Determine series name
        series = self._get_series_name(best_match)
        
        return self._success_response(
            sku=best_match,
            pressure_bar=pressure,
            size_inch=size,
            desc=f"Parker {series} {best_match}",
            confidence=score
        )
    
    def _get_series_name(self, code: str) -> str:
        """Determine series name from product code."""
        if '481' in code or '482' in code:
            return "GlobalCore"
        elif '301' in code or '302' in code:
            return "Compact"
        elif '424' in code or '426' in code:
            return "Tough Cover"
        elif 'NS' in code.upper() or 'SKIVE' in code.upper():
            return "No-Skive"
        return "Hydraulic"
    
    def _get_pressure(self, product_data) -> int:
        """Extract pressure from product data."""
        pressure_columns = [
            'Working Pressure Bar',
            'WorkingPressure(Bar)',
            'Pressure Bar'
        ]
        
        for col in pressure_columns:
            if col in product_data.index:
                try:
                    return int(float(product_data[col]))
                except (ValueError, TypeError):
                    continue
        return 0
