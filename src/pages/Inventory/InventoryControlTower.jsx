
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Card from '../../components/common/Card/Card';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import './InventoryControlTower.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function InventoryControlTower() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState({ total_lio: 0, total_konsi: 0, total_pinjam: 0 });

    useEffect(() => {
        loadData();
    }, [search]); // Auto-reload on search debounce? Better manual or debounced.

    const loadData = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({ limit: 100 });
            if (search) query.append('search', search);

            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/control-tower?${query.toString()}`);
            const result = await res.json();

            if (result.status === 'success') {
                setData(result.data);
                calculateStats(result.data);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const calculateStats = (items) => {
        let lio = 0, konsi = 0, pinjam = 0;
        items.forEach(i => {
            lio += i.stok_lio;
            konsi += i.stok_konsi;
            pinjam += i.stok_pinjam;
        });
        setStats({ total_lio: lio, total_konsi: konsi, total_pinjam: pinjam });
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') loadData();
    };

    const handleSync = async () => {
        const sheetId = window.prompt("Masukkan Google Sheet ID target (Pastikan service account sudah diinvite):");
        if (!sheetId) return;

        if (!window.confirm("Yakin ingin overwrite data di Google Sheet?")) return;

        setLoading(true);
        try {
            const res = await api.post('/sync/push/inventory', { sheet_id: sheetId });
            alert(`Sukses! ${res.data.message}`);
        } catch (err) {
            alert(`Gagal: ${err.message || 'Error sync'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="control-tower-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🗼 Control Tower (Asset Monitor)</h1>
                    <p className="page-subtitle">Monitor sebaran aset: Gudang Pusat (Lio) vs Titipan (Konsi) vs Pinjaman Customer.</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                    <Button variant="primary" onClick={handleSync}>☁️ Sync to Sheet</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="stats-grid">
                <Card className="stat-card lio">
                    <div className="stat-label">Gudang Lio (Pusat)</div>
                    <div className="stat-value">{stats.total_lio.toLocaleString()} <span className="unit">pcs</span></div>
                </Card>
                <Card className="stat-card konsi">
                    <div className="stat-label">Konsinyasi (Titipan)</div>
                    <div className="stat-value">{stats.total_konsi.toLocaleString()} <span className="unit">pcs</span></div>
                </Card>
                <Card className="stat-card pinjam">
                    <div className="stat-label">Pinjaman (Loan)</div>
                    <div className="stat-value">{stats.total_pinjam.toLocaleString()} <span className="unit">pcs</span></div>
                </Card>
                <Card className="stat-card total">
                    <div className="stat-label">Total Aset Perusahaan</div>
                    <div className="stat-value">{(stats.total_lio + stats.total_konsi + stats.total_pinjam).toLocaleString()} <span className="unit">pcs</span></div>
                </Card>
            </div>

            <Card className="table-card">
                <div className="table-filter">
                    <Input
                        placeholder="Cari SKU, Nama Barang, Brand..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearch}
                        style={{ maxWidth: '400px' }}
                    />
                </div>

                <div className="table-responsive">
                    <table className="ct-table">
                        <thead>
                            <tr>
                                <th>Produk</th>
                                <th className="text-right bg-lio">Stok Lio</th>
                                <th className="text-right bg-konsi">Stok Konsi</th>
                                <th className="text-right bg-pinjam">Stok Pinjam</th>
                                <th className="text-right bg-total">Total Aset</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center">Memuat data...</td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan="5" className="text-center">Tidak ada data ditemukan.</td></tr>
                            ) : (
                                data.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="prod-name">{item.name}</div>
                                            <div className="prod-sku text-muted">{item.sku} | {item.brand}</div>
                                        </td>
                                        <td className="text-right bg-lio-light font-bold">
                                            {item.stok_lio > 0 ? item.stok_lio : '-'}
                                        </td>
                                        <td className="text-right bg-konsi-light font-bold">
                                            {item.stok_konsi > 0 ? item.stok_konsi : '-'}
                                        </td>
                                        <td className="text-right bg-pinjam-light font-bold">
                                            {item.stok_pinjam > 0 ? item.stok_pinjam : '-'}
                                        </td>
                                        <td className="text-right bg-total-light font-bold">
                                            {item.total_asset.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
