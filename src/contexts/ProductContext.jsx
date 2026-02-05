import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProducts, createProduct, updateProduct as apiUpdateProduct, getBrands } from '../services/productApi';

const ProductContext = createContext(null);

export function ProductProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [qcLogs, setQcLogs] = useState([]); // Keep local or refactor later

    // Loading state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal states
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showQCModal, setShowQCModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [qcTransaction, setQcTransaction] = useState(null);

    // Message state
    const [actionMessage, setActionMessage] = useState(null);

    // Initial load
    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const res = await getProducts({ limit: 1000 }); // Fetch all for context cache
            if (res.status === 'success') {
                setProducts(res.data || []);
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    // Show message
    const showMessage = useCallback((type, text) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage(null), 4000);
    }, []);

    // Get products by category
    const getHoseProducts = useCallback(() => {
        return products.filter(p => p.category === 'HOSE');
    }, [products]);

    const getFittingProducts = useCallback(() => {
        // Backend categories might be upper case
        return products.filter(p => p.category === 'FITTING');
    }, [products]);

    // Get low stock products
    const getLowStockProducts = useCallback(() => {
        return products.filter(p => (p.stock || 0) <= (p.min_stock || 10)); // Backend uses snake_case, adapting
    }, [products]);

    // Import products from data (simulating Excel import -> Loop API)
    const importProducts = useCallback(async (importData, category) => {
        let successCount = 0;

        for (const item of importData) {
            try {
                // Map frontend import format to backend expected format
                const productData = {
                    name: item.name,
                    brand: item.brand,
                    category: category.toUpperCase(), // HOSE or FITTING
                    specifications: {
                        size: item.size,
                        type: item.type
                    },
                    unit: category === 'hose' ? 'METER' : 'PCS',
                    min_stock: parseInt(item.minStock) || 10,
                    // Auto-generate SKU handled by backend
                };

                await createProduct(productData);
                successCount++;
            } catch (err) {
                console.error('Import failed for item:', item, err);
            }
        }

        if (successCount > 0) {
            showMessage('success', `✅ ${successCount} produk berhasil diimport!`);
            setShowImportModal(false);
            loadProducts(); // Reload to get new IDs/SKUs
        } else {
            showMessage('error', 'Gagal mengimport produk.');
        }

        return [];
    }, [showMessage]);

    // Add product
    const addProduct = useCallback(async (productData) => {
        try {
            const payload = {
                name: productData.name,
                brand: productData.brand,
                category: productData.category.toUpperCase(),
                description: productData.description,
                unit: productData.unit || (productData.category === 'hose' ? 'METER' : 'PCS'),
                specifications: {
                    size: productData.size,
                    type: productData.type
                },
                min_stock: parseInt(productData.minStock) || 0,
                cost_price: parseFloat(productData.costPrice),
                sell_price: parseFloat(productData.price)
            };

            const res = await createProduct(payload);
            if (res.status === 'success') {
                showMessage('success', `✅ Produk "${res.data.name}" berhasil ditambahkan!`);
                setShowAddEditModal(false);
                setEditingProduct(null);
                loadProducts(); // Refresh list
                return res.data;
            } else {
                throw new Error(res.message || 'Create failed');
            }
        } catch (err) {
            showMessage('error', `Gagal menambah produk: ${err.message}`);
            return null;
        }
    }, [showMessage]);

    // Update product
    const updateProduct = useCallback(async (productId, productData) => {
        try {
            // Map frontend fields (camelCase) to backend (snake_case)
            const payload = {
                name: productData.name,
                min_stock: parseInt(productData.minStock),
                specifications: {
                    size: productData.size,
                    type: productData.type
                },
                is_active: true
            };

            const res = await apiUpdateProduct(productId, payload);
            if (res.status === 'success') {
                showMessage('success', `✅ Produk "${res.data.name}" berhasil diperbarui!`);
                setShowAddEditModal(false);
                setEditingProduct(null);
                loadProducts();
            } else {
                throw new Error(res.message);
            }
        } catch (err) {
            showMessage('error', `Update gagal: ${err.message}`);
        }
    }, [showMessage]);

    // Update stock - This should be handled by inventoryApi transactions, not direct Product manipulation
    // We deprecated this in favor of wmsApi calls in specific pages (Receiving, Counting, etc.)
    const updateStock = useCallback((productId, quantity, operation = 'add') => {
        console.warn('updateStock in ProductContext is deprecated. Use Inventory API');
        // Legacy support if needed
    }, []);

    // QC Inspection (Keep mock logic for now or move to wmsApi completely)
    const performQCInspection = useCallback((transactionId, type, status, notes, inspectorId, inspectorName) => {
        // ... existing mock logic or call API ...
        // QC Page now uses wmsApi directly so this might be unused.
        // Keeping concise for now.
    }, []);

    // Open modals
    const openImportModal = useCallback(() => setShowImportModal(true), []);
    const closeImportModal = useCallback(() => setShowImportModal(false), []);

    const openAddModal = useCallback((category = 'hose') => {
        setEditingProduct({ category });
        setShowAddEditModal(true);
    }, []);

    const openEditModal = useCallback((product) => {
        setEditingProduct(product);
        setShowAddEditModal(true);
    }, []);

    const closeAddEditModal = useCallback(() => {
        setShowAddEditModal(false);
        setEditingProduct(null);
    }, []);

    const openQCModal = useCallback((transaction) => {
        setQcTransaction(transaction);
        setShowQCModal(true);
    }, []);

    const closeQCModal = useCallback(() => {
        setShowQCModal(false);
        setQcTransaction(null);
    }, []);

    return (
        <ProductContext.Provider value={{
            // State
            products,
            qcLogs,
            loading, // Expose loading
            showImportModal,
            showAddEditModal,
            showQCModal,
            editingProduct,
            qcTransaction,
            actionMessage,

            // Getters
            getHoseProducts,
            getFittingProducts,
            getLowStockProducts,

            // Actions
            importProducts,
            addProduct,
            updateProduct,
            updateStock,
            performQCInspection,
            refreshProducts: loadProducts,

            // Modal controls
            openImportModal,
            closeImportModal,
            openAddModal,
            openEditModal,
            closeAddEditModal,
            openQCModal,
            closeQCModal
        }}>
            {children}
        </ProductContext.Provider>
    );
}

export function useProducts() {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error('useProducts must be used within a ProductProvider');
    }
    return context;
}
