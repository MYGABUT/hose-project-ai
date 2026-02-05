/**
 * Supplier & AP API Service
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export async function getSuppliers(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/suppliers?${query}`);
        if (!response.ok) throw new Error('Failed to fetch suppliers');
        return await response.json();
    } catch (error) {
        console.error('Supplier API Error:', error);
        return { status: 'error', data: [] };
    }
}

export async function getVendorScorecard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/suppliers/scorecard/all`);
        if (!response.ok) throw new Error('Failed to fetch scorecard');
        return await response.json();
    } catch (error) {
        console.error('Scorecard API Error:', error);
        return { status: 'error', data: [] };
    }
}
