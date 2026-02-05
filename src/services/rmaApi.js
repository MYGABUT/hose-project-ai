/**
 * RMA API Service
 */

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export async function getRMATickets(status = 'all') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/rma?status=${status}`);
        if (!response.ok) throw new Error('Failed to fetch tickets');
        return await response.json();
    } catch (error) {
        console.error('RMA API Error:', error);
        return { status: 'error', data: [] };
    }
}

export async function createRMATicket(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/rma`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create ticket');
        return await response.json();
    } catch (error) {
        console.error('RMA API Error:', error);
        return { status: 'error', message: error.message };
    }
}

export async function updateRMAStatus(ticketId, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/rma/${ticketId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update ticket');
        return await response.json();
    } catch (error) {
        console.error('RMA API Error:', error);
        return { status: 'error', message: error.message };
    }
}
