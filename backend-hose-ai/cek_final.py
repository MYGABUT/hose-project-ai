# -*- coding: utf-8 -*-
"""
Test EasyOCR - Stable OCR Engine
"""
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"  # Anti-crash

import sys
sys.stdout.reconfigure(encoding='utf-8')

import numpy
import cv2
import easyocr

print("=" * 60)
print("EasyOCR Test - Stable Version")
print("=" * 60)

print(f"\nNumpy Version  : {numpy.__version__}")
print(f"OpenCV Version : {cv2.__version__}")

# Test image
image_path = r"C:\Users\micha\ocr at\Dataset_Magang\datateshose1\IMG20251127163520.jpg"

print(f"\nImage: {os.path.basename(image_path)}")

# Initialize EasyOCR
print("\nInitializing EasyOCR (downloading models if needed)...")
reader = easyocr.Reader(['en'], gpu=False)
print("[OK] EasyOCR ready!")

# Load and resize image
img = cv2.imread(image_path)
h, w = img.shape[:2]
scale = 1200 / max(h, w)  # Resize to max 1200px
img = cv2.resize(img, (int(w * scale), int(h * scale)))
print(f"Image resized to: {img.shape}")

# Run OCR
print("\nRunning OCR...")
results = reader.readtext(img)

if results:
    print(f"\n[SUCCESS] Found {len(results)} text regions!\n")
    print("DETECTED TEXT:")
    print("-" * 60)
    for i, (bbox, text, conf) in enumerate(results):
        print(f"[{i+1:2d}] {text:50s} ({conf:.2%})")
else:
    print("[WARN] No text detected")

print("\n" + "=" * 60)
print("TEST COMPLETE - EasyOCR is working!")
print("=" * 60)
