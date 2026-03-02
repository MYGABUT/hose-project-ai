import api from './api';

const crmApi = {
    // Get all leads (optionally filtered by status or assigned_to_id)
    getLeads: async (params = {}) => {
        const response = await api.get('/crm', { params });
        return response.data;
    },

    // Create a new lead
    createLead: async (leadData) => {
        const response = await api.post('/crm', leadData);
        return response.data;
    },

    // Update an existing lead (e.g., changing status)
    updateLead: async (id, updateData) => {
        const response = await api.put(`/crm/${id}`, updateData);
        return response.data;
    },

    // Delete a lead
    deleteLead: async (id) => {
        const response = await api.delete(`/crm/${id}`);
        return response.data;
    }
};

export default crmApi;
