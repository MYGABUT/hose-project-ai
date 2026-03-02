import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import '../Inventory/InventoryDashboard.css'; // Keep reusing the CSS

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function InventoryControlView() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [sortCol, setSortCol] = useState('kode_produk');
    const [sortDir, setSortDir] = useState('asc');

    // FPP Detail Modal
    const [showFppModal, setShowFppModal] = useState(false);
    const [fppDetails, setFppDetails] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const LIMIT = 50;

    useEffect(() => {
        loadData();
    }, [page, search, brandFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/inventory/dashboard?skip=${page * LIMIT}&limit=${LIMIT}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (brandFilter) url += `&brand=${encodeURIComponent(brandFilter)}`;

            const res = await fetch(url);
            const result = await res.json();

            if (result.status === 'success') {
                setData(result.data || []);
                setTotal(result.total || 0);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortCol(col);
            setSortDir('asc');
        }
    };

    const sortedData = [...data].sort((a, b) => {
        const aVal = a[sortCol];
        const bVal = b[sortCol];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortDir === 'asc'
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
    });

    const handleFppClick = async (item) => {
        setSelectedProduct(item);
        try {
            const res = await fetch(`${API_BASE_URL}/inventory/dashboard/${item.id}/fpp-detail`);
            const result = await res.json();
            if (result.status === 'success') {
                setFppDetails(result.data || []);
            }
        } catch (err) {
            console.error(err);
        }
        setShowFppModal(true);
    };

    const getSortIcon = (col) => {
        if (sortCol !== col) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="inventory-dashboard-view">
            {/* Filters */}
            <Card className="filter-bar">
                <div className="filter-row">
                    <div className="filter-item">
                        <label>🔍 Cari:</label>
                        <input
                            type="text"
                            placeholder="Kode / Nama / Brand..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && loadData()}
                        />
                    </div>
                    <div className="filter-item">
                        <label>Brand:</label>
                        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                            <option value="">Semua Brand</option>
                            <option value="EATON">EATON</option>
                            <option value="GATES">GATES</option>
                            <option value="YOKOHAMA">YOKOHAMA</option>
                            <option value="PARKER">PARKER</option>
                            <option value="MANULI">MANULI</option>
                        </select>
                    </div>
                    <div className="header-actions" style={{ marginLeft: 'auto' }}>
                        <Button variant="secondary" onClick={() => navigate('/inventory')}>
                            📦 Detail Rolls
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/inventory/stock-card')}>
                            📋 Kartu Stok
                        </Button>
                        <Button variant="primary" onClick={loadData}>
                            🔄 Refresh
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Main Table - Excel Style */}
            <Card className="dashboard-table-card">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : data.length === 0 ? (
                    <div className="empty-state">
                        <p>Tidak ada data produk</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th className="col-no">NO</th>
                                    <th className="col-kode sortable" onClick={() => handleSort('kode_produk')}>
                                        KODE PRODUK {getSortIcon('kode_produk')}
                                    </th>
                                    <th className="col-brand sortable" onClick={() => handleSort('brand')}>
                                        BRAND {getSortIcon('brand')}
                                    </th>
                                    <th className="col-item">ITEM / UKURAN</th>
                                    <th className="col-num sortable" onClick={() => handleSort('stok_lio')}>
                                        STOK LIO {getSortIcon('stok_lio')}
                                    </th>
                                    <th className="col-num sortable" onClick={() => handleSort('stok_konsi')}>
                                        STOK KONSI {getSortIcon('stok_konsi')}
                                    </th>
                                    <th className="col-num sortable" onClick={() => handleSort('jo_pending')}>
                                        JO PENDING {getSortIcon('jo_pending')}
                                    </th>
                                    <th className="col-status">FPP STATUS</th>
                                    <th className="col-num sortable" onClick={() => handleSort('available')}>
                                        AVAILABLE {getSortIcon('available')}
                                    </th>
                                    <th className="col-action">AKSI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((item, idx) => (
                                    <tr key={item.id} className={item.is_negative ? 'row-negative' : ''}>
                                        <td className="col-no">{page * LIMIT + idx + 1}</td>
                                        <td className="col-kode">
                                            <span className="kode-badge">{item.kode_produk}</span>
                                        </td>
                                        <td className="col-brand">{item.brand || '-'}</td>
                                        <td className="col-item">
                                            {item.nama}
                                            {item.ukuran !== '-' && <span className="size-tag">{item.ukuran}</span>}
                                        </td>
                                        <td className="col-num">{item.stok_lio} {item.unit}</td>
                                        <td className="col-num">{item.stok_konsi} {item.unit}</td>
                                        <td className="col-num">
                                            {item.jo_pending > 0 ? (
                                                <span className="pending-badge">{item.jo_pending} {item.unit}</span>
                                            ) : (
                                                <span className="zero">0</span>
                                            )}
                                        </td>
                                        <td className="col-status">
                                            {item.fpp_status === 'DONE' ? (
                                                <span className="status-done">DONE</span>
                                            ) : (
                                                <span
                                                    className="status-open clickable"
                                                    onClick={() => handleFppClick(item)}
                                                >
                                                    {item.fpp_status}
                                                </span>
                                            )}
                                        </td>
                                        <td className={`col-num ${item.is_negative ? 'negative' : 'positive'}`}>
                                            {item.available} {item.unit}
                                        </td>
                                        <td className="col-action">
                                            {item.is_negative ? (
                                                <Button size="xs" variant="danger">Order!</Button>
                                            ) : (
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={() => navigate(`/inventory/stock-card?product=${item.id}`)}
                                                >
                                                    Detail
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {total > LIMIT && (
                    <div className="pagination">
                        <Button
                            variant="ghost"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                        >
                            ← Prev
                        </Button>
                        <span className="page-info">
                            Halaman {page + 1} dari {Math.ceil(total / LIMIT)}
                        </span>
                        <Button
                            variant="ghost"
                            disabled={(page + 1) * LIMIT >= total}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next →
                        </Button>
                    </div>
                )}
            </Card>

            {/* Legend */}
            <div className="dashboard-legend">
                <span className="legend-item">
                    <span className="legend-dot done"></span> DONE = Semua FPP selesai
                </span>
                <span className="legend-item">
                    <span className="legend-dot open"></span> OPEN (X) = Ada X JO masih pending
                </span>
                <span className="legend-item">
                    <span className="legend-dot pending"></span> JO Pending = Sudah dipesan, belum selesai
                </span>
                <span className="legend-item">
                    <span className="legend-dot negative"></span> Available negatif = Perlu order!
                </span>
            </div>

            {/* FPP Detail Modal */}
            <Modal
                isOpen={showFppModal}
                onClose={() => setShowFppModal(false)}
                title={`📋 FPP/JO Open: ${selectedProduct?.kode_produk || ''}`}
                size="lg"
            >
                <div className="fpp-detail-modal">
                    {fppDetails.length === 0 ? (
                        <p className="empty-text">Tidak ada JO pending</p>
                    ) : (
                        <table className="fpp-table">
                            <thead>
                                <tr>
                                    <th>NO. JO</th>
                                    <th>CUSTOMER</th>
                                    <th>QTY ORDER</th>
                                    <th>SELESAI</th>
                                    <th>KURANG</th>
                                    <th>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fppDetails.map((fpp, idx) => (
                                    <tr key={idx}>
                                        <td className="jo-number">{fpp.jo_number}</td>
                                        <td>{fpp.customer}</td>
                                        <td>{fpp.qty_ordered}</td>
                                        <td>{fpp.qty_completed}</td>
                                        <td className="qty-pending">{fpp.qty_pending}</td>
                                        <td>
                                            <span className={`status-badge ${fpp.status?.toLowerCase()}`}>
                                                {fpp.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Modal>
        </div>
    );
}
