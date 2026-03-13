import api from './api';

const blanketOrderApi = {
    // List all blanket orders
    getAll: async (params = {}) => {
        try {
            const query = new URLSearchParams(params).toString();
            const res = await api.get(`/blanket-orders${query ? '?' + query : ''}`);
            return res.data;
        } catch (err) {
            return { status: 'error', message: err?.response?.data?.detail || err.message };
        }
    },

    // Get single blanket order with releases
    getById: async (id) => {
        try {
            const res = await api.get(`/blanket-orders/${id}`);
            return res.data;
        } catch (err) {
            return { status: 'error', message: err?.response?.data?.detail || err.message };
        }
    },

    // Create new blanket order
    create: async (payload) => {
        try {
            const res = await api.post('/blanket-orders', payload);
            return res.data;
        } catch (err) {
            return { status: 'error', message: err?.response?.data?.detail || err.message };
        }
    },

    // List releases for a blanket order
    getReleases: async (soId) => {
        try {
            const res = await api.get(`/blanket-orders/${soId}/releases`);
            return res.data;
        } catch (err) {
            return { status: 'error', message: err?.response?.data?.detail || err.message };
        }
    },

    // Create a new release/call-off
    createRelease: async (soId, payload) => {
        try {
            const res = await api.post(`/blanket-orders/${soId}/releases`, payload);
            return res.data;
        } catch (err) {
            return { status: 'error', message: err?.response?.data?.detail || err.message };
        }
    },

    // Confirm release → creates DO
    confirmRelease: async (soId, releaseId) => {
        try {
            const res = await api.post(`/blanket-orders/${soId}/releases/${releaseId}/confirm`);
            return res.data;
        } catch (err) {
            return { status: 'error', message: err?.response?.data?.detail || err.message };
        }
    },

    // Deliver release → creates invoice
    deliverRelease: async (soId, releaseId) => {
        try {
            const res = await api.post(`/blanket-orders/${soId}/releases/${releaseId}/deliver`);
            return res.data;
        } catch (err) {
            return { status: 'error', message: err?.response?.data?.detail || err.message };
        }
    },

    // Cancel release
    cancelRelease: async (soId, releaseId) => {
        try {
            const res = await api.post(`/blanket-orders/${soId}/releases/${releaseId}/cancel`);
            return res.data;
        } catch (err) {
            return { status: 'error', message: err?.response?.data?.detail || err.message };
        }
    },

    // Generate summary invoice
    generateSummaryInvoice: async (soId) => {
        try {
            const res = await api.post(`/blanket-orders/${soId}/invoice-summary`);
            return res.data;
        } catch (err) {
            return { status: 'error', message: err?.response?.data?.detail || err.message };
        }
    },
};

export default blanketOrderApi;
