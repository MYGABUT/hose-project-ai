/**
 * Pricing Management API Service
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export async function bulkAdjustPrices(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/pricing/bulk-adjust`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to adjust prices');
        return await response.json();
    } catch (error) {
        console.error('Pricing API Error:', error);
        return { status: 'error', message: error.message };
    }
}

export async function getPriceHistory(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/pricing/${productId}/history`);
        if (!response.ok) throw new Error('Failed to fetch history');
        return await response.json();
    } catch (error) {
        console.error('Pricing API Error:', error);
        return { status: 'error', data: [] };
    }
}
