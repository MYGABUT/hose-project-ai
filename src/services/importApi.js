/**
 * HoseMaster WMS - Import/Export API Service
 * Centralized service for Bulk Data Operations
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

const getAuthHeaders = () => {
    try {
        const userStr = localStorage.getItem('hosepro_user');
        if (!userStr) return {};
        const user = JSON.parse(userStr);
        return user?.access_token ? { 'Authorization': `Bearer ${user.access_token}` } : {};
    } catch (e) {
        console.error("Auth Header Error", e);
        return {};
    }
};

export const importApi = {
    /**
     * Download Excel Template
     */
    downloadTemplate: async (type = 'sales') => {
        const response = await fetch(`${API_BASE_URL}/api/v1/import/template/${type}`, {
            method: 'GET',
            headers: {
                ...getAuthHeaders()
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to download template: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Template_${type.toUpperCase()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    },

    /**
     * Import Historical Sales
     */
    importSales: async (file, preview = true) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/api/v1/import/sales?preview=${preview}`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders()
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || `Import failed: ${response.statusText}`);
        return data;
    },

    //Result: { status: "success", data: [...], has_errors: bool }

    /**
     * Preview Product Import
     */
    previewProducts: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/api/v1/import/products/preview`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders()
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Preview failed");
        return data;
        // Returns: { filename, total_rows, columns, preview_data: [], status }
    },

    /**
     * Commit Product Import
     */
    commitProducts: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/api/v1/import/products/commit`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders()
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Commit failed");
        return data;
        // Returns: { total_processed, success_count, error_count, errors: [] }
    },

    /**
     * Export Products
     */
    exportProducts: async (format = 'xlsx') => {
        const response = await fetch(`${API_BASE_URL}/api/v1/import/products/export?format=${format}`, {
            method: 'GET',
            headers: {
                ...getAuthHeaders()
            }
        });

        if (!response.ok) throw new Error("Export failed");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Product_Master_${new Date().toISOString().split('T')[0]}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    }
};
