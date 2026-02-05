/**
 * Hose AI Scanner API Service
 * Connects frontend to Python FastAPI backend for computer vision detection
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

/**
 * Scan hose image using AI backend
 * @param {File|Blob} imageFile - Image file to scan
 * @param {boolean} debug - Include debug info in response
 * @returns {Promise<Object>} Detection result
 */
export async function scanHoseImage(imageFile, debug = false) {
    const formData = new FormData();
    formData.append('file', imageFile);

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/scan-hose?debug=${debug}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('AI Scan Error:', error);

        // Return friendly error for offline/connection issues
        if (error.message.includes('fetch') || error.message.includes('network')) {
            return {
                status: 'error',
                message: 'Tidak dapat terhubung ke AI Server. Pastikan backend berjalan di port 8000.',
                offline: true
            };
        }

        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Scan hose using raw text (for testing without OCR)
 * @param {string} text - Raw label text
 * @returns {Promise<Object>} Detection result
 */
export async function scanHoseText(text) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/scan-hose/text?text=${encodeURIComponent(text)}`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('AI Text Scan Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Get list of supported brands
 * @returns {Promise<Object>} List of brands
 */
export async function getSupportedBrands() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/brands`);
        if (!response.ok) throw new Error('Failed to fetch brands');
        return await response.json();
    } catch (error) {
        console.error('Error fetching brands:', error);
        return { brands: [], status: 'error' };
    }
}

/**
 * Get dataset statistics
 * @returns {Promise<Object>} Dataset stats
 */
export async function getDatasetStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        return await response.json();
    } catch (error) {
        console.error('Error fetching stats:', error);
        return { status: 'error' };
    }
}

/**
 * Check if AI backend is online
 * @returns {Promise<boolean>}
 */
export async function checkAIHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
            mode: 'cors'
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.warn('AI Health check failed:', error.message);
        return false;
    }
}

/**
 * Convert canvas/video frame to blob for upload
 * @param {HTMLCanvasElement} canvas 
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.9);
    });
}

/**
 * Scan multiple hose images and combine results
 * @param {File[]|Blob[]} imageFiles - Array of images to scan (max 5)
 * @param {boolean} debug - Include debug info in response
 * @returns {Promise<Object>} Combined detection result
 */
export async function scanMultipleHoseImages(imageFiles, debug = false) {
    if (!imageFiles || imageFiles.length === 0) {
        return { status: 'error', message: 'No images provided' };
    }

    if (imageFiles.length > 5) {
        return { status: 'error', message: 'Maksimal 5 foto per scan' };
    }

    const formData = new FormData();
    imageFiles.forEach((file, index) => {
        formData.append('files', file, `image_${index}.jpg`);
    });

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/scan-hose/multi?debug=${debug}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('AI Multi-Scan Error:', error);

        if (error.message.includes('fetch') || error.message.includes('network')) {
            return {
                status: 'error',
                message: 'Tidak dapat terhubung ke AI Server.',
                offline: true
            };
        }

        return {
            status: 'error',
            message: error.message
        };
    }
}

export default {
    scanHoseImage,
    scanHoseText,
    scanMultipleHoseImages,
    getSupportedBrands,
    getDatasetStats,
    checkAIHealth,
    canvasToBlob
};
