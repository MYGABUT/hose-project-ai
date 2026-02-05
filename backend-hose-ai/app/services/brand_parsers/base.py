"""
Base Hose Parser - Abstract Template (Strategy Pattern)
All brand-specific parsers MUST inherit from this class.
"""

from abc import ABC, abstractmethod
import pandas as pd
from typing import Dict, Any, Optional


class BaseHoseParser(ABC):
    """
    Abstract base class for hose brand parsers.
    
    Each brand has unique label formats and parsing logic.
    This class defines the contract that all parsers must follow.
    """
    
    # Brand identifier (override in subclass)
    BRAND_NAME: str = "UNKNOWN"
    
    # Common patterns this parser recognizes (for documentation)
    PATTERNS: list = []
    
    def __init__(self, dataset: pd.DataFrame):
        """
        Initialize parser with the product dataset.
        
        Args:
            dataset: Full product DataFrame loaded from CSV
        """
        self.dataset = dataset
        self.brand_products = self._filter_brand_products()
    
    def _filter_brand_products(self) -> pd.DataFrame:
        """
        Filter dataset to only include products from this brand.
        Override if brand column name differs.
        """
        if 'MEREK' in self.dataset.columns:
            return self.dataset[
                self.dataset['MEREK'].str.upper() == self.BRAND_NAME.upper()
            ].copy()
        return pd.DataFrame()
    
    @abstractmethod
    def parse(self, text_blob: str) -> Dict[str, Any]:
        """
        Parse OCR text and extract product specifications.
        
        Args:
            text_blob: Raw text from OCR (may contain noise)
            
        Returns:
            Dictionary with:
            - status: "success" or "failed"
            - brand: Brand name
            - sku: Product SKU/code
            - pressure_bar: Working pressure in Bar
            - size_inch: Hose inner diameter in inches
            - desc: Human-readable description
            - confidence: Match confidence (0-100)
            - reason: Failure reason if status is "failed"
        """
        pass
    
    def clean_text(self, text: str) -> str:
        """
        Basic text cleaning common to all parsers.
        Override for brand-specific cleaning.
        """
        return text.upper().strip()
    
    def get_product_count(self) -> int:
        """Get number of products in this brand's catalog."""
        return len(self.brand_products)
    
    def _success_response(
        self,
        sku: str,
        pressure_bar: int,
        size_inch: str = "",
        desc: str = "",
        confidence: int = 100,
        extra: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Helper to create success response."""
        result = {
            "status": "success",
            "brand": self.BRAND_NAME,
            "sku": sku,
            "pressure_bar": pressure_bar,
            "size_inch": size_inch,
            "desc": desc,
            "confidence": confidence
        }
        if extra:
            result.update(extra)
        return result
    
    def _fail_response(self, reason: str) -> Dict[str, Any]:
        """Helper to create failure response."""
        return {
            "status": "failed",
            "brand": self.BRAND_NAME,
            "reason": reason
        }
