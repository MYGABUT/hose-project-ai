import api from './api';

const ENDPOINT = '/loans';

export const loanApi = {
    // Get all loans
    getAll: async (params = {}) => {
        const { status, search } = params;
        const searchParams = new URLSearchParams();
        if (status) searchParams.append('status', status);
        if (search) searchParams.append('customer_name', search);

        const response = await api.get(`${ENDPOINT}?${searchParams.toString()}`);
        return response.data;
    },

    // Create new loan
    create: async (data) => {
        const response = await api.post(ENDPOINT, data);
        return response.data;
    },

    // Return items
    returnItems: async (id, items) => {
        const response = await api.post(`${ENDPOINT}/${id}/return`, { items });
        return response.data;
    },

    // Convert to invoice
    convertToInvoice: async (id, items) => {
        const response = await api.post(`${ENDPOINT}/${id}/invoice`, { items });
        return response.data;
    }
};

export default loanApi;
