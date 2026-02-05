/**
 * WMS Production API Service
 * Sales Orders, Job Orders, and Cutting Wizard
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

// ============ Sales Orders ============

/**
 * Get list of sales orders
 */
export async function getSalesOrders(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.skip) queryParams.append('skip', params.skip);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.status) queryParams.append('status', params.status);
        if (params.search) queryParams.append('search', params.search);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/so?${queryParams.toString()}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Sales Orders Error:', error);
        return { status: 'error', message: error.message, data: [] };
    }
}

/**
 * Get single sales order
 */
export async function getSalesOrder(soId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/so/${soId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get SO Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Create new sales order
 */
export async function createSalesOrder(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/so`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Create failed');
        return result;
    } catch (error) {
        console.error('Create SO Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Confirm sales order
 */
export async function confirmSalesOrder(soId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/so/${soId}/confirm`, {
            method: 'POST',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Confirm failed');
        return result;
    } catch (error) {
        console.error('Confirm SO Error:', error);
        return { status: 'error', message: error.message };
    }
}

// ============ Job Orders ============

/**
 * Get list of job orders
 */
export async function getJobOrders(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.skip) queryParams.append('skip', params.skip);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.status) queryParams.append('status', params.status);
        if (params.priority) queryParams.append('priority', params.priority);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/jo?${queryParams.toString()}`
        );

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get Job Orders Error:', error);
        return { status: 'error', message: error.message, data: [] };
    }
}

/**
 * Create job order from sales order
 */
export async function createJobFromSO(soId, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jo/create-from-so`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                so_id: soId,
                priority: options.priority || 3,
                assigned_to: options.assignedTo,
                notes: options.notes,
            }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Create JO failed');
        return result;
    } catch (error) {
        console.error('Create JO Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Get job order details
 */
export async function getJobOrder(joId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jo/${joId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get JO Error:', error);
        return { status: 'error', message: error.message };
    }
}

// ============ Cutting Wizard ============

/**
 * Get cutting wizard steps for JO
 */
export async function getWizardSteps(joId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jo/${joId}/wizard`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get Wizard Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Confirm material picked (scan barcode)
 */
export async function scanMaterial(materialId, scannedBarcode) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jo/scan-material`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                material_id: materialId,
                scanned_barcode: scannedBarcode,
            }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Scan failed');
        return result;
    } catch (error) {
        console.error('Scan Material Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Complete material cutting
 */
export async function completeCutting(materialId, qtyConsumed) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jo/complete-cut`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                material_id: materialId,
                qty_consumed: qtyConsumed,
            }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Complete cut failed');
        return result;
    } catch (error) {
        console.error('Complete Cutting Error:', error);
        return { status: 'error', message: error.message };
    }
}


/**
 * Update JO line progress (e.g. crimping result)
 */
export async function updateJobLineProgress(joId, lineId, qtyCompleted, notes = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jo/${joId}/lines/${lineId}/update-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qty_completed: qtyCompleted,
                notes: notes,
            }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Update progress failed');
        return result;
    } catch (error) {
        console.error('Update Progress Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Start job order
 */
export async function startJobOrder(joId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jo/${joId}/start`, {
            method: 'POST',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Start failed');
        return result;
    } catch (error) {
        console.error('Start JO Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Complete job order
 */
export async function completeJobOrder(joId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jo/${joId}/complete`, {
            method: 'POST',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Complete failed');
        return result;
    } catch (error) {
        console.error('Complete JO Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Preview material allocation (Best-Fit)
 */
export async function previewAllocation(productId, length, cutLength = null) {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append('product_id', productId);
        queryParams.append('length', length);
        if (cutLength) queryParams.append('cut_length', cutLength);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/jo/preview-allocation?${queryParams.toString()}`
        );

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Preview Allocation Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Cancel/Reject sales order
 */
export async function cancelSalesOrder(soId, reason = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/so/${soId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Cancel failed');
        return result;
    } catch (error) {
        console.error('Cancel SO Error:', error);
        return { status: 'error', message: error.message };
    }
}

export default {
    // Sales Orders
    getSalesOrders,
    getSalesOrder,
    createSalesOrder,
    confirmSalesOrder,
    cancelSalesOrder,
    // Job Orders
    getJobOrders,
    getJobOrder,
    createJobFromSO,
    // Wizard
    getWizardSteps,
    scanMaterial,
    completeCutting,
    startJobOrder,
    completeJobOrder,
    previewAllocation,
    updateJobLineProgress,
    substituteMaterial,
    addJobMaterial
};

/**
 * Substitute material in JO
 */
export async function substituteMaterial(joId, lineId, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jo/${joId}/lines/${lineId}/substitute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Substitution failed');
        return result;
    } catch (error) {
        console.error('Substitute Material Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Add material to JO Line
 */
export async function addJobMaterial(joId, lineId, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jo/${joId}/lines/${lineId}/add-material`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Add material failed');
        return result;
    } catch (error) {
        console.error('Add Material Error:', error);
        return { status: 'error', message: error.message };
    }
}
