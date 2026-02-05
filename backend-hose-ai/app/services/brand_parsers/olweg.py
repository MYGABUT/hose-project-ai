"""
OLWEG Hose Parser
Fokus pada Standar Internasional: DIN EN 853 1SN/2SN, SAE 100 R1/R2
"""

import re
import pandas as pd
from typing import Dict, Any
from .base import BaseHoseParser


class OlwegParser(BaseHoseParser):
    """
    Parser untuk OLWEG hydraulic hoses.
    
    OLWEG tidak pakai kode unik seperti Eaton (GH781).
    Mereka fokus menulis Standar Internasional:
    - DIN EN 853 1SN / 2SN
    - DIN EN 856 4SP / 4SH
    - SAE 100 R1AT / R2AT
    """
    
    BRAND_NAME = "OLWEG"
    
    # Pattern untuk standar kawat (dengan toleransi spasi)
    STD_PATTERNS = [
        r'1\s?SN',           # 1SN atau 1 SN
        r'2\s?SN', 
        r'4\s?SP', 
        r'4\s?SH',
        r'R1\s?AT?',         # R1AT atau R1 AT atau R1
        r'R2\s?AT?',
        r'R12',
        r'R13',
        r'R15',
    ]
    
    # Pattern untuk ukuran
    SIZE_PATTERNS = [
        r'1/4',
        r'3/8',
        r'1/2',
        r'5/8',
        r'3/4',
        r'1[\s\-]?1/4',   # 1-1/4 atau 1 1/4
        r'1[\s\-]?1/2',
        r'2',
        r'1',             # 1 inch (harus di akhir agar tidak false positive)
    ]
    
    DN_PATTERN = r'DN\s?(\d{2})'  # DN 12, DN 19, dst
    
    def parse(self, text_blob: str) -> Dict[str, Any]:
        """
        Parse OLWEG label text.
        Fokus: Standar (1SN/2SN/4SP) + Ukuran (inch atau DN)
        """
        # 1. Cleaning teks (fix common OCR errors)
        clean_text = self.clean_text(text_blob)
        clean_text = clean_text.replace("0LWEG", "OLWEG")
        clean_text = clean_text.replace("OLWE6", "OLWEG")
        clean_text = clean_text.replace("0LWE6", "OLWEG")
        
        print(f"[DEBUG] OLWEG: Analyzing -> {clean_text[:80]}...")
        
        # 2. Deteksi Standar (Tipe Kawat)
        detected_std = self._detect_standard(clean_text)
        
        # 3. Deteksi Ukuran
        detected_size = self._detect_size(clean_text)
        detected_dn = self._detect_dn(clean_text)
        
        # 4. Jika tidak ada standar terdeteksi
        if not detected_std:
            return self._fail_response(
                "Tipe standar (1SN/2SN/4SP/R1/R2) tidak terbaca pada selang OLWEG"
            )
        
        print(f"[SUCCESS] OLWEG Tipe: {detected_std}, Size: {detected_size or detected_dn or 'N/A'}")
        
        # 5. Query Database
        result = self._query_database(detected_std, detected_size, detected_dn)
        
        if result:
            return result
        
        # 6. Fallback: Tipe ketemu tapi ukuran tidak ada di database
        size_info = detected_size or (f"DN{detected_dn}" if detected_dn else "Unknown")
        return {
            "status": "partial",
            "brand": self.BRAND_NAME,
            "sku": f"OLWEG-{detected_std}-{size_info}",
            "standard": detected_std,
            "size_inch": detected_size or "",
            "size_dn": detected_dn or "",
            "pressure_bar": self._estimate_pressure(detected_std),
            "desc": f"OLWEG {detected_std} Size {size_info}",
            "confidence": 70,
            "note": "Hasil estimasi. Verifikasi manual diperlukan."
        }
    
    def _detect_standard(self, text: str) -> str:
        """Detect wire standard (1SN, 2SN, 4SP, etc)."""
        for pattern in self.STD_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                # Normalize: hapus spasi
                std = match.group(0).replace(" ", "").upper()
                return std
        return ""
    
    def _detect_size(self, text: str) -> str:
        """Detect inch size (1/2, 3/4, etc)."""
        for pattern in self.SIZE_PATTERNS:
            full_pattern = pattern + r'[\"\s]?(?:INCH)?'
            match = re.search(full_pattern, text, re.IGNORECASE)
            if match:
                size = match.group(0).strip().replace('"', '').replace('INCH', '').strip()
                return size.replace(' ', '-')  # 1 1/4 -> 1-1/4
        return ""
    
    def _detect_dn(self, text: str) -> str:
        """Detect DN size (DN12, DN19, etc)."""
        match = re.search(self.DN_PATTERN, text, re.IGNORECASE)
        if match:
            return match.group(1)  # Return just the number
        return ""
    
    def _query_database(self, std: str, size: str, dn: str) -> Dict[str, Any]:
        """Query database for matching product."""
        if self.brand_products.empty:
            return None
        
        df = self.brand_products.copy()
        
        # Filter by standard
        if std:
            std_filter = df['TIPE HOSE'].str.contains(std, na=False, case=False)
            if 'Standard' in df.columns:
                std_filter = std_filter | df['Standard'].str.contains(std, na=False, case=False)
            df = df[std_filter]
        
        if df.empty:
            return None
        
        # Filter by size
        if size and 'Hose I.D. (in)' in df.columns:
            size_clean = size.replace('-', '').replace(' ', '')
            size_filter = df['Hose I.D. (in)'].astype(str).str.replace('-', '').str.replace(' ', '').str.contains(size_clean, na=False)
            filtered = df[size_filter]
            if not filtered.empty:
                df = filtered
        elif dn and 'DN' in df.columns:
            dn_filter = df['DN'].astype(str).str.contains(dn, na=False)
            filtered = df[dn_filter]
            if not filtered.empty:
                df = filtered
        
        if df.empty:
            return None
        
        # Get first match
        product = df.iloc[0]
        
        pressure = 0
        if 'Working Pressure Bar' in product.index:
            try:
                pressure = int(float(product['Working Pressure Bar']))
            except:
                pass
        
        return self._success_response(
            sku=product['TIPE HOSE'],
            pressure_bar=pressure,
            size_inch=size or str(product.get('Hose I.D. (in)', '')),
            desc=f"OLWEG {product['TIPE HOSE']} ({std})",
            confidence=90
        )
    
    def _estimate_pressure(self, std: str) -> int:
        """Estimate working pressure based on standard."""
        pressure_map = {
            '1SN': 180,
            'R1': 180,
            'R1AT': 180,
            '2SN': 280,
            'R2': 280,
            'R2AT': 280,
            '4SP': 350,
            '4SH': 420,
            'R12': 280,
            'R13': 350,
            'R15': 420,
        }
        return pressure_map.get(std.upper(), 250)
