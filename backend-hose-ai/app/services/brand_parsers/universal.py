"""
Universal Hose Parser - "Otak Cadangan"
Untuk selang tanpa merek / merek tidak dikenal / merek lokal

Konsep: "Saya tidak tahu siapa namamu (Merek), tapi saya tahu apa spesifikasimu (Spek)."

Fitur:
- Deteksi standar internasional (SAE/DIN)
- Deteksi ukuran (inch/DN)
- Deteksi tekanan (PSI/Bar)
- Rekomendasi produk pengganti dari database
"""

import re
import pandas as pd
from typing import Dict, Any, List
from .base import BaseHoseParser


class UniversalParser(BaseHoseParser):
    """
    Universal Parser - Fallback untuk merek yang tidak dikenal.
    
    Mencari pola umum (R1, R2, 4SP, PSI, Bar, Inch) tanpa peduli merek.
    Kemudian mencari REKOMENDASI produk yang setara dari database.
    """
    
    BRAND_NAME = "UNKNOWN (GENERIC)"
    
    # Standar internasional pattern
    # \b = word boundary agar "BAR1" tidak terbaca "R1"
    STD_PATTERNS = [
        r'\bR1\s?AT?\b',
        r'\bR2\s?AT?\b',
        r'\bR12\b',
        r'\bR13\b',
        r'\bR15\b',
        r'\b1\s?SN\b',
        r'\b2\s?SN\b',
        r'\b4\s?SP\b',
        r'\b4\s?SH\b',
    ]
    
    # Size patterns
    SIZE_PATTERNS = [
        r'(1/4|3/8|1/2|5/8|3/4|1[\s-]?1/4|1[\s-]?1/2|2|1)[\"\s]?(?:INCH)?',
    ]
    
    DN_PATTERN = r'DN\s?(\d{2})'
    
    # Pressure patterns
    PSI_PATTERN = r'(\d{3,5})\s?PSI'
    BAR_PATTERN = r'(\d{2,4})\s?BAR'
    MPA_PATTERN = r'(\d{1,3})\s?MPA'
    
    def parse(self, text_blob: str) -> Dict[str, Any]:
        """
        Parse selang tanpa merek menggunakan spesifikasi internasional.
        Kemudian cari rekomendasi produk setara.
        """
        print(f"[INFO] UNIVERSAL PARSER analyzing: {text_blob[:60]}...")
        clean_text = self.clean_text(text_blob)
        
        detected_specs = {}
        
        # 1. Deteksi Standar
        std = self._detect_standard(clean_text)
        if std:
            detected_specs['type'] = std
        
        # 2. Deteksi Ukuran
        size_inch = self._detect_size(clean_text)
        size_dn = self._detect_dn(clean_text)
        
        if size_inch:
            detected_specs['size_inch'] = size_inch
        if size_dn:
            detected_specs['size_dn'] = size_dn
        
        # 3. Deteksi Tekanan
        pressure = self._detect_pressure(clean_text)
        if pressure:
            detected_specs.update(pressure)
        
        print(f"[INFO] Detected specs: {detected_specs}")
        
        # 4. Jika minimal TIPE dan UKURAN ketemu, cari REKOMENDASI
        if 'type' in detected_specs and ('size_inch' in detected_specs or 'size_dn' in detected_specs):
            
            # Cari rekomendasi produk pengganti
            recommendations = self._find_recommendations(detected_specs)
            
            # Estimasi pressure jika tidak terdeteksi
            if 'bar' not in detected_specs and 'psi' not in detected_specs:
                estimated_bar = self._estimate_pressure(std)
                detected_specs['bar_estimated'] = estimated_bar
            
            return {
                "status": "success",
                "brand": self.BRAND_NAME,
                "detected_specs": detected_specs,
                "sku": f"GENERIC-{std}-{size_inch or size_dn}",
                "standard": std,
                "size_inch": size_inch or "",
                "size_dn": size_dn or "",
                "pressure_bar": int(detected_specs.get('bar', detected_specs.get('bar_estimated', 0))),
                "message": "Merek tidak terbaca, tapi spesifikasi ditemukan.",
                "recommendations": recommendations,
                "confidence": 75 if len(detected_specs) >= 3 else 60,
                "desc": f"Generic {std} Size {size_inch or 'DN' + str(size_dn)}"
            }
        
        # 5. Fallback: Cek apakah ada info apapun yang terbaca
        if detected_specs:
            return {
                "status": "partial",
                "brand": self.BRAND_NAME,
                "detected_specs": detected_specs,
                "message": "Hanya sebagian spek terbaca. Verifikasi manual.",
                "recommendations": [],
                "confidence": 40
            }
        
        return self._fail_response(
            "Merek tidak ada & Spek (R1/R2/Ukuran) tidak terbaca jelas."
        )
    
    def _detect_standard(self, text: str) -> str:
        """Detect international standard (R1, R2, 2SN, 4SP, etc)."""
        for pattern in self.STD_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                std = match.group(0).replace(" ", "").upper()
                return std
        return ""
    
    def _detect_size(self, text: str) -> str:
        """Detect inch size."""
        for pattern in self.SIZE_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                size = match.group(1).replace(" ", "-").strip().replace('"', '')
                return size
        return ""
    
    def _detect_dn(self, text: str) -> str:
        """Detect DN metric size."""
        match = re.search(self.DN_PATTERN, text, re.IGNORECASE)
        if match:
            return match.group(1)
        return ""
    
    def _detect_pressure(self, text: str) -> Dict[str, str]:
        """Detect pressure (PSI or Bar)."""
        result = {}
        
        psi_match = re.search(self.PSI_PATTERN, text, re.IGNORECASE)
        if psi_match:
            result['psi'] = psi_match.group(1)
            # Convert PSI to Bar
            result['bar'] = str(int(int(psi_match.group(1)) / 14.5))
        
        bar_match = re.search(self.BAR_PATTERN, text, re.IGNORECASE)
        if bar_match:
            result['bar'] = bar_match.group(1)
        
        mpa_match = re.search(self.MPA_PATTERN, text, re.IGNORECASE)
        if mpa_match:
            result['mpa'] = mpa_match.group(1)
            result['bar'] = str(int(mpa_match.group(1)) * 10)
        
        return result
    
    def _estimate_pressure(self, std: str) -> int:
        """Estimate pressure based on standard type."""
        pressure_map = {
            'R1': 180, 'R1AT': 180, '1SN': 180,
            'R2': 280, 'R2AT': 280, '2SN': 280,
            'R12': 280,
            '4SP': 350, 'R13': 350,
            '4SH': 420, 'R15': 420,
        }
        return pressure_map.get(std.upper(), 250)
    
    def _find_recommendations(self, specs: Dict) -> List[str]:
        """
        FITUR PALING MAHAL: Cari produk pengganti di database.
        
        Customer bawa selang butut, kita rekomendasikan barang pengganti.
        """
        if self.dataset.empty:
            return ["Database kosong - tidak ada rekomendasi"]
        
        df = self.dataset.copy()
        recommendations = []
        
        try:
            # Filter by standard type
            if 'type' in specs:
                std = specs['type']
                # Cari yang mengandung tipe standar yang sama
                std_filter = df['TIPE HOSE'].str.contains(std, na=False, case=False)
                if 'Standard' in df.columns:
                    std_filter = std_filter | df['Standard'].str.contains(std, na=False, case=False)
                df_filtered = df[std_filter]
                
                if df_filtered.empty:
                    # Fallback: cari yang mirip (2SN ~ R2)
                    equivalents = {
                        '2SN': ['R2', '2SN'],
                        'R2': ['R2', '2SN'],
                        '1SN': ['R1', '1SN'],
                        'R1': ['R1', '1SN'],
                        '4SP': ['4SP', 'R12'],
                        '4SH': ['4SH', 'R13'],
                    }
                    if std.upper() in equivalents:
                        for equiv in equivalents[std.upper()]:
                            equiv_filter = df['TIPE HOSE'].str.contains(equiv, na=False, case=False)
                            df_filtered = df[equiv_filter]
                            if not df_filtered.empty:
                                break
                
                if not df_filtered.empty:
                    df = df_filtered
            
            # Filter by size if available
            if 'size_inch' in specs and 'Hose I.D. (in)' in df.columns:
                size = specs['size_inch'].replace('-', '')
                size_filter = df['Hose I.D. (in)'].astype(str).str.replace('-', '').str.contains(size, na=False)
                if size_filter.any():
                    df = df[size_filter]
            elif 'size_dn' in specs and 'DN' in df.columns:
                dn = specs['size_dn']
                dn_filter = df['DN'].astype(str).str.contains(dn, na=False)
                if dn_filter.any():
                    df = df[dn_filter]
            
            # Ambil 3 rekomendasi teratas
            for _, row in df.head(3).iterrows():
                brand = row.get('MEREK', 'Unknown')
                tipe = row.get('TIPE HOSE', '')
                pressure = row.get('Working Pressure Bar', 0)
                
                try:
                    pressure = int(float(pressure))
                except:
                    pressure = 0
                
                rec = f"{brand} {tipe} ({pressure} Bar)"
                recommendations.append(rec)
        
        except Exception as e:
            print(f"[WARNING] Recommendation search error: {e}")
            recommendations.append("Error mencari rekomendasi")
        
        if not recommendations:
            recommendations.append("Tidak ada produk setara di database")
        
        return recommendations


# Singleton instance
universal_parser = None

def get_universal_parser(dataset: pd.DataFrame) -> UniversalParser:
    """Get or create universal parser instance."""
    global universal_parser
    if universal_parser is None:
        universal_parser = UniversalParser(dataset)
    return universal_parser
