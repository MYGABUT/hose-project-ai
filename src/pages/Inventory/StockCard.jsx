/**
 * Stock Card (Kartu Stok) - Excel-Style Movement History
 * Shows chronological In/Out with running balance
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import './StockCard.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function StockCard() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const productIdParam = searchParams.get('product');

    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(productIdParam || '');
    const [productInfo, setProductInfo] = useState(null);
    const [movements, setMovements] = useState([]);
    const [currentStock, setCurrentStock] = useState(0);
    const [loading, setLoading] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [customerFilter, setCustomerFilter] = useState('');

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (selectedProduct) {
            loadStockCard();
        }
    }, [selectedProduct]);

    const loadProducts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/products?limit=200`);
            const data = await res.json();
            if (data.status === 'success') {
                setProducts(data.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadStockCard = async () => {
        if (!selectedProduct) return;

        setLoading(true);
        try {
            let url = `${API_BASE_URL}/api/v1/stock-card/${selectedProduct}`;
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (customerFilter) params.append('customer', customerFilter);

            if (params.toString()) {
                url += '?' + params.toString();
            }

            const res = await fetch(url);
            const data = await res.json();

            if (data.status === 'success') {
                setProductInfo(data.product);
                setMovements(data.data || []);
                setCurrentStock(data.current_stock || 0);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculate totals
    const totalMasuk = movements.reduce((sum, m) => sum + (m.masuk || 0), 0);
    const totalKeluar = movements.reduce((sum, m) => sum + (m.keluar || 0), 0);

    return (
        <div className="stock-card-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">📋 Kartu Stok</h1>
                    <p className="page-subtitle">Riwayat In/Out dengan saldo berjalan</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={() => navigate('/inventory/dashboard')}>
                        📊 Dashboard
                    </Button>
                    <Button variant="secondary" onClick={handlePrint}>
                        🖨️ Print
                    </Button>
                </div>
            </div>

            {/* Product Selector */}
            <Card className="selector-card">
                <div className="selector-row">
                    <div className="selector-item">
                        <label>Pilih Produk:</label>
                        <select
                            value={selectedProduct}
                            onChange={e => setSelectedProduct(e.target.value)}
                        >
                            <option value="">-- Pilih Produk --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.sku} - {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="selector-item">
                        <label>Dari:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="selector-item">
                        <label>Sampai:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="selector-item">
                        <label>Customer:</label>
                        <input
                            type="text"
                            placeholder="Filter customer..."
                            value={customerFilter}
                            onChange={e => setCustomerFilter(e.target.value)}
                        />
                    </div>
                    <Button variant="primary" onClick={loadStockCard}>
                        🔍 Tampilkan
                    </Button>
                </div>
            </Card>

            {/* Product Info */}
            {productInfo && (
                <Card className="product-info-card">
                    <div className="product-info">
                        <div className="info-item">
                            <span className="info-label">Kode:</span>
                            <span className="info-value sku">{productInfo.sku}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Nama:</span>
                            <span className="info-value">{productInfo.name}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Brand:</span>
                            <span className="info-value">{productInfo.brand || '-'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Satuan:</span>
                            <span className="info-value">{productInfo.unit}</span>
                        </div>
                        <div className="info-item current-stock">
                            <span className="info-label">Stok Saat Ini:</span>
                            <span className="info-value">{currentStock} {productInfo.unit}</span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Stock Card Table */}
            {selectedProduct && (
                <Card className="stock-card-table-card">
                    {loading ? (
                        <div className="loading-state">Memuat data...</div>
                    ) : movements.length === 0 ? (
                        <div className="empty-state">
                            <p>Tidak ada data pergerakan stok</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-wrapper">
                                <table className="stock-card-table">
                                    <thead>
                                        <tr>
                                            <th className="col-no">NO</th>
                                            <th className="col-date">TANGGAL</th>
                                            <th className="col-ref">NO. BUKTI</th>
                                            <th className="col-desc">CUSTOMER/VENDOR</th>
                                            <th className="col-num in">MASUK</th>
                                            <th className="col-num out">KELUAR</th>
                                            <th className="col-num balance">SALDO</th>
                                            <th className="col-ket">KETERANGAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.map((m, idx) => (
                                            <tr key={idx} className={m.tipe === 'MASUK' ? 'row-in' : 'row-out'}>
                                                <td className="col-no">{idx + 1}</td>
                                                <td className="col-date">{formatDate(m.tanggal)}</td>
                                                <td className="col-ref">
                                                    <span className="ref-badge">{m.no_bukti}</span>
                                                </td>
                                                <td className="col-desc">{m.customer_vendor}</td>
                                                <td className="col-num in">
                                                    {m.masuk > 0 ? `+${m.masuk}` : ''}
                                                </td>
                                                <td className="col-num out">
                                                    {m.keluar > 0 ? `-${m.keluar}` : ''}
                                                </td>
                                                <td className="col-num balance">{m.saldo}</td>
                                                <td className="col-ket">{m.keterangan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="totals-row">
                                            <td colSpan="4" className="totals-label">TOTAL</td>
                                            <td className="col-num in total">{totalMasuk}</td>
                                            <td className="col-num out total">{totalKeluar}</td>
                                            <td className="col-num balance total">
                                                {movements.length > 0 ? movements[movements.length - 1].saldo : 0}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="table-summary">
                                Menampilkan <strong>{movements.length}</strong> transaksi
                            </div>
                        </>
                    )}
                </Card>
            )}

            {!selectedProduct && (
                <Card className="empty-card">
                    <div className="empty-prompt">
                        <span className="empty-icon">📋</span>
                        <h3>Pilih produk untuk melihat kartu stok</h3>
                        <p>Gunakan dropdown di atas untuk memilih produk</p>
                    </div>
                </Card>
            )}
        </div>
    );
}
