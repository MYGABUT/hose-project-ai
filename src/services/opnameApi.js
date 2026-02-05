/**
 * Stock Opname API Service
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

// Start new session
export async function startOpname(description, scope_type = 'ALL', scope_value = null) {
    try {
        const payload = {
            description,
            scope_type,
            counted_by: 'Operator' // Default user for now
        };
        if (scope_value) payload.scope_value = scope_value;

        const response = await fetch(`${API_BASE_URL}/api/v1/opname/start`, { // Updated endpoint URL to match backend router
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to start opname');
        return await response.json();
    } catch (error) {
        console.error('Opname API Error:', error);
        return { status: 'error', message: error.message };
    }
}

// Get current active session
export async function getCurrentOpname() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/stock-opname/current`);
        if (!response.ok) throw new Error('Failed to fetch opname');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Get items for session
export async function getOpnameItems(opnameId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/stock-opname/${opnameId}/items`);
        if (!response.ok) throw new Error('Failed to fetch items');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: [] };
    }
}

// Scan item
export async function scanOpnameItem(opnameId, barcode) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/stock-opname/${opnameId}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode })
        });
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Mark item missing manually
export async function markItemMissing(opnameId, itemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/stock-opname/${opnameId}/mark-missing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: itemId })
        });
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Finalize
export async function finalizeOpname(opnameId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/stock-opname/${opnameId}/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to finalize opname');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}
