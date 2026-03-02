const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export const scanApi = {
    // Analyze hose image
    scanHose: async (file, debug = false) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/scan-hose?debug=${debug}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Scan failed: ${response.statusText}`);
        }

        return await response.json();
    },

    // Multi-photo scan
    scanMulti: async (files, debug = false) => {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });

        const response = await fetch(`${API_BASE_URL}/scan-hose/multi?debug=${debug}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Multi-Scan failed: ${response.statusText}`);
        }

        return await response.json();
    },

    // Health check for OCR engine
    getEngineInfo: async () => {
        const response = await fetch(`${API_BASE_URL}/engine-info`);
        if (!response.ok) throw new Error('Failed to get engine info');
        return await response.json();
    }
};
