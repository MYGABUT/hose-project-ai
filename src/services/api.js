/**
 * Shared API Service — Centralized HTTP Client
 * Used by service modules that need a clean axios-like interface.
 *
 * URL Strategy:
 * - Dev (npm run dev): VITE_AI_API_URL=http://localhost:8000
 * - Production (via Nginx): empty string = relative path (proxied by Nginx)
 */

// In dev, use explicit backend URL. In prod (HTTPS via Nginx), use relative path.
const isDev = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_AI_API_URL || (isDev ? 'http://localhost:8000' : '');
const API_PREFIX = '/api/v1';

export function getAuthHeader() {
    try {
        const userStr = localStorage.getItem('hosepro_user');
        if (!userStr) return {};
        const user = JSON.parse(userStr);
        return user?.access_token ? { 'Authorization': `Bearer ${user.access_token}` } : {};
    } catch (e) {
        return {};
    }
}

async function request(method, url, data = null, options = {}) {
    const fullUrl = `${API_BASE_URL}${API_PREFIX}${url}`;

    const config = {
        method,
        headers: {
            ...getAuthHeader(),
            ...(options.headers || {}),
        },
    };

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (data instanceof FormData) {
        config.body = data;
    } else if (data) {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
    }

    const response = await fetch(fullUrl, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.detail || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = errorData;
        throw error;
    }

    return { data: await response.json(), status: response.status };
}

export const api = {
    get: (url, options = {}) => {
        let queryUrl = url;
        if (options.params) {
            const searchParams = new URLSearchParams();
            Object.entries(options.params).forEach(([key, value]) => {
                if (value != null) searchParams.append(key, value);
            });
            const qs = searchParams.toString();
            if (qs) queryUrl += `?${qs}`;
        }
        return request('GET', queryUrl);
    },
    post: (url, data, options) => request('POST', url, data, options),
    put: (url, data, options) => request('PUT', url, data, options),
    patch: (url, data, options) => request('PATCH', url, data, options),
    delete: (url, options) => request('DELETE', url, null, options),
};

export default api;
