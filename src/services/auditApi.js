const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';
const API_URL = `${API_BASE_URL}/api/v1/audit`;

/**
 * Get audit logs
 * @param {Object} params - Query parameters (limit, skip, etc.)
 * @returns {Promise<Object>}
 */
export const getAuditLogs = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        });

        const response = await fetch(`${API_URL}/logs?${queryParams.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return { status: 'error', message: error.message };
    }
};

/**
 * Get audit summary
 * @param {number} days 
 * @returns {Promise<Object>}
 */
export const getAuditSummary = async (days = 7) => {
    try {
        const response = await fetch(`${API_URL}/logs/summary?days=${days}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching audit summary:', error);
        return { status: 'error', message: error.message };
    }
};

/**
 * Get user activity
 * @param {string} userName 
 * @param {number} days 
 * @returns {Promise<Object>}
 */
export const getUserActivity = async (userName, days = 30) => {
    try {
        const response = await fetch(`${API_URL}/logs/user/${userName}?days=${days}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching user activity:', error);
        return { status: 'error', message: error.message };
    }
};
