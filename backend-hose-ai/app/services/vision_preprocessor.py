"""
Vision Preprocessor - Multi-Thresholding Layer with "Cat Eye Filter"
Processes images with multiple variations to capture text in various conditions
(dark, glare, faded, dirty surfaces on black hose rubber)
"""

import cv2
import numpy as np
from typing import List, Tuple
from io import BytesIO
from PIL import Image


class VisionPreprocessor:
    """
    Industrial Grade Image Preprocessor with Multi-Thresholding.
    
    Features:
    - "Cat Eye Filter" (CLAHE + Sharpening) - WAJIB untuk selang hitam
    - Ensemble Voting: Process 1 image into multiple variations
    - OCR all of them, combine results for maximum text extraction
    """
    
    def __init__(self):
        # Preprocessing configurations - CAT EYE FIRST (prioritas tertinggi)
        self.variations = [
            ('cat_eye', self._process_cat_eye),           # 🐱 Jurus Rahasia! 
            ('cat_eye_aggressive', self._process_cat_eye_aggressive),
            ('clahe', self._process_clahe),
            ('adaptive', self._process_adaptive),
            ('otsu', self._process_otsu),
            ('gamma_bright', lambda img: self._process_gamma(img, 1.5)),
            ('gamma_dark', lambda img: self._process_gamma(img, 0.7)),
            ('normal', self._process_normal),
        ]
    
    def enhance_hose_image(self, image_bytes: bytes) -> np.ndarray:
        """
        🐱 CAT EYE FILTER - Jurus Rahasia untuk Selang Hitam
        
        Selang itu permukaannya melengkung:
        - Bagian tengah kena flash (silau)
        - Bagian pinggir gelap gulita
        
        Tanpa CLAHE: AI cuma lihat silau putih dan gelap hitam. Teks hilang.
        Pakai CLAHE: AI bisa melihat teks di area gelap DAN area terang sekaligus.
        """
        # 1. Convert bytes ke Format Gambar OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            # Fallback to PIL method
            img = self._bytes_to_cv2(image_bytes)
            if img is None:
                return None

        # 2. Ubah ke Grayscale (Hitam Putih)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 3. JURUS RAHASIA: CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # Ini akan membuat teks putih yang samar jadi MENYALA TERANG
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced_img = clahe.apply(gray)

        # 4. Sharpening (Mempertegas pinggiran huruf)
        kernel = np.array([[0, -1, 0],
                           [-1, 5, -1],
                           [0, -1, 0]])
        sharp_img = cv2.filter2D(enhanced_img, -1, kernel)

        return sharp_img
    
    def preprocess_image(self, image_bytes: bytes) -> List[Tuple[str, np.ndarray]]:
        """
        Apply multiple preprocessing variations to an image.
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            List of (variation_name, processed_image) tuples
        """
        # Convert bytes to numpy array
        img = self._bytes_to_cv2(image_bytes)
        
        if img is None:
            return []
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply all variations
        results = []
        for name, processor in self.variations:
            try:
                processed = processor(gray)
                results.append((name, processed))
            except Exception as e:
                print(f"[WARNING] Variation '{name}' failed: {e}")
                continue
        
        return results
    
    def get_best_variations(self, image_bytes: bytes, top_n: int = 3) -> List[np.ndarray]:
        """
        Get the top N image variations that are most likely to produce good OCR results.
        
        ALWAYS includes cat_eye as first option (mandatory for black hose).
        Uses edge density as a heuristic for additional selections.
        """
        all_variations = self.preprocess_image(image_bytes)
        
        if not all_variations:
            return []
        
        # Force cat_eye to be first (mandatory for hose detection)
        cat_eye_img = None
        other_variations = []
        
        for name, img in all_variations:
            if name == 'cat_eye':
                cat_eye_img = img
            else:
                # Score by edge density (more edges = likely more text)
                edges = cv2.Canny(img, 50, 150)
                edge_score = np.sum(edges > 0)
                other_variations.append((edge_score, name, img))
        
        # Sort others by score (descending)
        other_variations.sort(reverse=True, key=lambda x: x[0])
        
        # Build result: Cat Eye first, then best others
        result = []
        if cat_eye_img is not None:
            result.append(cat_eye_img)
        
        # Add remaining to reach top_n
        for _, _, img in other_variations[:top_n - len(result)]:
            result.append(img)
        
        return result
    
    def _bytes_to_cv2(self, image_bytes: bytes) -> np.ndarray:
        """Convert image bytes to OpenCV format."""
        try:
            # Try direct numpy decode first
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                return img
            
            # Fallback to PIL for complex formats
            pil_image = Image.open(BytesIO(image_bytes))
            if pil_image.mode in ('RGBA', 'P'):
                pil_image = pil_image.convert('RGB')
            
            img_array = np.array(pil_image)
            return cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        except Exception as e:
            print(f"[WARNING] Image conversion error: {e}")
            return None
    
    def _process_cat_eye(self, gray: np.ndarray) -> np.ndarray:
        """
        🐱 CAT EYE FILTER (CLAHE + Sharpening)
        Teks putih samar di selang hitam jadi MENYALA TERANG!
        """
        # CLAHE dengan clipLimit 3.0 (agresif untuk selang)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Sharpening kernel untuk mempertegas huruf
        kernel = np.array([[0, -1, 0],
                           [-1, 5, -1],
                           [0, -1, 0]])
        sharp = cv2.filter2D(enhanced, -1, kernel)
        
        return sharp
    
    def _process_cat_eye_aggressive(self, gray: np.ndarray) -> np.ndarray:
        """
        🐱 CAT EYE AGGRESSIVE - Untuk selang sangat kotor/pudar
        Extra contrast boost + double sharpening
        """
        # CLAHE lebih agresif
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(4, 4))
        enhanced = clahe.apply(gray)
        
        # Double sharpening
        kernel = np.array([[0, -1, 0],
                           [-1, 5, -1],
                           [0, -1, 0]])
        sharp1 = cv2.filter2D(enhanced, -1, kernel)
        
        # Light second pass
        kernel2 = np.array([[-0.5, -0.5, -0.5],
                            [-0.5, 5, -0.5],
                            [-0.5, -0.5, -0.5]])
        sharp2 = cv2.filter2D(sharp1, -1, kernel2)
        
        return sharp2
    
    def _process_normal(self, gray: np.ndarray) -> np.ndarray:
        """Normal grayscale with slight denoising."""
        return cv2.GaussianBlur(gray, (3, 3), 0)
    
    def _process_otsu(self, gray: np.ndarray) -> np.ndarray:
        """Otsu's binarization - automatic thresholding."""
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return thresh
    
    def _process_adaptive(self, gray: np.ndarray) -> np.ndarray:
        """Adaptive thresholding - handles uneven lighting/glare."""
        return cv2.adaptiveThreshold(
            gray, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 
            11, 2
        )
    
    def _process_gamma(self, gray: np.ndarray, gamma: float) -> np.ndarray:
        """Gamma correction - brighten (>1) or darken (<1) image."""
        inv_gamma = 1.0 / gamma
        table = np.array([
            ((i / 255.0) ** inv_gamma) * 255 
            for i in np.arange(0, 256)
        ]).astype("uint8")
        return cv2.LUT(gray, table)
    
    def _process_clahe(self, gray: np.ndarray) -> np.ndarray:
        """
        Standard CLAHE - Contrast Limited Adaptive Histogram Equalization.
        """
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(gray)
    
    def _process_morphological(self, gray: np.ndarray) -> np.ndarray:
        """Morphological operations to clean up text."""
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        kernel = np.ones((2, 2), np.uint8)
        opening = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
        return opening


# Singleton instance
vision_preprocessor = VisionPreprocessor()

