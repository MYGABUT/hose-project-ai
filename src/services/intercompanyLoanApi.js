const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";
const ENDPOINT = '/api/v1/intercompany-loans';

export const interCompanyLoanApi = {
    // Get all loans (Filtered by mode: inbound / outbound)
    getAll: async (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.company_id) searchParams.append('company_id', params.company_id);
        if (params.mode) searchParams.append('mode', params.mode);
        if (params.status) searchParams.append('status', params.status);

        const response = await fetch(`${API_BASE_URL}${ENDPOINT}?${searchParams.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Create new B2B loan (Outbound)
    create: async (data) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Approve B2B loan (Inbound)
    approve: async (id) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Return items to lender
    returnItems: async (id, items) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}/${id}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Convert sold items to invoice
    convertToInvoice: async (id) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}/${id}/invoice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }
};

export default interCompanyLoanApi;
