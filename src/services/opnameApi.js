/**
 * Stock Opname API Service
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

// Start new session
export async function startOpname(description, scope_type = 'ALL', scope_value = null, is_blind = false) {
    try {
        const payload = {
            description,
            scope_type,
            is_blind,
            counted_by: 'Operator' // Default user for now
        };
        if (scope_value) payload.scope_value = scope_value;

        const response = await fetch(`${API_BASE_URL}/api/v1/opname`, { // Endpoint is /opname not /opname/start based on python
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
        const response = await fetch(`${API_BASE_URL}/api/v1/opname/current`); // Endpoint fix
        if (!response.ok) throw new Error('Failed to fetch opname');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Get items for session
export async function getOpnameItems(opnameId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/opname/${opnameId}/items`); // Endpoint fix matches python
        if (!response.ok) throw new Error('Failed to fetch items');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: [] };
    }
}

// Scan item
export async function scanOpnameItem(opnameId, barcode, qty = 1) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/opname/${opnameId}/scan`, { // Endpoint fix
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode, qty })
        });
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Get Variance Report
export async function getOpnameVariance(opnameId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/opname/${opnameId}/variance`);
        if (!response.ok) throw new Error('Failed to fetch variance report');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Mark item missing manually
export async function markItemMissing(opnameId, itemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/opname/${opnameId}/mark-missing`, {
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
        const response = await fetch(`${API_BASE_URL}/api/v1/opname/${opnameId}/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to finalize opname');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}
