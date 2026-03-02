/**
 * Supplier & AP API Service
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export const supplierApi = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/suppliers?${query}`);
            if (!response.ok) throw new Error('Failed to fetch suppliers');
            return await response.json();
        } catch (error) {
            console.error('Supplier API Error:', error);
            return { status: 'error', data: [] };
        }
    },

    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/suppliers/${id}`);
        if (!response.ok) throw new Error('Failed to fetch supplier details');
        return await response.json();
    },

    create: async (data) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/suppliers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to create supplier');
        }
        return await response.json();
    },

    update: async (id, data) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/suppliers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to update supplier');
        }
        return await response.json();
    },

    getVendorScorecard: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/suppliers/scorecard/all`);
            if (!response.ok) throw new Error('Failed to fetch scorecard');
            return await response.json();
        } catch (error) {
            console.error('Scorecard API Error:', error);
            return { status: 'error', data: [] };
        }
    }
};

export default supplierApi;
