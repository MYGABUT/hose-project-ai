/**
 * Product API Service
 * Connects frontend to Python FastAPI backend for product management
 */

import { getAuthHeader } from './api';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

/**
 * Get all products
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} List of products
 */
export async function getProducts(params = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (params.skip) queryParams.append('skip', params.skip);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        if (params.brand) queryParams.append('brand', params.brand);
        if (params.category) queryParams.append('category', params.category);
        if (params.active_only !== undefined) queryParams.append('active_only', params.active_only);

        const response = await fetch(
            `${API_BASE_URL}/api/v1/products?${queryParams.toString()}`, {
            headers: { ...getAuthHeader() }
        }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Products Error:', error);
        return {
            status: 'error',
            message: error.message,
            data: []
        };
    }
}

/**
 * Get product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Product details
 */
export async function getProduct(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}`, {
            headers: { ...getAuthHeader() }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get Product Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Create new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Create result
 */
export async function createProduct(productData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Create failed');
        }

        return result;
    } catch (error) {
        console.error('Create Product Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Update product
 * @param {string} productId - Product ID
 * @param {Object} productData - Data to update
 * @returns {Promise<Object>} Update result
 */
export async function updateProduct(productId, productData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Update failed');
        }

        return result;
    } catch (error) {
        console.error('Update Product Error:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

/**
 * Get product price levels
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Price levels
 */
export async function getProductPriceLevels(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/price-levels`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get Price Levels Error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Get list of all brands
 * @returns {Promise<Object>} List of brands
 */
export async function getBrands() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/products/brands`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Get Brands Error:', error);
        return { status: 'error', message: error.message, data: [] };
    }
}

export default {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    getProductPriceLevels,
    getBrands
};
