"""
Hose Image Enhancer - VERSI AGRESIF (Ultra Sensitive)
Industrial-grade image processing dengan Multi-Angle + Binary + Low Threshold

Strategi:
1. Denoise - Hapus bintik oli/debu
2. CLAHE - Kontras ekstrim
3. Binary - Hitam putih mutlak
4. Rotation - Scan dari berbagai sudut
5. Inverted - Versi negatif
"""

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("[WARNING] cv2 not available - image enhancement disabled")
import numpy as np
from typing import List, Optional
from pathlib import Path


class HoseImageEnhancer:
    """
    AGGRESSIVE IMAGE ENHANCEMENT
    AI tidak boleh ragu-ragu! Deteksi goresan sekecil apapun.
    """
    
    MAX_WIDTH = 1500  # Standardize size
    DENOISE_STRENGTH = 10
    CLAHE_CLIP_LIMIT = 3.0
    CLAHE_TILE_SIZE = (8, 8)
    
    @staticmethod
    def rotate_image(image: np.ndarray, angle: int) -> np.ndarray:
        """
        Rotate image tanpa memotong sudut.
        Latar belakang diisi putih (255) agar tidak mengganggu OCR.
        """
        (h, w) = image.shape[:2]
        (cX, cY) = (w // 2, h // 2)
        
        # Rotation matrix
        M = cv2.getRotationMatrix2D((cX, cY), angle, 1.0)
        
        # Hitung ukuran baru agar tidak terpotong
        cos = np.abs(M[0, 0])
        sin = np.abs(M[0, 1])
        nW = int((h * sin) + (w * cos))
        nH = int((h * cos) + (w * sin))
        
        # Adjust translation
        M[0, 2] += (nW / 2) - cX
        M[1, 2] += (nH / 2) - cY
        
        # Rotate dengan background putih
        return cv2.warpAffine(image, M, (nW, nH), borderValue=(255, 255, 255))
    
    @classmethod
    def process(cls, image_bytes: bytes, debug_mode: bool = False) -> List[np.ndarray]:
        """
        AGGRESSIVE PROCESSING - Return 5+ variasi gambar untuk OCR.
        
        Variasi yang dihasilkan:
        1. Enhanced (CLAHE) - grayscale kontras tinggi
        2. Inverted (Negatif) - kadang lebih mudah dibaca
        3. Binary (Hitam Putih Mutlak) - adaptive threshold
        4. Enhanced Rotated 90° - untuk foto vertikal
        5. Inverted Rotated 90° - negatif vertikal
        
        Returns:
            List gambar untuk di-scan semuanya
        """
        if not CV2_AVAILABLE:
            print("[WARNING] cv2 not available - skipping image enhancement")
            return []

        # 1. Decode Image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            print("[WARNING] Failed to decode image")
            return []

        # 2. Resize untuk standardisasi & kecepatan
        height, width = img.shape[:2]
        if width > cls.MAX_WIDTH:
            scale = cls.MAX_WIDTH / width
            img = cv2.resize(img, (int(width * scale), int(height * scale)))
            print(f"[INFO] Resized: {width}x{height} -> {int(width*scale)}x{int(height*scale)}")

        # 3. Grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 4. Denoise - Hapus bintik-bintik kecil (oli, debu)
        denoised = cv2.fastNlMeansDenoising(gray, h=cls.DENOISE_STRENGTH)

        # 5. CLAHE - Kontras Tinggi
        clahe = cv2.createCLAHE(
            clipLimit=cls.CLAHE_CLIP_LIMIT, 
            tileGridSize=cls.CLAHE_TILE_SIZE
        )
        enhanced = clahe.apply(denoised)

        # 6. Inverted (Negatif Film)
        inverted = cv2.bitwise_not(enhanced)

        # 7. Binary Threshold (Hitam Putih Mutlak)
        binary = cv2.adaptiveThreshold(
            enhanced, 
            255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 
            31,  # Block size
            5    # Constant
        )
        
        # 8. Binary Inverted
        binary_inv = cv2.bitwise_not(binary)

        # === KUMPULKAN PASUKAN GAMBAR ===
        # Scan SEMUA variasi! Biar AI kerja keras.
        candidates = [
            enhanced,                                    # 1. Grayscale kontras
            inverted,                                    # 2. Negatif
            binary,                                      # 3. Hitam putih
            binary_inv,                                  # 4. Hitam putih inverted
            cls.rotate_image(enhanced, 90),              # 5. Rotasi 90° (foto berdiri)
            cls.rotate_image(inverted, 90),              # 6. Negatif rotasi 90°
        ]

        # Debug: Simpan semua kandidat
        if debug_mode:
            cls._save_debug_candidates(candidates)

        print(f"[INFO] Generated {len(candidates)} image variations for OCR")
        return candidates
    
    @classmethod
    def process_ultra(cls, image_bytes: bytes, debug_mode: bool = False) -> List[np.ndarray]:
        """
        ULTRA AGGRESSIVE - 10 variasi untuk kasus ekstrim.
        
        Tambahan:
        - Rotasi 45°, -45°
        - Multiple CLAHE settings
        - Otsu threshold
        """
        # Get standard 6 variations
        candidates = cls.process(image_bytes, debug_mode=False)
        
        if not candidates:
            return []
        
        # Decode again for more processing
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return candidates
        
        # Resize
        height, width = img.shape[:2]
        if width > cls.MAX_WIDTH:
            scale = cls.MAX_WIDTH / width
            img = cv2.resize(img, (int(width * scale), int(height * scale)))
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, h=cls.DENOISE_STRENGTH)
        
        try:
            # Extra CLAHE dengan setting lebih agresif
            clahe_ultra = cv2.createCLAHE(clipLimit=5.0, tileGridSize=(4, 4))
            ultra_enhanced = clahe_ultra.apply(denoised)
            candidates.append(ultra_enhanced)
            candidates.append(cv2.bitwise_not(ultra_enhanced))
            
            # Otsu threshold
            _, otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            candidates.append(otsu)
            
            # Rotasi diagonal
            candidates.append(cls.rotate_image(candidates[0], 45))
            candidates.append(cls.rotate_image(candidates[0], -45))
            
        except Exception as e:
            print(f"[WARNING] Ultra processing partial failure: {e}")
        
        if debug_mode:
            cls._save_debug_candidates(candidates)
        
        print(f"[INFO] Ultra mode: {len(candidates)} variations generated")
        return candidates
    
    @classmethod
    def _save_debug_candidates(cls, candidates: List[np.ndarray]):
        """Save debug images to current directory."""
        try:
            for i, c in enumerate(candidates):
                filename = f"debug_candidate_{i}.jpg"
                cv2.imwrite(filename, c)
                print(f"[INFO] Saved: {filename}")
        except Exception as e:
            print(f"[WARNING] Debug save failed: {e}")
    
    @classmethod
    def process_single(cls, image_bytes: bytes) -> np.ndarray:
        """Return only the best single image (Enhanced)."""
        candidates = cls.process(image_bytes)
        return candidates[0] if candidates else None


# Shortcut function
def enhance_hose_image(image_bytes: bytes, debug: bool = False) -> List[np.ndarray]:
    """Quick access to aggressive image enhancement."""
    return HoseImageEnhancer.process(image_bytes, debug_mode=debug)


def enhance_hose_image_ultra(image_bytes: bytes, debug: bool = False) -> List[np.ndarray]:
    """Ultra aggressive mode dengan 10+ variasi."""
    return HoseImageEnhancer.process_ultra(image_bytes, debug_mode=debug)
