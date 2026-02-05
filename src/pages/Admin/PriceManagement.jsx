import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AlertBox from '../../components/common/Alert/AlertBox';
import Modal from '../../components/common/Modal/Modal';
import { getProducts } from '../../services/productApi';
import { bulkAdjustPrices, getPriceHistory } from '../../services/pricingApi';
import './PriceManagement.css';

// Derived from mock, but theoretically should be from API
const categories = [
    { id: 'all', name: 'Semua Kategori' },
    { id: 'hose', name: 'Hydraulic Hose' },
    { id: 'fitting', name: 'Fitting & Connector' },
    { id: 'assembly', name: 'Hose Assembly' }
];

const brands = [
    { id: 'all', name: 'Semua Brand' },
    { id: 'gates', name: 'GATES' },
    { id: 'eaton', name: 'EATON' },
    { id: 'parker', name: 'PARKER' },
    { id: 'manuli', name: 'MANULI' }
];

export default function PriceManagement() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedBrand, setSelectedBrand] = useState('all');
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustMethod, setAdjustMethod] = useState('percentage');
    const [adjustValue, setAdjustValue] = useState('');
    const [adjustDirection, setAdjustDirection] = useState('increase');
    const [adjustReason, setAdjustReason] = useState('');
    const [priceHistory, setPriceHistory] = useState([]);
    const [selectedProductHistory, setSelectedProductHistory] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await getProducts();
        if (Array.isArray(res)) {
            setProducts(res); // Handle array return
        } else if (res.data) {
            setProducts(res.data); // Handle {data: []} return
        }
        setLoading(false);
    };

    // Filter products
    const filteredProducts = products.filter(p => {
        if (selectedCategory !== 'all' && (p.category !== selectedCategory && p.category?.toLowerCase() !== selectedCategory)) return false;
        if (selectedBrand !== 'all' && p.brand?.toLowerCase() !== selectedBrand) return false;
        return true;
    });

    // Calculate preview
    const previewNewPrice = (currentPrice) => {
        const value = parseFloat(adjustValue) || 0;
        if (value === 0) return currentPrice;

        let newPrice = currentPrice;
        if (adjustMethod === 'percentage') {
            const multiplier = adjustDirection === 'increase' ? (1 + value / 100) : (1 - value / 100);
            newPrice = currentPrice * multiplier;
        } else {
            newPrice = adjustDirection === 'increase' ? currentPrice + value : currentPrice - value;
        }
        return Math.round(newPrice);
    };

    const handleApplyAdjustment = async () => {
        if (!adjustValue || !adjustReason) return;

        const payload = {
            category_id: selectedCategory,
            brand_id: selectedBrand,
            method: adjustMethod,
            direction: adjustDirection,
            value: parseFloat(adjustValue),
            reason: adjustReason
        };

        const res = await bulkAdjustPrices(payload);
        if (res.status === 'success') {
            alert(`✅ Harga berhasil diperbarui untuk ${res.affected_count} item!\nAlasan: ${adjustReason}`);
            setShowAdjustModal(false);
            setAdjustValue('');
            setAdjustReason('');
            loadData(); // Refresh list to see new prices
        } else {
            alert('Gagal update harga: ' + res.message);
        }
    };

    const loadPriceHistory = async (product) => {
        setSelectedProductHistory(product);
        const res = await getPriceHistory(product.id);
        if (res.status === 'success') {
            setPriceHistory(res.data);
        } else {
            setPriceHistory([]);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value || 0);
    };

    return (
        <div className="price-management-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Manajemen Harga Dasar</h1>
                    <p className="page-subtitle">Sesuaikan harga dasar (HPP) secara massal</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={() => setShowAdjustModal(true)}
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20v-6M12 4v2M6 12H4M20 12h-2M17.66 17.66l-1.42-1.42M7.76 7.76L6.34 6.34M17.66 6.34l-1.42 1.42M7.76 16.24l-1.42 1.42" />
                            </svg>
                        }
                    >
                        Sesuaikan Harga
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card title="Filter Produk">
                <div className="filter-row">
                    <div className="filter-group">
                        <label>Kategori</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Brand</label>
                        <select
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                        >
                            {brands.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-result">
                        <strong>{filteredProducts.length}</strong> produk terpilih
                    </div>
                </div>
            </Card>

            {/* Product List */}
            <Card title="Daftar Produk">
                {loading ? (
                    <div className="loading-state">Loading produk...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="empty-state">Tidak ada produk ditemukan.</div>
                ) : (
                    <div className="product-table">
                        <div className="table-header">
                            <span>SKU</span>
                            <span>Nama Produk</span>
                            <span>Brand</span>
                            <span>Harga Dasar (HPP)</span>
                            <span>History</span>
                        </div>

                        {filteredProducts.map((product) => (
                            <div key={product.id} className="table-row">
                                <span className="product-sku">{product.sku}</span>
                                <span className="product-name">{product.name}</span>
                                <span className="product-brand">{(product.brand || '-').toUpperCase()}</span>
                                <span className="product-price">{formatCurrency(product.cost_price)}</span>
                                <div className="product-history-btn">
                                    <Button size="sm" variant="text" onClick={() => loadPriceHistory(product)}>
                                        📜 Lihat History
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Price History Chart / List */}
            {selectedProductHistory && (
                <Card title={`Riwayat Perubahan Harga: ${selectedProductHistory.name}`} subtitle={selectedProductHistory.sku}>
                    {priceHistory.length === 0 ? (
                        <div className="empty-state">Belum ada riwayat perubahan harga.</div>
                    ) : (
                        <div className="price-history">
                            <div className="history-list">
                                {priceHistory.map((h, idx) => (
                                    <div key={h.id} className="history-item">
                                        <div className="history-date">{h.date}</div>
                                        <div className="history-info">
                                            <div className="history-reason">{h.reason} ({h.type})</div>
                                            <div className="history-user">By: {h.by || 'System'}</div>
                                        </div>
                                        <div className="history-price">
                                            <span className="old-val">{formatCurrency(h.old_price)}</span>
                                            <span className="arrow">➔</span>
                                            <span className="new-val">{formatCurrency(h.price)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Adjustment Modal */}
            <Modal
                isOpen={showAdjustModal}
                onClose={() => setShowAdjustModal(false)}
                title="Sesuaikan Harga Dasar"
                size="md"
            >
                <div className="adjust-modal-content">
                    <div className="target-info">
                        <span className="target-label">TARGET PRODUK:</span>
                        <span className="target-value">
                            {selectedCategory !== 'all' ? categories.find(c => c.id === selectedCategory)?.name : 'Semua Kategori'}
                            {selectedBrand !== 'all' ? ` • ${brands.find(b => b.id === selectedBrand)?.name}` : ''}
                        </span>
                        <span className="target-count">*Terpilih {filteredProducts.length} Item</span>
                    </div>

                    <div className="adjust-method">
                        <label>METODE PENYESUAIAN:</label>
                        <div className="method-options">
                            <label className={`method-option ${adjustMethod === 'percentage' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="method"
                                    value="percentage"
                                    checked={adjustMethod === 'percentage'}
                                    onChange={() => setAdjustMethod('percentage')}
                                />
                                Persentase (%)
                            </label>
                            <label className={`method-option ${adjustMethod === 'fixed' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="method"
                                    value="fixed"
                                    checked={adjustMethod === 'fixed'}
                                    onChange={() => setAdjustMethod('fixed')}
                                />
                                Nominal Tetap (Rp)
                            </label>
                        </div>
                    </div>

                    <div className="adjust-action">
                        <label>AKSI:</label>
                        <div className="action-row">
                            <select
                                value={adjustDirection}
                                onChange={(e) => setAdjustDirection(e.target.value)}
                            >
                                <option value="increase">NAIKKAN (+)</option>
                                <option value="decrease">TURUNKAN (-)</option>
                            </select>
                            <span>sebesar</span>
                            <input
                                type="number"
                                value={adjustValue}
                                onChange={(e) => setAdjustValue(e.target.value)}
                                placeholder="0"
                            />
                            <span>{adjustMethod === 'percentage' ? '%' : 'Rp'}</span>
                        </div>
                    </div>

                    {adjustValue && filteredProducts.length > 0 && (
                        <div className="adjust-preview">
                            <label>SIMULASI:</label>
                            <div className="preview-example">
                                <span>Contoh Item: {filteredProducts[0]?.name || 'N/A'}</span>
                                <div className="preview-prices">
                                    <span className="old-price">
                                        Harga Lama: {formatCurrency(filteredProducts[0]?.cost_price || 0)}
                                    </span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                    <span className="new-price">
                                        Harga Baru: {formatCurrency(previewNewPrice(filteredProducts[0]?.cost_price || 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="adjust-reason">
                        <label>ALASAN PERUBAHAN (Wajib untuk Audit):</label>
                        <textarea
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="Contoh: Kenaikan biaya impor & kurs dolar per 15 Jan"
                            rows={2}
                        />
                    </div>

                    <AlertBox variant="info">
                        Perubahan harga akan otomatis memperbarui kalkulasi Margin Guard di modul Sales.
                    </AlertBox>

                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setShowAdjustModal(false)}>
                            Batal
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleApplyAdjustment}
                            disabled={!adjustValue || !adjustReason}
                        >
                            Terapkan ke {filteredProducts.length} Item
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
