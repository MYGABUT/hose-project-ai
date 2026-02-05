
const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

// List Delivery Orders
export async function getDeliveryOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/do?${query}`);
        if (!response.ok) throw new Error('Failed to fetch DO list');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: [], message: error.message };
    }
}

// Get Items Ready to Ship (for DO Creation)
export async function getReadyToShipItems(so_id = null) {
    try {
        const url = so_id
            ? `${API_BASE_URL}/api/v1/do/ready-to-ship?so_id=${so_id}`
            : `${API_BASE_URL}/api/v1/do/ready-to-ship`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch ready items');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: [], message: error.message };
    }
}

// Create Delivery Order
export async function createDeliveryOrder(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/do`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.detail || 'Failed to create DO');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}

// Download Surat Jalan
export async function downloadSuratJalan(id, courier = '') {
    try {
        const url = `${API_BASE_URL}/api/v1/do/${id}/surat-jalan${courier ? `?courier=${courier}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Failed to generate Surat Jalan');

        // Handle Blob
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `Surat_Jalan_DO_${id}.docx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    } catch (error) {
        console.error('Download Error:', error);
        throw error;
    }
}
