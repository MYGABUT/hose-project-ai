/**
 * WMS Batch API Service
 * Connects frontend to WMS batch management system
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';
console.log(`🔌 WMS API initialized at: ${API_BASE_URL}`);

/**
 * Get available storage locations
 * @param {Object} params - Filter parameters
 * @returns {Promise<Object>} List of locations
 */
export async function getLocations(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.zone) queryParams.append('zone', params.zone);
        if (params.type) queryParams.append('type', params.type);
        if (params.search) queryParams.append('search', params.search);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/locations?${queryParams.toString()}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Locations Error:', error);
        return {
            status: 'error',
            message: error.message,
            data: []
        };
    }
}

/**
 * Receive new batch (Barang Masuk)
 * @param {Object} batchData - Batch data from form
 * @returns {Promise<Object>} Save result with barcode
 */
export async function receiveBatch(batchData) {
    try {
        // Build specifications object from form data
        const specifications = {
            standard: batchData.standard,
            size_inch: batchData.sizeInch,
            size_dn: batchData.sizeDN,
            wire_type: batchData.wireType,
            working_pressure_bar: batchData.workingPressureBar,
            working_pressure_psi: batchData.workingPressurePsi,
            burst_pressure_bar: batchData.burstPressureBar,
            temperature_range: batchData.temperatureRange,
            hose_od_mm: batchData.hoseODmm,
            hose_id_mm: batchData.hoseIDmm,
            bend_radius_mm: batchData.bendRadiusMm,
        };

        const response = await fetch(`${API_BASE_URL}/api/v1/batches/inbound`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Product identification
                product_sku: batchData.productSku || null,

                // Product creation data (auto-create if not found)
                brand: batchData.brand,
                standard: batchData.standard,
                size_inch: batchData.sizeInch,
                size_dn: batchData.sizeDN,
                wire_type: batchData.wireType,
                working_pressure_bar: batchData.workingPressureBar ? parseFloat(batchData.workingPressureBar) : null,
                working_pressure_psi: batchData.workingPressurePsi ? parseFloat(batchData.workingPressurePsi) : null,

                // Location
                location_code: batchData.location || 'WH1-STAGING-IN',

                // Batch info
                batch_number: batchData.batchNumber,
                quantity: parseFloat(batchData.lengthMeter) || parseFloat(batchData.quantity) || 1,
                cost_price: batchData.costPrice ? parseFloat(batchData.costPrice) : null,

                // Source tracking
                source_type: batchData.source || 'MANUAL',
                source_reference: batchData.sourceReference,

                // AI Scanner data
                ai_confidence: batchData.confidence ? parseInt(batchData.confidence) : null,
                ai_raw_text: batchData.notes,

                // User
                received_by: batchData.createdBy || 'system',
                notes: batchData.notes,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Gagal menyimpan batch');
        }

        return result;
    } catch (error) {
        console.error('Receive Batch Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Build SKU from form data
 */
function buildSku(data) {
    const parts = ['HOSE'];
    if (data.brand) parts.push(data.brand.substring(0, 3).toUpperCase());
    if (data.standard) parts.push(data.standard);
    if (data.sizeInch) {
        // Convert 1/2 to 050, 3/4 to 075, etc.
        const sizeMap = {
            '1/4': '025', '3/8': '038', '1/2': '050', '5/8': '063',
            '3/4': '075', '1': '100', '1-1/4': '125', '1-1/2': '150', '2': '200'
        };
        parts.push(sizeMap[data.sizeInch] || data.sizeInch.replace('/', ''));
    }
    return parts.join('-');
}

/**
 * Get all inventory batches
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} List of batches
 */
export async function getBatches(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.skip) queryParams.append('skip', params.skip);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.product_id) queryParams.append('product_id', params.product_id);
        if (params.location_code) queryParams.append('location_code', params.location_code);
        if (params.status) queryParams.append('status', params.status);
        if (params.brand) queryParams.append('brand', params.brand);
        if (params.search) queryParams.append('search', params.search);
        if (params.available_only) queryParams.append('available_only', 'true');

        const response = await fetch(
            `${API_BASE_URL}/api/v1/batches?${queryParams.toString()}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Batches Error:', error);
        return {
            status: 'error',
            message: error.message,
            data: []
        };
    }
}

/**
 * Get available batches for picking (Best-Fit)
 * @param {number} productId - Product ID
 * @param {number} minQty - Minimum quantity needed
 * @returns {Promise<Object>} Available batches sorted by best fit
 */
export async function getAvailableBatches(productId, minQty = 0) {
    try {
        const queryParams = new URLSearchParams();
        if (productId) queryParams.append('product_id', productId);
        queryParams.append('min_qty', minQty);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/batches/available?${queryParams.toString()}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Available Batches Error:', error);
        return {
            status: 'error',
            message: error.message,
            data: []
        };
    }
}

/**
 * Get batch by barcode
 * @param {string} barcode - Batch barcode
 * @returns {Promise<Object>} Batch details
 */
export async function getBatch(barcode) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/batches/${barcode}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Batch Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Transfer batch to another location
 * @param {string} barcode - Batch barcode
 * @param {string} toLocationCode - Target location code
 * @param {number} quantity - Quantity to transfer (optional)
 * @returns {Promise<Object>} Transfer result
 */
export async function transferBatch(barcode, toLocationCode, quantity = null) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/batches/${barcode}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to_location_code: toLocationCode,
                quantity: quantity,
                transferred_by: 'system'
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Transfer Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Consume quantity from batch
 * @param {string} barcode - Batch barcode
 * @param {number} quantity - Quantity to consume
 * @param {Object} reference - Reference info (JO, SO, etc.)
 * @returns {Promise<Object>} Consume result
 */
export async function consumeBatch(barcode, quantity, reference = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/batches/${barcode}/consume`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quantity: quantity,
                reference_type: reference.type,
                reference_id: reference.id,
                reference_number: reference.number,
                consumed_by: 'system'
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Consume Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Get batch movement history
 * @param {string} barcode - Batch barcode
 * @returns {Promise<Object>} Movement history
 */
export async function getBatchMovements(barcode) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/batches/${barcode}/movements`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Movements Error:', error);
        return {
            status: 'error',
            message: error.message,
            data: []
        };
    }
}



/**
 * Upload image for a batch
 * @param {string} barcode - Batch barcode
 * @param {Blob} imageBlob - Image blob
 * @returns {Promise<Object>} Upload result
 */
export async function uploadBatchImage(barcode, imageBlob) {
    try {
        const formData = new FormData();
        formData.append('file', imageBlob, `batch_${barcode}.jpg`);

        const response = await fetch(`${API_BASE_URL}/api/v1/batches/${barcode}/image`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Upload Image Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Update batch status (e.g. for QC)
 * @param {string} barcode - Batch barcode
 * @param {string} status - New status (AVAILABLE, REJECTED, QUARANTINE)
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Update result
 */
export async function updateBatchStatus(barcode, status, notes = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/batches/${barcode}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: status,
                notes: notes,
                updated_by: 'system' // Should be user ID in real app
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Update Status Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

export default {
    getLocations,
    receiveBatch,
    getBatches,
    getAvailableBatches,
    getBatch,
    transferBatch,
    consumeBatch,
    getBatchMovements,
    uploadBatchImage,
    updateBatchStatus
};

