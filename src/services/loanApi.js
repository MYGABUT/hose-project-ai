const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";
const ENDPOINT = '/api/v1/loans'; // Assuming v1 convention

export const loanApi = {
    // Get all loans
    getAll: async (params = {}) => {
        const { status, search } = params;
        const searchParams = new URLSearchParams();
        if (status) searchParams.append('status', status);
        if (search) searchParams.append('customer_name', search);

        const response = await fetch(`${API_BASE_URL}${ENDPOINT}?${searchParams.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Create new loan
    create: async (data) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Return items
    returnItems: async (id, items) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}/${id}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    },

    // Convert to invoice
    convertToInvoice: async (id, items) => {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT}/${id}/invoice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }
};

export default loanApi;
