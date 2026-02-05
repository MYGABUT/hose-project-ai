"""
Generic Hose Parser
Fallback parser for unknown brands - uses broad pattern matching
"""

import re
from typing import Dict, Any
from fuzzywuzzy import fuzz, process
from .base import BaseHoseParser


class GenericParser(BaseHoseParser):
    """
    Fallback parser for when brand is not recognized.
    Uses generic pattern matching for hydraulic hose specifications.
    """
    
    BRAND_NAME = "GENERIC"
    
    # Common SAE standards
    STANDARDS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 
                 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15',
                 '1SN', '2SN', '4SP', '4SH', '100R1', '100R2']
    
    # Common sizes
    SIZES = ['1/4', '3/8', '1/2', '5/8', '3/4', '1', 
             '1-1/4', '1-1/2', '2', '6mm', '8mm', '10mm', 
             '12mm', '16mm', '19mm', '25mm', '32mm', '38mm', '50mm']
    
    def parse(self, text_blob: str) -> Dict[str, Any]:
        """
        Parse unknown brand hose label using generic patterns.
        """
        clean_text = self.clean_text(text_blob)
        
        # 1. Try to extract any useful information
        standard = self._detect_standard(clean_text)
        size = self._detect_size(clean_text)
        pressure = self._detect_pressure(clean_text)
        
        if not standard and not size and not pressure:
            return self._fail_response(
                "Tidak dapat mendeteksi spesifikasi hose dari teks"
            )
        
        # 2. Try database search across all brands
        if not self.dataset.empty:
            result = self._search_database(standard, size, pressure)
            if result:
                return result
        
        # 3. Return what we found even without database match
        return self._success_response(
            sku=f"{standard or 'HOSE'}-{size or 'UNKNOWN'}",
            pressure_bar=pressure,
            size_inch=size or "",
            desc=f"Hydraulic Hose {standard or ''} {size or ''}".strip(),
            confidence=50,  # Low confidence for generic match
            extra={"warning": "Hasil dari parser generik. Verifikasi manual diperlukan."}
        )
    
    def _detect_standard(self, text: str) -> str:
        """Detect SAE standard from text."""
        for std in self.STANDARDS:
            if std in text or std.replace('R', 'R ') in text:
                return std
        
        # Pattern match
        match = re.search(r'(100R\d{1,2}|[12]SN|[24]S[PH]|R\d{1,2})', text)
        if match:
            return match.group(0)
        
        return ""
    
    def _detect_size(self, text: str) -> str:
        """Detect hose size from text."""
        # Check explicit sizes
        for size in self.SIZES:
            if size in text:
                return size
        
        # Pattern match for fractions
        match = re.search(r'(\d+[\s\-]?\d*/\d+|\d+)\s*"?(?:INCH)?', text)
        if match:
            return match.group(1).strip()
        
        # Pattern match for mm
        mm_match = re.search(r'(\d{1,2})\s*MM', text)
        if mm_match:
            return f"{mm_match.group(1)}mm"
        
        return ""
    
    def _detect_pressure(self, text: str) -> int:
        """Detect working pressure from text."""
        # BAR pattern
        bar_match = re.search(r'(\d{2,4})\s*BAR', text)
        if bar_match:
            return int(bar_match.group(1))
        
        # PSI pattern (convert to bar)
        psi_match = re.search(r'(\d{3,5})\s*PSI', text)
        if psi_match:
            psi = int(psi_match.group(1))
            return int(psi / 14.5)  # Convert PSI to Bar
        
        # MPA pattern (convert to bar)
        mpa_match = re.search(r'(\d{1,3})\s*MPA', text)
        if mpa_match:
            mpa = int(mpa_match.group(1))
            return mpa * 10  # Convert MPa to Bar
        
        return 0
    
    def _search_database(self, standard: str, size: str, pressure: int):
        """Search database for matching product."""
        if self.dataset.empty:
            return None
        
        df = self.dataset.copy()
        
        # Filter by standard if available
        if standard:
            std_match = df[df['TIPE HOSE'].str.contains(standard, na=False, case=False)]
            if not std_match.empty:
                df = std_match
        
        # Filter by size if available
        if size and 'Hose I.D. (in)' in df.columns:
            size_clean = size.replace('mm', '').strip()
            size_match = df[
                df['Hose I.D. (in)'].astype(str).str.contains(size_clean, na=False)
            ]
            if not size_match.empty:
                df = size_match
        
        if df.empty:
            return None
        
        # Take first match
        product = df.iloc[0]
        
        return self._success_response(
            sku=product['TIPE HOSE'],
            pressure_bar=self._get_pressure(product) or pressure,
            size_inch=size or str(product.get('Hose I.D. (in)', '')),
            desc=f"{product.get('MEREK', 'Unknown')} {product['TIPE HOSE']}",
            confidence=60
        )
    
    def _get_pressure(self, product_data) -> int:
        """Extract pressure from product data."""
        for col in ['Working Pressure Bar', 'WorkingPressure(Bar)', 'Pressure Bar']:
            if col in product_data.index:
                try:
                    return int(float(product_data[col]))
                except:
                    continue
        return 0
