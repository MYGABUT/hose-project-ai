/**
 * Analytics API Service
 * Dashboard metrics and reports
 */

import { getAuthHeader } from './api';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export async function getDashboardSummary(period = 'month') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/analytics/summary?period=${period}`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch summary');
        return await response.json();
    } catch (error) {
        console.error('Analytics Error:', error);
        return { status: 'error', data: {} };
    }
}

export const getSummaryStats = getDashboardSummary;

export async function getActiveJobs() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/analytics/active-jobs`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch active jobs');
        return await response.json();
    } catch (error) {
        console.error('Analytics Error:', error);
        return { status: 'error', data: [] };
    }
}

export async function getLowStockAlerts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/analytics/low-stock`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch alerts');
        return await response.json();
    } catch (error) {
        console.error('Analytics Error:', error);
        return { status: 'error', data: [] };
    }
}

export async function getSalesTrend() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/analytics/sales-trend`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch trend');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: [] };
    }
}

export async function getDeadStock() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/analytics/dead-stock`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch dead stock');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: [] };
    }
}

export async function getSalesByCategory() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/analytics/sales-by-category`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch sales by category');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: [] };
    }
}

export async function getTopSelling() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/analytics/top-selling`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch top selling');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: [] };
    }
}

export async function getQCStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/analytics/qc-stats`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch QC stats');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: { rejectByCategory: [] } };
    }
}

export async function getProductionStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/analytics/production-stats`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch production stats');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: { byMachine: [] } };
    }
}

export async function getRestockPrediction(days = 30) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/analytics/restock-prediction?days=${days}`, {
            headers: { ...getAuthHeader() }
        });
        if (!response.ok) throw new Error('Failed to fetch prediction');
        return await response.json();
    } catch (error) {
        return { status: 'error', data: [] };
    }
}
