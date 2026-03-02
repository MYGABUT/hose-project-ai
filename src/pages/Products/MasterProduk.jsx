import { useState, useMemo } from 'react';
import { useProducts } from '../../contexts/ProductContext';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import './MasterProduk.css';

export default function MasterProduk() {
    const {
        getHoseProducts,
        getFittingProducts,
        openAddModal,
        openEditModal,
        openImportModal,
        showImportModal,
        closeImportModal,
        showAddEditModal,
        closeAddEditModal,
        editingProduct,
        addProduct,
        updateProduct,
        importProducts,
        actionMessage
    } = useProducts();

    const [activeTab, setActiveTab] = useState('hose');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBrand, setFilterBrand] = useState('all');

    // Form state for add/edit
    const [formData, setFormData] = useState({});
    const [importText, setImportText] = useState('');

    // Get products based on active tab
    const products = activeTab === 'hose' ? getHoseProducts() : getFittingProducts();

    // Get unique brands for filter
    const brands = useMemo(() => {
        const uniqueBrands = [...new Set(products.map(p => p.brand))];
        return uniqueBrands.filter(Boolean).sort();
    }, [products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch =
                p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.size?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesBrand = filterBrand === 'all' || p.brand === filterBrand;
            return matchesSearch && matchesBrand;
        });
    }, [products, searchTerm, filterBrand]);

    // Stats
    const stats = useMemo(() => ({
        total: products.length,
        lowStock: products.filter(p => p.stock <= p.minStock).length,
        unsetPrice: products.filter(p => p.price === 0).length,
        totalValue: products.reduce((sum, p) => sum + (p.stock * p.price), 0)
    }), [products]);

    // Initialize form when editing
    useState(() => {
        if (editingProduct && editingProduct.id) {
            setFormData(editingProduct);
        } else if (editingProduct) {
            setFormData({
                category: editingProduct.category || activeTab,
                sku: '',
                name: '',
                brand: '',
                size: '',
                type: '',
                stock: 0,
                price: 0,
                minStock: 10,
                binLocation: ''
            });
        }
    }, [editingProduct]);

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formData.name?.trim()) return;

        if (editingProduct?.id) {
            updateProduct(editingProduct.id, formData);
        } else {
            addProduct({ ...formData, category: activeTab });
        }
        setFormData({});
    };

    const handleImport = () => {
        if (!importText.trim()) return;

        try {
            // Simple CSV parsing (SKU, Name, Brand, Size, Stock, Price)
            const lines = importText.trim().split('\n');
            const data = lines.map(line => {
                const [sku, name, brand, size, stock, price] = line.split(',').map(s => s?.trim());
                return { sku, name, brand, size, stock, price };
            });

            importProducts(data, activeTab);
            setImportText('');
        } catch (e) {
            alert('Format tidak valid. Gunakan: SKU, Nama, Brand, Size, Stock, Harga');
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="master-produk-page">
            {/* Action Message Toast */}
            {actionMessage && (
                <div className={`action-toast ${actionMessage.type}`}>
                    {actionMessage.text}
                </div>
            )}

            {/* Page Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1>📦 Master Produk Database</h1>
                    <p>Kelola semua produk selang dan fitting</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={openImportModal}>
                        📥 Import Excel
                    </Button>
                    <Button variant="primary" onClick={() => openAddModal(activeTab)}>
                        ➕ Tambah Manual
                    </Button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'hose' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hose')}
                >
                    🔧 SELANG (HOSE)
                    <span className="tab-count">{getHoseProducts().length}</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'fitting' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fitting')}
                >
                    ⚙️ FITTING & ADAPTER
                    <span className="tab-count">{getFittingProducts().length}</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-icon">📊</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Produk</span>
                    </div>
                </div>
                <div className="stat-card warning">
                    <span className="stat-icon">⚠️</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.lowStock}</span>
                        <span className="stat-label">Stok Rendah</span>
                    </div>
                </div>
                <div className="stat-card alert">
                    <span className="stat-icon">💰</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.unsetPrice}</span>
                        <span className="stat-label">Harga Belum Set</span>
                    </div>
                </div>
                <div className="stat-card success">
                    <span className="stat-icon">💵</span>
                    <div className="stat-content">
                        <span className="stat-value">{formatCurrency(stats.totalValue)}</span>
                        <span className="stat-label">Nilai Stok</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Cari SKU / Nama / Ukuran..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="brand-filter"
                >
                    <option value="all">Semua Brand</option>
                    {brands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                    ))}
                </select>
            </div>

            {/* Products Table */}
            <div className="products-table-container">
                <table className="products-table">
                    <thead>
                        <tr>
                            <th>FOTO</th>
                            <th>SKU / NAMA</th>
                            <th>BRAND / TYPE</th>
                            <th>UKURAN</th>
                            <th>STOK</th>
                            <th>HARGA (RP)</th>
                            <th>LOKASI</th>
                            <th>AKSI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="empty-state">
                                    <span className="empty-icon">📭</span>
                                    <p>Tidak ada produk ditemukan</p>
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map(product => {
                                const isLowStock = product.stock <= product.minStock;
                                const isPriceUnset = product.price === 0;
                                const isAutoSku = product.sku?.startsWith('AUTO-');

                                return (
                                    <tr key={product.id} className={isLowStock ? 'low-stock' : ''}>
                                        {/* Photo */}
                                        <td>
                                            <div className="product-photo">
                                                {product.image ? (
                                                    <img src={product.image} alt={product.name} />
                                                ) : (
                                                    <span className="photo-placeholder">
                                                        {activeTab === 'hose' ? '🔧' : '⚙️'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* SKU / Name */}
                                        <td>
                                            <div className="product-info">
                                                <span className={`product-sku ${isAutoSku ? 'auto' : ''}`}>
                                                    {product.sku}
                                                    {isAutoSku && <span className="auto-badge">AUTO</span>}
                                                </span>
                                                <span className="product-name">{product.name}</span>
                                            </div>
                                        </td>

                                        {/* Brand / Type */}
                                        <td>
                                            <div className="brand-info">
                                                <span className="brand-name">{product.brand}</span>
                                                <span className="product-type">{product.type || '-'}</span>
                                            </div>
                                        </td>

                                        {/* Size */}
                                        <td>
                                            <span className="size-badge">{product.size || '-'}</span>
                                        </td>

                                        {/* Stock */}
                                        <td>
                                            <span className={`stock-value ${isLowStock ? 'low' : ''}`}>
                                                {product.stock} {product.unit}
                                                {isLowStock && <span className="low-badge">⚠️</span>}
                                            </span>
                                        </td>

                                        {/* Price */}
                                        <td>
                                            {isPriceUnset ? (
                                                <button
                                                    className="unset-price-btn"
                                                    onClick={() => openEditModal(product)}
                                                >
                                                    ⚠️ SET!
                                                </button>
                                            ) : (
                                                <span className="price-value">
                                                    {formatCurrency(product.price)}
                                                </span>
                                            )}
                                        </td>

                                        {/* Location */}
                                        <td>
                                            <span className="location-badge">
                                                {product.binLocation || '-'}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="action-btn edit"
                                                    onClick={() => openEditModal(product)}
                                                    title="Edit Produk"
                                                >
                                                    🖊️
                                                </button>
                                                <button
                                                    className="action-btn"
                                                    onClick={() => {
                                                        // Open Substitute Modal (Inline logic for brevity)
                                                        const subId = prompt("Masukkan ID Produk Pengganti (Substitute) untuk SKU " + product.sku + ":");
                                                        if (subId) {
                                                            // Call API
                                                            fetch(`${import.meta.env.VITE_AI_API_URL || ""}/api/v1/products/${product.id}/substitutes`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ substitute_product_id: parseInt(subId) })
                                                            })
                                                                .then(res => res.json())
                                                                .then(data => alert(data.message || data.detail))
                                                                .catch(e => alert(e.message));
                                                        }
                                                    }}
                                                    title="Tambah Substitute"
                                                >
                                                    🔄
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Import Modal */}
            <Modal
                isOpen={showImportModal}
                onClose={closeImportModal}
                title="📥 Import Data Produk"
                size="md"
            >
                <div className="import-modal-content">
                    <div className="import-info">
                        <h4>Format Data (CSV):</h4>
                        <code>SKU, Nama, Brand, Size, Stock, Harga</code>
                        <p className="import-note">
                            💡 SKU kosong akan di-generate otomatis (AUTO-XXX)<br />
                            💡 Harga kosong akan di-set 0 dan ditandai "SET!"
                        </p>
                    </div>
                    <textarea
                        className="import-textarea"
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder="Paste data CSV di sini...
Contoh:
HOSE-NEW-01, Selang R2 1/2 inch, Eaton, 1/2, 50, 75000
, Selang R1 3/8 inch, Gates, 3/8, 100,"
                        rows={10}
                    />
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={closeImportModal}>Batal</Button>
                        <Button variant="primary" onClick={handleImport}>
                            📥 Import {activeTab === 'hose' ? 'Selang' : 'Fitting'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showAddEditModal}
                onClose={closeAddEditModal}
                title={editingProduct?.id ? '🖊️ Edit Produk' : '➕ Tambah Produk Baru'}
                size="md"
            >
                <div className="add-edit-modal-content">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>SKU</label>
                            <input
                                type="text"
                                value={formData.sku || ''}
                                onChange={(e) => handleFormChange('sku', e.target.value)}
                                placeholder="Kosongkan untuk auto-generate"
                            />
                        </div>
                        <div className="form-group">
                            <label>Nama Produk *</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => handleFormChange('name', e.target.value)}
                                placeholder="Nama lengkap produk"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Brand</label>
                            <input
                                type="text"
                                value={formData.brand || ''}
                                onChange={(e) => handleFormChange('brand', e.target.value)}
                                placeholder="Eaton, Gates, Manuli..."
                            />
                        </div>
                        <div className="form-group">
                            <label>Ukuran</label>
                            <input
                                type="text"
                                value={formData.size || ''}
                                onChange={(e) => handleFormChange('size', e.target.value)}
                                placeholder="1/2, 3/4, 1 inch..."
                            />
                        </div>
                        <div className="form-group">
                            <label>Stok</label>
                            <input
                                type="number"
                                value={formData.stock || 0}
                                onChange={(e) => handleFormChange('stock', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Harga (Rp)</label>
                            <input
                                type="number"
                                value={formData.price || 0}
                                onChange={(e) => handleFormChange('price', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Min. Stock (Alert)</label>
                            <input
                                type="number"
                                value={formData.minStock || 10}
                                onChange={(e) => handleFormChange('minStock', parseInt(e.target.value) || 10)}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Lokasi Rak</label>
                            <input
                                type="text"
                                value={formData.binLocation || ''}
                                onChange={(e) => handleFormChange('binLocation', e.target.value)}
                                placeholder="A-01, B-02..."
                            />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={closeAddEditModal}>Batal</Button>
                        <Button variant="primary" onClick={handleSubmit}>
                            💾 {editingProduct?.id ? 'Simpan Perubahan' : 'Tambah Produk'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
