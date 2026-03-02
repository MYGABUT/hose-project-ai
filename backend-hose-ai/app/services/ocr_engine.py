"""
Enhanced OCR Engine - Using EasyOCR (Stable for Python 3.12)
Industrial Grade Text Extraction with Multi-Rotation
"""
import os
# Anti-crash for Windows DLL conflicts
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import numpy as np
from PIL import Image
from io import BytesIO
from typing import List, Dict, Any

# Optional heavy dependencies - graceful fallback if not installed
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("[WARNING] cv2 not available - image preprocessing disabled")

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("[WARNING] easyocr not available - OCR features disabled")

from app.core.config import settings


class OCREngine:
    """
    Industrial Grade OCR Engine using EasyOCR.
    
    Features:
    - Multi-rotation scanning (0°, 90°, 180°, 270°)
    - Confidence-based text filtering
    - Automatic text deduplication
    - Image enhancement for black hoses
    """
    
    _instance = None
    _reader = None
    
    def __new__(cls):
        """Singleton pattern - only one OCR instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        print("[INFO] Initializing EasyOCR Engine...")
        
        # Initialize EasyOCR (lazy loading to avoid startup delay)
        self._reader = None
        self.min_confidence = 0.3  # Minimum confidence threshold
        self._initialized = True
        
        print("[SUCCESS] EasyOCR Engine Ready!")
    
    @property
    def reader(self):
        """Lazy load EasyOCR reader."""
        if self._reader is None:
            print("[INFO] Loading EasyOCR models (first time only)...")
            self._reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            print("[SUCCESS] EasyOCR models loaded!")
        return self._reader
    
    def extract_text(self, image_bytes: bytes, use_multi_rotation: bool = True) -> str:
        """
        Extract text from image with optional multi-rotation.
        """
        if use_multi_rotation:
            return self._extract_with_rotation(image_bytes)
        else:
            return self._extract_single(image_bytes)
    
    def _preprocess_image(self, img: np.ndarray) -> np.ndarray:
        """Preprocess image for better OCR on black hoses."""
        # Resize to reasonable size
        h, w = img.shape[:2]
        max_dim = 1500
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))
        
        # Convert to grayscale for enhancement
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img
        
        # CLAHE enhancement for black hoses
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Convert back to BGR for EasyOCR
        enhanced_bgr = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
        
        return enhanced_bgr
    
    def _extract_with_rotation(self, image_bytes: bytes) -> str:
        """
        Extract text with multiple rotations to handle any orientation.
        """
        try:
            # Load image
            pil_image = Image.open(BytesIO(image_bytes))
            if pil_image.mode in ('RGBA', 'P'):
                pil_image = pil_image.convert('RGB')
            
            img = np.array(pil_image)
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            
            # Preprocess
            img = self._preprocess_image(img)
            
            all_texts = []
            best_results = []
            best_confidence = 0
            
            # Try multiple rotations
            for angle in [0, 90, 180, 270]:
                if angle == 0:
                    rotated = img
                else:
                    rotated = self._rotate_image(img, angle)
                
                # Run OCR
                results = self.reader.readtext(rotated)
                
                # Calculate average confidence
                if results:
                    confidences = [r[2] for r in results if r[2] >= self.min_confidence]
                    avg_conf = sum(confidences) / len(confidences) if confidences else 0
                    
                    if avg_conf > best_confidence:
                        best_confidence = avg_conf
                        best_results = results
                    
                    # Collect all high-confidence text
                    for bbox, text, conf in results:
                        if conf >= self.min_confidence:
                            all_texts.append(text.upper())
            
            # Combine and deduplicate
            unique_texts = list(dict.fromkeys(all_texts))  # Preserve order, remove duplicates
            
            combined = " ".join(unique_texts)
            print(f"[INFO] OCR found {len(unique_texts)} unique text regions")
            
            return combined
            
        except Exception as e:
            print(f"[WARNING] OCR extraction failed: {e}")
            return ""
    
    def _rotate_image(self, img: np.ndarray, angle: int) -> np.ndarray:
        """Rotate image by given angle (90, 180, 270)."""
        if angle == 90:
            return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
        elif angle == 180:
            return cv2.rotate(img, cv2.ROTATE_180)
        elif angle == 270:
            return cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
        return img
    
    def _extract_single(self, image_bytes: bytes) -> str:
        """Single-pass OCR extraction."""
        try:
            pil_image = Image.open(BytesIO(image_bytes))
            if pil_image.mode in ('RGBA', 'P'):
                pil_image = pil_image.convert('RGB')
            
            img = np.array(pil_image)
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            img = self._preprocess_image(img)
            
            results = self.reader.readtext(img)
            
            texts = []
            for bbox, text, conf in results:
                if conf >= self.min_confidence:
                    texts.append(text.upper())
            
            return " ".join(texts)
            
        except Exception as e:
            print(f"[WARNING] Single OCR failed: {e}")
            return ""
    
    def extract_with_details(self, image_bytes: bytes) -> Dict[str, Any]:
        """Extract text with full details including bounding boxes."""
        try:
            pil_image = Image.open(BytesIO(image_bytes))
            if pil_image.mode in ('RGBA', 'P'):
                pil_image = pil_image.convert('RGB')
            
            img = np.array(pil_image)
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            img = self._preprocess_image(img)
            
            all_detections = []
            combined_text = []
            
            # Try all rotations
            for angle in [0, 90, 180, 270]:
                if angle == 0:
                    rotated = img
                else:
                    rotated = self._rotate_image(img, angle)
                
                results = self.reader.readtext(rotated)
                
                for bbox, text, conf in results:
                    if conf >= self.min_confidence:
                        combined_text.append(text.upper())
                        all_detections.append({
                            "text": text,
                            "confidence": round(conf, 3),
                            "rotation": angle,
                            "bbox": [[int(p[0]), int(p[1])] for p in bbox]
                        })
            
            # Deduplicate
            unique_texts = list(dict.fromkeys(combined_text))
            
            return {
                "text": " ".join(unique_texts),
                "text_combined": " ".join(unique_texts),
                "detections": all_detections,
                "rotations_tried": 4,
                "total_detections": len(all_detections),
                "unique_texts": len(unique_texts)
            }
            
        except Exception as e:
            return {
                "text": "",
                "detections": [],
                "error": str(e)
            }
    
    def get_engine_info(self) -> Dict[str, Any]:
        """Get OCR engine information."""
        return {
            "engine": "EasyOCR",
            "version": "Stable",
            "language": "en",
            "min_confidence": self.min_confidence,
            "features": ["multi-rotation", "CLAHE enhancement", "black hose optimized"]
        }


# Singleton instance
ocr_engine = OCREngine()
