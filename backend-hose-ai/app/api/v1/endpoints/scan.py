"""
Scan Endpoint - EasyOCR Version (Stable for Python 3.12)
Multi-rotation scanning with enhanced preprocessing
"""
import os
# JURUS ANTI CRASH WINDOWS - must be before other imports
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Optional
import time

from app.services.ocr_engine import ocr_engine
from app.services.master_model import master_model


router = APIRouter()


@router.post("/scan-hose")
async def scan_hose_endpoint(
    file: UploadFile = File(...),
    debug: Optional[bool] = Query(False, description="Return debug info"),
):
    """
    🔥 Industrial Grade Hose Detection with EasyOCR
    
    Pipeline:
    1. Image Enhancement (CLAHE for black hoses)
    2. Multi-Rotation Scan (0°, 90°, 180°, 270°)
    3. Text Fusion (Combine all findings)
    4. Master Model Analysis (Brand detection + Regex parsing)
    
    Returns:
        Detected hose specifications
    """
    start_time = time.time()
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File harus berupa gambar (JPEG/PNG)"
        )
    
    try:
        # Read image bytes
        image_bytes = await file.read()
        
        # Extract text with multi-rotation
        if debug:
            ocr_result = ocr_engine.extract_with_details(image_bytes)
            raw_text = ocr_result.get("text", "")
        else:
            raw_text = ocr_engine.extract_text(image_bytes, use_multi_rotation=True)
        
        # Check if any text was found
        if not raw_text.strip():
            return {
                "status": "no_text",
                "message": "Tidak ada teks terdeteksi. Coba foto lebih dekat atau kontras lebih tinggi.",
                "suggestion": "Pastikan label tidak tertutup oli dan pencahayaan cukup",
                "process_time_ms": int((time.time() - start_time) * 1000),
                "rotations_tried": 4
            }
        
        # Master Model Analysis
        result = master_model.analyze(raw_text)
        
        # Add metadata
        result["process_time_ms"] = int((time.time() - start_time) * 1000)
        result["engine"] = "EasyOCR-MultiRotation"
        result["mode"] = "standard"
        
        # Debug info
        if debug:
            result["debug"] = {
                "raw_text": raw_text,
                "word_count": len(raw_text.split()),
                "detections": ocr_result.get("detections", [])[:10]  # Limit to first 10
            }
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )


@router.post("/scan-hose/text")
async def scan_hose_text_endpoint(
    text: str = Query(..., description="Raw text from OCR or manual input")
):
    """🧪 Test Analysis with Raw Text (bypass OCR)"""
    start_time = time.time()
    
    if not text or len(text.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Text input terlalu pendek (minimum 3 karakter)"
        )
    
    result = master_model.analyze(text)
    result["process_time_ms"] = int((time.time() - start_time) * 1000)
    result["engine"] = "EasyOCR-MultiRotation"
    result["mode"] = "text_input"
    
    return result


@router.get("/brands")
async def get_supported_brands():
    """📋 Get Supported Brands"""
    return {
        "status": "success",
        "brands": master_model.get_supported_brands(),
        "total": len(master_model.get_supported_brands())
    }


@router.get("/engine-info")
async def get_engine_info():
    """⚙️ Get OCR Engine Information"""
    return {
        "status": "success",
        "engine": ocr_engine.get_engine_info(),
        "model": {
            "type": "MasterHoseModel",
            "brands": master_model.get_supported_brands(),
            "fallback": "MASTER_FALLBACK enabled"
        }
    }


@router.post("/reload-config")
async def reload_configuration():
    """🔄 Hot-Reload Pattern Configuration"""
    try:
        master_model.reload_config()
        return {
            "status": "success",
            "message": "Configuration reloaded",
            "brands": master_model.get_supported_brands()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan-hose/multi")
async def scan_hose_multi_endpoint(
    files: list[UploadFile] = File(..., description="Multiple images of the same hose"),
    debug: Optional[bool] = Query(False, description="Return debug info"),
):
    """
    📸 Multi-Photo Hose Scanning
    
    Scan multiple photos of the same hose and combine OCR results.
    Useful for long hoses where label info is spread across different sections.
    
    Pipeline:
    1. OCR each image separately
    2. Combine all text results
    3. Deduplicate words
    4. Analyze combined text with Master Model
    
    Returns:
        Combined hose specifications from all photos
    """
    start_time = time.time()
    
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=400,
            detail="Minimal 1 file gambar diperlukan"
        )
    
    if len(files) > 5:
        raise HTTPException(
            status_code=400,
            detail="Maksimal 5 foto per scan"
        )
    
    try:
        all_texts = []
        images_processed = 0
        
        for i, file in enumerate(files):
            # Validate each file
            if not file.content_type or not file.content_type.startswith('image/'):
                print(f"[WARNING] Skipping non-image file: {file.filename}")
                continue
            
            # Read and OCR each image
            image_bytes = await file.read()
            raw_text = ocr_engine.extract_text(image_bytes, use_multi_rotation=True)
            
            if raw_text.strip():
                all_texts.append(raw_text)
                images_processed += 1
                print(f"📸 Image {i+1}: Found {len(raw_text.split())} words")
            else:
                print(f"📸 Image {i+1}: No text detected")
        
        # Combine all texts
        combined_text = " ".join(all_texts)
        
        # Deduplicate words (keep order)
        words = combined_text.upper().split()
        unique_words = []
        seen = set()
        for w in words:
            if w not in seen and len(w) >= 2:
                unique_words.append(w)
                seen.add(w)
        
        final_text = " ".join(unique_words)
        
        if not final_text.strip():
            return {
                "status": "no_text",
                "message": f"Tidak ada teks terdeteksi dari {len(files)} foto. Coba foto lebih dekat.",
                "images_processed": images_processed,
                "process_time_ms": int((time.time() - start_time) * 1000)
            }
        
        # Master Model Analysis
        result = master_model.analyze(final_text)
        
        # Add metadata
        result["process_time_ms"] = int((time.time() - start_time) * 1000)
        result["engine"] = "EasyOCR-MultiPhoto"
        result["mode"] = "multi_photo"
        result["images_uploaded"] = len(files)
        result["images_processed"] = images_processed
        result["unique_words"] = len(unique_words)
        
        # Debug info
        if debug:
            result["debug"] = {
                "texts_per_image": all_texts,
                "combined_text": final_text,
                "total_words_before_dedup": len(words)
            }
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing images: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """🏥 Health Check"""
    return {
        "status": "healthy",
        "engine": "EasyOCR",
        "ready": True,
        "features": ["single_scan", "multi_photo_scan", "text_input"]
    }
