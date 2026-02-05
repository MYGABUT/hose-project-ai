import { useState, useMemo, useCallback } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import AlertBox from '../../components/common/Alert/AlertBox';
import './SpreadsheetPriceEditor.css';

// Mock product data
const initialProducts = [
    { id: 1, sku: 'HOS-001', name: 'Gates R1 1/2"', category: 'hose', brand: 'GATES', basePrice: 45000, stock: 120 },
    { id: 2, sku: 'HOS-002', name: 'Gates R2 3/8"', category: 'hose', brand: 'GATES', basePrice: 50000, stock: 85 },
    { id: 3, sku: 'HOS-003', name: 'Gates R2 1/2"', category: 'hose', brand: 'GATES', basePrice: 65000, stock: 200 },
    { id: 4, sku: 'HOS-004', name: 'Gates R2 3/4"', category: 'hose', brand: 'GATES', basePrice: 80000, stock: 45 },
    { id: 5, sku: 'HOS-005', name: 'Eaton 2SN 1/2"', category: 'hose', brand: 'EATON', basePrice: 55000, stock: 150 },
    { id: 6, sku: 'HOS-006', name: 'Eaton 2SN 3/4"', category: 'hose', brand: 'EATON', basePrice: 72000, stock: 90 },
    { id: 7, sku: 'HOS-007', name: 'Eaton 2SN 1"', category: 'hose', brand: 'EATON', basePrice: 95000, stock: 60 },
    { id: 8, sku: 'HOS-008', name: 'Parker 4SH 3/4"', category: 'hose', brand: 'PARKER', basePrice: 125000, stock: 30 },
    { id: 9, sku: 'HOS-009', name: 'Parker 4SH 1"', category: 'hose', brand: 'PARKER', basePrice: 150000, stock: 25 },
    { id: 10, sku: 'FIT-001', name: 'JIC Female 1/2"', category: 'fitting', brand: 'GATES', basePrice: 35000, stock: 500 },
    { id: 11, sku: 'FIT-002', name: 'JIC Male 3/4"', category: 'fitting', brand: 'EATON', basePrice: 42000, stock: 350 },
    { id: 12, sku: 'FIT-003', name: 'ORB Male 1/2"', category: 'fitting', brand: 'PARKER', basePrice: 48000, stock: 200 }
];

const categories = ['all', 'hose', 'fitting'];
const brands = ['all', 'GATES', 'EATON', 'PARKER'];
const sizes = ['all', '1/4"', '3/8"', '1/2"', '3/4"', '1"'];

export default function SpreadsheetPriceEditor() {
    const [products, setProducts] = useState(initialProducts);
    const [editedPrices, setEditedPrices] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterBrand, setFilterBrand] = useState('all');
    const [filterSize, setFilterSize] = useState('all');
    const [bulkSkus, setBulkSkus] = useState('');
    const [showBulkSearch, setShowBulkSearch] = useState(false);
    const [bulkAdjustment, setBulkAdjustment] = useState('');
    const [roundToThousand, setRoundToThousand] = useState(true);

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            // Text search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const match = p.name.toLowerCase().includes(query) ||
                    p.sku.toLowerCase().includes(query);
                if (!match) return false;
            }

            // Bulk SKU search
            if (showBulkSearch && bulkSkus.trim()) {
                const skuList = bulkSkus.split(/[\n,;]/).map(s => s.trim().toUpperCase()).filter(Boolean);
                if (!skuList.includes(p.sku.toUpperCase())) return false;
            }

            // Category filter
            if (filterCategory !== 'all' && p.category !== filterCategory) return false;

            // Brand filter
            if (filterBrand !== 'all' && p.brand !== filterBrand) return false;

            // Size filter
            if (filterSize !== 'all' && !p.name.includes(filterSize)) return false;

            return true;
        });
    }, [products, searchQuery, filterCategory, filterBrand, filterSize, showBulkSearch, bulkSkus]);

    // Count changes
    const changedCount = Object.keys(editedPrices).length;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID').format(value);
    };

    const roundPrice = useCallback((price) => {
        if (!roundToThousand) return price;
        return Math.round(price / 1000) * 1000;
    }, [roundToThousand]);

    const handlePriceChange = (productId, newPrice) => {
        const numPrice = parseInt(newPrice) || 0;
        const originalPrice = products.find(p => p.id === productId)?.basePrice;

        if (numPrice === originalPrice) {
            // Remove from edited if back to original
            setEditedPrices(prev => {
                const updated = { ...prev };
                delete updated[productId];
                return updated;
            });
        } else {
            setEditedPrices(prev => ({
                ...prev,
                [productId]: numPrice
            }));
        }
    };

    const handleBulkAdjust = () => {
        const percent = parseFloat(bulkAdjustment);
        if (isNaN(percent)) return;

        const newEdited = { ...editedPrices };
        filteredProducts.forEach(p => {
            const newPrice = roundPrice(p.basePrice * (1 + percent / 100));
            if (newPrice !== p.basePrice) {
                newEdited[p.id] = newPrice;
            }
        });
        setEditedPrices(newEdited);
        setBulkAdjustment('');
    };

    const handleResetItem = (productId) => {
        setEditedPrices(prev => {
            const updated = { ...prev };
            delete updated[productId];
            return updated;
        });
    };

    const handleResetAll = () => {
        setEditedPrices({});
    };

    const handleSaveAll = () => {
        // Apply changes to products
        setProducts(prev => prev.map(p => ({
            ...p,
            basePrice: editedPrices[p.id] !== undefined ? editedPrices[p.id] : p.basePrice
        })));
        setEditedPrices({});
        alert(`✅ ${changedCount} item berhasil diperbarui!`);
    };

    const getNewPrice = (product) => {
        return editedPrices[product.id] !== undefined ? editedPrices[product.id] : product.basePrice;
    };

    const getPriceChange = (product) => {
        const newPrice = getNewPrice(product);
        const diff = newPrice - product.basePrice;
        const percent = ((diff / product.basePrice) * 100).toFixed(1);
        return { diff, percent };
    };

    return (
        <div className="spreadsheet-editor">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Mode Edit Harga (Spreadsheet)</h1>
                    <p className="page-subtitle">Edit harga seperti Excel - perubahan langsung terlihat</p>
                </div>
            </div>

            {/* Search & Filters */}
            <Card>
                <div className="search-section">
                    {/* Global Search */}
                    <div className="search-row">
                        <div className="search-input-wrapper">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Cari nama barang, SKU, atau ukuran..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
                            )}
                        </div>
                        <button
                            className={`bulk-search-toggle ${showBulkSearch ? 'active' : ''}`}
                            onClick={() => setShowBulkSearch(!showBulkSearch)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="2" width="6" height="6" rx="1" />
                                <rect x="9" y="16" width="6" height="6" rx="1" />
                                <rect x="9" y="9" width="6" height="6" rx="1" />
                            </svg>
                            Paste Daftar SKU
                        </button>
                    </div>

                    {/* Bulk SKU Search */}
                    {showBulkSearch && (
                        <div className="bulk-search-area">
                            <label>Paste daftar SKU dari Excel/Email (pisah dengan Enter atau koma):</label>
                            <textarea
                                value={bulkSkus}
                                onChange={(e) => setBulkSkus(e.target.value)}
                                placeholder="HOS-001&#10;HOS-003&#10;FIT-002"
                                rows={4}
                            />
                            <div className="bulk-search-actions">
                                <Button variant="secondary" size="sm" onClick={() => setBulkSkus('')}>
                                    Clear
                                </Button>
                                <span className="bulk-count">
                                    {bulkSkus.split(/[\n,;]/).filter(s => s.trim()).length} SKU dimasukkan
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Faceted Filters */}
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Kategori</label>
                            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                                <option value="all">Semua</option>
                                <option value="hose">Hose</option>
                                <option value="fitting">Fitting</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Brand</label>
                            <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
                                {brands.map(b => <option key={b} value={b}>{b === 'all' ? 'Semua' : b}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Ukuran</label>
                            <select value={filterSize} onChange={(e) => setFilterSize(e.target.value)}>
                                {sizes.map(s => <option key={s} value={s}>{s === 'all' ? 'Semua' : s}</option>)}
                            </select>
                        </div>
                        <div className="filter-result">
                            Menampilkan <strong>{filteredProducts.length}</strong> dari {products.length} item
                        </div>
                    </div>
                </div>
            </Card>

            {/* Bulk Tools */}
            <Card title="🛠️ Tools Cepat">
                <div className="bulk-tools">
                    <div className="tool-group">
                        <label>Naikkan/Turunkan Semua yang Tampil:</label>
                        <div className="tool-input">
                            <input
                                type="number"
                                value={bulkAdjustment}
                                onChange={(e) => setBulkAdjustment(e.target.value)}
                                placeholder="5"
                            />
                            <span>%</span>
                            <Button variant="primary" size="sm" onClick={handleBulkAdjust}>
                                Apply ke {filteredProducts.length} Item
                            </Button>
                        </div>
                    </div>
                    <div className="tool-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={roundToThousand}
                                onChange={(e) => setRoundToThousand(e.target.checked)}
                            />
                            Bulatkan ke Ribuan Terdekat (Smart Rounding)
                        </label>
                    </div>
                </div>
            </Card>

            {/* Spreadsheet Table */}
            <Card title="📊 Daftar Harga (Mode Edit)">
                <div className="spreadsheet-table">
                    <div className="table-header">
                        <span className="col-sku">SKU</span>
                        <span className="col-name">Nama Produk</span>
                        <span className="col-brand">Brand</span>
                        <span className="col-stock">Stock</span>
                        <span className="col-old">Harga Lama</span>
                        <span className="col-new">Harga Baru (Edit)</span>
                        <span className="col-change">Perubahan</span>
                        <span className="col-action">Aksi</span>
                    </div>

                    <div className="table-body">
                        {filteredProducts.map(product => {
                            const isEdited = editedPrices[product.id] !== undefined;
                            const newPrice = getNewPrice(product);
                            const change = getPriceChange(product);

                            return (
                                <div
                                    key={product.id}
                                    className={`table-row ${isEdited ? 'edited' : ''}`}
                                >
                                    <span className="col-sku">{product.sku}</span>
                                    <span className="col-name">{product.name}</span>
                                    <span className="col-brand">{product.brand}</span>
                                    <span className="col-stock">{product.stock}</span>
                                    <span className="col-old">Rp {formatCurrency(product.basePrice)}</span>
                                    <span className="col-new">
                                        <div className="price-input">
                                            <span className="prefix">Rp</span>
                                            <input
                                                type="number"
                                                value={newPrice}
                                                onChange={(e) => handlePriceChange(product.id, e.target.value)}
                                            />
                                        </div>
                                    </span>
                                    <span className="col-change">
                                        {isEdited && (
                                            <span className={`change-badge ${change.diff >= 0 ? 'up' : 'down'}`}>
                                                {change.diff >= 0 ? '+' : ''}{change.percent}%
                                            </span>
                                        )}
                                        {!isEdited && <span className="no-change">—</span>}
                                    </span>
                                    <span className="col-action">
                                        {isEdited && (
                                            <button className="reset-btn" onClick={() => handleResetItem(product.id)}>
                                                ↩️
                                            </button>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>

            {/* Floating Action Bar */}
            {changedCount > 0 && (
                <div className="floating-action-bar">
                    <div className="fab-content">
                        <span className="fab-message">
                            ⚠️ Anda memiliki <strong>{changedCount} perubahan</strong> yang belum disimpan
                        </span>
                        <div className="fab-actions">
                            <Button variant="secondary" onClick={handleResetAll}>
                                Reset Semua
                            </Button>
                            <Button variant="success" onClick={handleSaveAll}>
                                💾 Simpan {changedCount} Perubahan
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
