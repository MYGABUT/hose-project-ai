
const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export async function getPendingQC() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/qc/pending`);
        if (!response.ok) throw new Error('Failed to fetch pending QC');
        return await response.json();
    } catch (error) {
        console.error('QC Fetch Error:', error);
        return { status: 'error', message: error.message, data: [] };
    }
}

export async function submitQCInspection(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/qc/inspect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.detail || 'QC Submission Failed');
        }
        return await response.json();
    } catch (error) {
        console.error('QC Submit Error:', error);
        throw error;
    }
}
