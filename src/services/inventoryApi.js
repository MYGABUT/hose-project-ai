/**
 * Inventory API Service
 * Connects frontend to Python FastAPI backend for inventory management
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

/**
 * Save hose roll to inventory
 * @param {Object} hoseData - Hose roll data from form
 * @returns {Promise<Object>} Save result
 */
export async function saveHoseRoll(hoseData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/inventory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                roll_id: hoseData.id || hoseData.roll_id,
                brand: hoseData.brand,
                tipe_hose: hoseData.tipeHose,
                standard: hoseData.standard,
                wire_type: hoseData.wireType,
                size_inch: hoseData.sizeInch,
                size_dn: hoseData.sizeDN,
                hose_od_mm: hoseData.hoseODmm ? parseFloat(hoseData.hoseODmm) : null,
                hose_id_mm: hoseData.hoseIDmm ? parseFloat(hoseData.hoseIDmm) : null,
                working_pressure_bar: hoseData.workingPressureBar ? parseFloat(hoseData.workingPressureBar) : null,
                working_pressure_psi: hoseData.workingPressurePsi ? parseFloat(hoseData.workingPressurePsi) : null,
                burst_pressure_bar: hoseData.burstPressureBar ? parseFloat(hoseData.burstPressureBar) : null,
                burst_pressure_psi: hoseData.burstPressurePsi ? parseFloat(hoseData.burstPressurePsi) : null,
                temperature_range: hoseData.temperatureRange,
                bend_radius_mm: hoseData.bendRadiusMm ? parseFloat(hoseData.bendRadiusMm) : null,
                length_meter: parseFloat(hoseData.lengthMeter),
                quantity: parseInt(hoseData.quantity) || 1,
                location: hoseData.location,
                source: hoseData.source || 'MANUAL_ENTRY',
                confidence: hoseData.confidence ? parseInt(hoseData.confidence) : null,
                notes: hoseData.notes,
                created_by: hoseData.createdBy || 'system'
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Gagal menyimpan data');
        }

        return result;
    } catch (error) {
        console.error('Save Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Get all hose rolls from inventory
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} List of hose rolls
 */
export async function getInventory(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.skip) queryParams.append('skip', params.skip);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.brand) queryParams.append('brand', params.brand);
        if (params.status) queryParams.append('status', params.status);
        if (params.search) queryParams.append('search', params.search);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/inventory?${queryParams.toString()}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Inventory Error:', error);
        return {
            status: 'error',
            message: error.message,
            data: []
        };
    }
}

/**
 * Get single hose roll by ID
 * @param {string} rollId - Roll ID
 * @returns {Promise<Object>} Hose roll data
 */
export async function getHoseRoll(rollId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/inventory/${rollId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Hose Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Update hose roll
 * @param {string} rollId - Roll ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Update result
 */
export async function updateHoseRoll(rollId, updateData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/inventory/${rollId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Update Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Delete hose roll
 * @param {string} rollId - Roll ID
 * @returns {Promise<Object>} Delete result
 */
export async function deleteHoseRoll(rollId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/inventory/${rollId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Delete Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Get inventory statistics
 * @returns {Promise<Object>} Stats
 */
export async function getInventoryStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/inventory/stats/summary`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Stats Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

export default {
    saveHoseRoll,
    getInventory,
    getHoseRoll,
    updateHoseRoll,
    deleteHoseRoll,
    getInventoryStats,
    getAvailableBatches
};

/**
 * Get available batches for picking
 */
export async function getAvailableBatches(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.product_id) queryParams.append('product_id', params.product_id);
        if (params.min_qty) queryParams.append('min_qty', params.min_qty);

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
