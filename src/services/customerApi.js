/**
 * Customer API Service
 * Wraps /api/v1/customers endpoints
 */
const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";
const ENDPOINT = '/api/v1/customers';

export const customerApi = {
    // List customers
    getAll: async (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append('search', params.search);
        if (params.customer_type) searchParams.append('customer_type', params.customer_type);
        if (params.has_outstanding) searchParams.append('has_outstanding', 'true');
        if (params.limit) searchParams.append('limit', params.limit);

        const response = await fetch(`${API_BASE_URL}${ENDPOINT}?${searchParams.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Get single customer
    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}/${id}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Create single customer
    create: async (data) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    },

    // Batch create customers
    batchCreate: async (customers) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customers })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    },

    // Update customer
    update: async (id, data) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Get credit summary
    getCreditSummary: async () => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}/credit-summary`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Get customer purchase history
    getHistory: async (customerName, params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.skip) searchParams.append('skip', params.skip);
        if (params.limit) searchParams.append('limit', params.limit);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/so/customers/history/${encodeURIComponent(customerName)}?${searchParams.toString()}`
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }
};

export default customerApi;
