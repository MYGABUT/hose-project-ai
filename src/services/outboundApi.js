/**
 * Outbound API Service
 * Delivery Orders and dispatch management
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

/**
 * Get items ready to ship
 */
export async function getReadyToShip(soId = null) {
    try {
        const url = soId
            ? `${API_BASE_URL}/api/v1/do/ready-to-ship?so_id=${soId}`
            : `${API_BASE_URL}/api/v1/do/ready-to-ship`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get Ready to Ship Error:', error);
        return { status: 'error', message: error.message, data: [] };
    }
}

/**
 * Get list of delivery orders
 */
export async function getDeliveryOrders(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.skip) queryParams.append('skip', params.skip);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.status) queryParams.append('status', params.status);
        if (params.soId) queryParams.append('so_id', params.soId);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/do?${queryParams.toString()}`
        );

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get Delivery Orders Error:', error);
        return { status: 'error', message: error.message, data: [] };
    }
}

/**
 * Get single DO
 */
export async function getDeliveryOrder(doId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/do/${doId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get DO Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Create new delivery order
 */
export async function createDeliveryOrder(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/do`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Create failed');
        return result;
    } catch (error) {
        console.error('Create DO Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Confirm DO for dispatch
 */
export async function confirmDeliveryOrder(doId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/do/${doId}/confirm`, {
            method: 'POST',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Confirm failed');
        return result;
    } catch (error) {
        console.error('Confirm DO Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Dispatch DO (mark as in transit)
 */
export async function dispatchDeliveryOrder(doId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/do/${doId}/dispatch`, {
            method: 'POST',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Dispatch failed');
        return result;
    } catch (error) {
        console.error('Dispatch DO Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Complete DO (delivered)
 */
export async function completeDeliveryOrder(doId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/do/${doId}/complete`, {
            method: 'POST',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || 'Complete failed');
        return result;
    } catch (error) {
        console.error('Complete DO Error:', error);
        return { status: 'error', message: error.message };
    }
}

export default {
    getReadyToShip,
    getDeliveryOrders,
    getDeliveryOrder,
    createDeliveryOrder,
    confirmDeliveryOrder,
    dispatchDeliveryOrder,
    completeDeliveryOrder,
};
