/**
 * Warehouse Transfer API Service
 * Inter-warehouse stock movement management
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

// Helper to get Auth Header
function getAuthHeader() {
    try {
        const userStr = localStorage.getItem('hosepro_user');
        if (!userStr) return {};
        const user = JSON.parse(userStr);
        return user?.access_token ? { 'Authorization': `Bearer ${user.access_token}` } : {};
    } catch (e) {
        return {};
    }
}

// Request new transfer
export async function requestTransfer(transferData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/transfers/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({
                ...transferData,
                requested_by: 'Gudang' // Default user, backend might override with token user
            })
        });
        if (!response.ok) throw new Error('Failed to request transfer');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Approve transfer
export async function approveTransfer(transferId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/transfers/${transferId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ approved_by: 'Manager' })
        });
        if (!response.ok) throw new Error('Failed to approve transfer');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Ship transfer
export async function shipTransfer(transferId, trackingNumber = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/transfers/${transferId}/ship`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({
                tracking_number: trackingNumber,
                shipped_by: 'Gudang'
            })
        });
        if (!response.ok) throw new Error('Failed to ship transfer');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Receive transfer
export async function receiveTransfer(transferId, notes = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/transfers/${transferId}/receive`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({
                notes,
                received_by: 'Gudang',
                items_received: []
            })
        });
        if (!response.ok) throw new Error('Failed to receive transfer');
        return await response.json();
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Get list of transfers (with filters)
export async function getTransfers(status = 'ALL') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/transfers?status=${status}`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch transfers');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: [] };
    }
}
