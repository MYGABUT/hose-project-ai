/**
 * User API Service
 * Connects frontend to Python FastAPI backend for user management
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

/**
 * Login user
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} Login response with user data
 */
export async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Login failed');
        }

        return result;
    } catch (error) {
        console.error('Login Error:', error);
        throw error;
    }
}

/**
 * Get all users
 * @param {Object} params - Query parameters (role, search)
 * @returns {Promise<Object>} List of users
 */
export async function getUsers(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.skip) queryParams.append('skip', params.skip);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        if (params.role) queryParams.append('role', params.role);
        if (params.active_only !== undefined) queryParams.append('active_only', params.active_only);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/users?${queryParams.toString()}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Users Error:', error);
        return {
            status: 'error',
            message: error.message,
            data: []
        };
    }
}

/**
 * Get user by ID
 * @param {number} userId 
 * @returns {Promise<Object>} User details
 */
export async function getUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get User Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Create new user
 * @param {Object} userData 
 * @returns {Promise<Object>} Created user
 */
export async function createUser(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Create failed');
        }

        return result;
    } catch (error) {
        console.error('Create User Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Update user
 * @param {number} userId 
 * @param {Object} userData 
 * @returns {Promise<Object>} Update result
 */
export async function updateUser(userId, userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Update failed');
        }

        return result;
    } catch (error) {
        console.error('Update User Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Delete user
 * @param {number} userId 
 * @returns {Promise<Object>} Delete result
 */
export async function deleteUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Delete User Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

export default {
    loginUser,
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
};
