import { api } from './api';

export const invoiceIngestApi = {
    // Sync from Email
    syncEmail: async () => {
        const response = await api.post('/invoices/ingest/sync-email');
        return response.data;
    },

    // Manual Upload
    uploadInvoice: async (file, sender) => {
        const formData = new FormData();
        formData.append('file', file);
        if (sender) formData.append('sender', sender);

        const response = await api.post('/invoices/ingest/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // List Inbox
    getInbox: async (params = {}) => {
        const response = await api.get('/invoices/ingest/inbox', { params });
        return response.data;
    },

    // Process (OCR)
    processInvoice: async (id) => {
        const response = await api.post(`/invoices/ingest/${id}/process`);
        return response.data;
    },

    // Match (3-Way)
    matchInvoice: async (id) => {
        const response = await api.post(`/invoices/ingest/${id}/match`);
        return response.data;
    }
};
