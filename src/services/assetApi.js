/**
 * Asset Health & Predictive API Service
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export async function getAssets() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/assets`);
        if (!response.ok) throw new Error('Failed to fetch assets');
        return await response.json();
    } catch (error) {
        console.error('Asset API Error:', error);
        return { status: 'error', data: [] };
    }
}

export async function createAsset(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create asset');
        return await response.json();
    } catch (error) {
        console.error('Asset API Error:', error);
        return { status: 'error', message: error.message };
    }
}

export async function updateAssetHM(assetId, newHM) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/assets/${assetId}/hm`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newHM })
        });
        if (!response.ok) throw new Error('Failed to update HM');
        return await response.json();
    } catch (error) {
        console.error('Asset API Error:', error);
        return { status: 'error', message: error.message };
    }
}
