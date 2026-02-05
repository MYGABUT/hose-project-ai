"""
Yokohama Hose Parser
Handles Yokohama-specific label formats (SAE standards R1/R2/4SP/4SH)
"""

import re
from typing import Dict, Any
from .base import BaseHoseParser


class YokohamaParser(BaseHoseParser):
    """
    Parser for YOKOHAMA hydraulic hoses.
    
    Yokohama uses SAE standard codes combined with sizes:
    - R1, R2 (1-wire, 2-wire braid)
    - 4SP, 4SH (4-wire spiral)
    - Sizes in inches: 1/4, 3/8, 1/2, 5/8, 3/4, 1
    """
    
    BRAND_NAME = "YOKOHAMA"
    
    STANDARDS = ['R1', 'R2', '4SP', '4SH', '1SN', '2SN']
    SIZES = ['1/4', '3/8', '1/2', '5/8', '3/4', '1', '1-1/4', '1-1/2', '2']
    
    def parse(self, text_blob: str) -> Dict[str, Any]:
        """
        Parse Yokohama hose label text.
        
        Example inputs:
        - "YOKOHAMA R2 1/2 250BAR"
        - "YKH 4SP 3/4 INCH 35MPA"
        """
        clean_text = self.clean_text(text_blob)
        
        # 1. Detect SAE Standard
        detected_std = None
        for std in self.STANDARDS:
            if std in clean_text:
                detected_std = std
                break
        
        if not detected_std:
            # Try with spaces/dashes
            std_pattern = re.search(r'(R[\s\-]?[12]|[124][\s\-]?S[PH])', clean_text)
            if std_pattern:
                detected_std = std_pattern.group(0).replace(' ', '').replace('-', '')
        
        # 2. Detect Size
        detected_size = None
        for size in self.SIZES:
            if size in clean_text:
                detected_size = size
                break
        
        # Also try pattern matching for sizes
        if not detected_size:
            size_match = re.search(r'(\d+[\s\-]?\d*/\d+|\d+)"?[\s\-]?INCH?', clean_text)
            if size_match:
                detected_size = size_match.group(1).strip()
        
        # 3. Check what we found
        if not detected_std and not detected_size:
            return self._fail_response(
                "Tidak ditemukan standar (R1/R2/4SP) atau ukuran pada teks"
            )
        
        # 4. Query database
        if self.brand_products.empty:
            return self._fail_response("Database produk Yokohama kosong")
        
        # Build filter
        result_df = self.brand_products.copy()
        
        if detected_std:
            result_df = result_df[
                result_df['TIPE HOSE'].str.contains(detected_std, na=False, case=False)
            ]
        
        if detected_size:
            # Try to match size in the Hose I.D. column
            result_df = result_df[
                result_df['Hose I.D. (in)'].astype(str).str.contains(
                    detected_size.replace('/', '').replace('-', ''), 
                    na=False
                ) |
                result_df['TIPE HOSE'].str.contains(detected_size, na=False)
            ]
        
        if result_df.empty:
            return self._fail_response(
                f"Tidak ditemukan produk Yokohama dengan standar '{detected_std}' "
                f"dan ukuran '{detected_size}'"
            )
        
        # Get first match
        product_data = result_df.iloc[0]
        
        # Extract pressure
        pressure = self._get_pressure(product_data)
        
        return self._success_response(
            sku=product_data['TIPE HOSE'],
            pressure_bar=pressure,
            size_inch=detected_size or str(product_data.get('Hose I.D. (in)', '')),
            desc=f"Yokohama {detected_std or ''} Size {detected_size or ''}".strip(),
            confidence=90 if (detected_std and detected_size) else 70
        )
    
    def _get_pressure(self, product_data) -> int:
        """Extract pressure from product data."""
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
