import api from './api';

export const getSettings = async () => {
    try {
        const response = await api.get('/settings');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        throw error;
    }
};

export const updateSettings = async (data) => {
    try {
        const response = await api.put('/settings', data);
        return response.data;
    } catch (error) {
        console.error('Failed to update settings:', error);
        throw error;
    }
};
