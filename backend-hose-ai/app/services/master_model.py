"""
Master Hose Model - Industrial Grade Detection Logic
Combines Fuzzy Logic (brand detection) + Regex Mapping (spec extraction)
with fallback mechanisms for unknown brands
"""

import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from fuzzywuzzy import process, fuzz


class MasterHoseModel:
    """
    The core intelligence layer for hose detection.
    
    Features:
    - Fuzzy brand matching (handles OCR typos like "EAT0N" -> "EATON")
    - Regex-based specification extraction from JSON config
    - Automatic fallback to generic patterns when brand not found
    - Multi-pass text analysis for maximum extraction
    """
    
    def __init__(self, config_path: str = None):
        """
        Initialize with pattern configuration.
        
        Args:
            config_path: Path to hose_patterns.json
        """
        if config_path is None:
            # Default path relative to this file
            base_dir = Path(__file__).resolve().parent.parent.parent
            config_path = base_dir / "config" / "hose_patterns.json"
        
        self.config_path = Path(config_path)
        self.mapping = self._load_config()
        self.brand_map = self._build_brand_map()
        
        print(f"[INFO] MasterHoseModel loaded with {len(self.brand_map)} brand triggers")
    
    def _load_config(self) -> Dict:
        """Load regex patterns from JSON config."""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                print(f"[SUCCESS] Loaded pattern config from {self.config_path.name}")
                return config
        except FileNotFoundError:
            print(f"[WARNING] Config not found: {self.config_path}, using defaults")
            return self._get_default_config()
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON config: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Fallback configuration if JSON not found."""
        return {
            "MASTER_FALLBACK": {
                "spec_patterns": [
                    {"type": "PRESSURE", "regex": "[0-9]{2,4}\\s?(PSI|BAR)", "desc": "Pressure"},
                    {"type": "STD", "regex": "(R1|R2|4SP|4SH)", "desc": "Standard"},
                    {"type": "SIZE", "regex": "(1/4|3/8|1/2|3/4|1)", "desc": "Size"},
                ]
            }
        }
    
    def _build_brand_map(self) -> Dict[str, str]:
        """Build flat map of trigger words to brand names."""
        brand_map = {}
        for brand, data in self.mapping.items():
            if 'brand_triggers' in data:
                for trigger in data['brand_triggers']:
                    brand_map[trigger.upper()] = brand
        return brand_map
    
    def analyze(self, raw_text_combined: str) -> Dict[str, Any]:
        """
        Main analysis function.
        
        Args:
            raw_text_combined: Combined text from multi-threshold OCR
            
        Returns:
            Structured detection result
        """
        if not raw_text_combined or len(raw_text_combined.strip()) < 3:
            return {
                "status": "error",
                "message": "Input text terlalu pendek",
                "brand": None
            }
        
        raw_text_upper = raw_text_combined.upper()
        
        # === STAGE 1: BRAND DETECTION (Fuzzy Matching) ===
        detected_brand = self._detect_brand(raw_text_upper)
        
        # Determine which pattern profile to use
        if detected_brand and detected_brand in self.mapping:
            active_profile = detected_brand
        else:
            active_profile = "MASTER_FALLBACK"
        
        print(f"[INFO] Using profile: {active_profile}")
        
        # === STAGE 2: SPEC EXTRACTION (Regex Mapping) ===
        extracted = self._extract_specs(raw_text_upper, active_profile)
        
        # === STAGE 3: PRESSURE NORMALIZATION ===
        pressure_bar = self._normalize_pressure(extracted)
        
        # === STAGE 4: BUILD RESULT ===
        result = {
            "status": "success" if detected_brand or extracted else "partial",
            "brand": detected_brand or "UNKNOWN",
            "profile_used": active_profile,
            "raw_text_sample": raw_text_combined[:100] + "..." if len(raw_text_combined) > 100 else raw_text_combined,
            **extracted
        }
        
        # Add normalized pressure if available
        if pressure_bar:
            result["pressure_bar"] = pressure_bar
        
        # Generate SKU if not directly found
        if "SKU" not in result and "STD" in result:
            size = result.get("SIZE", result.get("SIZE_DN", result.get("SIZE_MM", "")))
            result["sku"] = f"{result['STD']}-{size}".strip("-")
        elif "SKU" in result:
            result["sku"] = result["SKU"]
        else:
            result["sku"] = "UNKNOWN"
        
        # Confidence score based on what was found
        result["confidence"] = self._calculate_confidence(result)
        
        return result
    
    def _detect_brand(self, text: str) -> Optional[str]:
        """
        Detect brand using fuzzy matching.
        Handles OCR errors like "EAT0N" -> "EATON".
        """
        all_triggers = list(self.brand_map.keys())
        words = text.split()
        
        for word in words:
            # Clean word (remove punctuation)
            clean_word = re.sub(r'[^A-Z0-9]', '', word)
            if len(clean_word) < 3:
                continue
            
            # Try exact match first
            if clean_word in self.brand_map:
                return self.brand_map[clean_word]
            
            # Fuzzy match
            match, score = process.extractOne(clean_word, all_triggers)
            if score >= 85:  # High confidence threshold
                return self.brand_map[match]
        
        return None
    
    def _extract_specs(self, text: str, profile: str) -> Dict[str, str]:
        """
        Extract specifications using regex patterns from config.
        """
        extracted = {}
        
        # Get patterns for this profile
        profile_data = self.mapping.get(profile, {})
        patterns = profile_data.get('spec_patterns', [])
        
        # Also add fallback patterns if not already using fallback
        if profile != "MASTER_FALLBACK":
            fallback_patterns = self.mapping.get("MASTER_FALLBACK", {}).get("spec_patterns", [])
            patterns = patterns + fallback_patterns
        
        for pattern_def in patterns:
            pattern_type = pattern_def['type']
            regex_str = pattern_def['regex']
            
            # Skip if we already have this type (first match wins)
            if pattern_type in extracted:
                continue
            
            try:
                regex = re.compile(regex_str, re.IGNORECASE)
                match = regex.search(text)
                
                if match:
                    value = match.group(0).strip()
                    extracted[pattern_type] = value
                    
            except re.error as e:
                print(f"[WARNING] Invalid regex '{regex_str}': {e}")
                continue
        
        return extracted
    
    def _normalize_pressure(self, extracted: Dict[str, str]) -> Optional[int]:
        """
        Convert pressure to BAR format.
        """
        # Check for existing pressure values
        if "PRESSURE_BAR" in extracted:
            num = re.search(r'\d+', extracted["PRESSURE_BAR"])
            if num:
                return int(num.group(0))
        
        if "PRESSURE_PSI" in extracted:
            num = re.search(r'\d+', extracted["PRESSURE_PSI"])
            if num:
                psi = int(num.group(0))
                return int(psi / 14.5)  # PSI to Bar
        
        if "PRESSURE_MPA" in extracted:
            num = re.search(r'\d+', extracted["PRESSURE_MPA"])
            if num:
                mpa = int(num.group(0))
                return mpa * 10  # MPa to Bar
        
        # Legacy field
        if "PRESSURE" in extracted:
            val = extracted["PRESSURE"].upper()
            num = re.search(r'\d+', val)
            if num:
                value = int(num.group(0))
                if "PSI" in val:
                    return int(value / 14.5)
                elif "MPA" in val:
                    return value * 10
                else:
                    return value  # Assume Bar
        
        return None
    
    def _calculate_confidence(self, result: Dict[str, Any]) -> int:
        """
        Calculate confidence score based on extraction completeness.
        """
        score = 0
        max_score = 100
        
        # Brand detected (30 points)
        if result.get("brand") and result["brand"] != "UNKNOWN":
            score += 30
        
        # SKU found (25 points)
        if result.get("sku") and result["sku"] != "UNKNOWN":
            score += 25
        elif result.get("SKU"):
            score += 25
        
        # Pressure found (20 points)
        if result.get("pressure_bar"):
            score += 20
        
        # Size found (15 points)
        if any(k in result for k in ["SIZE", "SIZE_DN", "SIZE_MM"]):
            score += 15
        
        # Standard found (10 points)
        if result.get("STD"):
            score += 10
        
        return min(score, max_score)
    
    def get_supported_brands(self) -> List[str]:
        """Get list of supported brand names."""
        return [k for k in self.mapping.keys() if k != "MASTER_FALLBACK"]
    
    def reload_config(self):
        """Hot-reload configuration without restart."""
        self.mapping = self._load_config()
        self.brand_map = self._build_brand_map()
        print("[INFO] Configuration reloaded")


# Singleton instance
master_model = MasterHoseModel()
