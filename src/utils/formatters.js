/**
 * Utility Formatters
 * Shared formatting functions for currency, dates, etc.
 */

/**
 * Format number as Indonesian Rupiah
 * @param {number} amount
 * @returns {string} e.g., "Rp 1.250.000"
 */
export const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format ISO date string to locale date
 * @param {string} dateStr - ISO date string
 * @returns {string} e.g., "13/02/2026"
 */
export const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

/**
 * Format ISO date string to locale datetime
 * @param {string} dateStr
 * @returns {string} e.g., "13/02/2026 14:30"
 */
export const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
};

/**
 * Format number with thousand separators
 * @param {number} num
 * @returns {string} e.g., "1.250.000"
 */
export const formatNumber = (num) => {
    if (num == null || isNaN(num)) return '-';
    return new Intl.NumberFormat('id-ID').format(num);
};
