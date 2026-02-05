/**
 * Fixed Assets Page - Manage aktiva tetap
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import Modal from '../../components/common/Modal/Modal';
import './Admin.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function FixedAssets() {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [summary, setSummary] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAsset, setNewAsset] = useState({
        name: '', category: 'MACHINE', purchase_date: '', purchase_value: 0,
        useful_life_months: 60, salvage_value: 0, location: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [assetsRes, summaryRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/assets`),
                fetch(`${API_BASE_URL}/api/v1/assets/summary`)
            ]);

            const assetsData = await assetsRes.json();
            const summaryData = await summaryRes.json();

            if (assetsData.status === 'success') setAssets(assetsData.data || []);
            if (summaryData.status === 'success') setSummary(summaryData.data);
        } catch (err) {
            console.error('Error loading assets:', err);
        }
        setLoading(false);
    };

    const createAsset = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAsset)
            });
            const data = await res.json();
            if (data.status === 'success') {
                setShowAddModal(false);
                setNewAsset({ name: '', category: 'MACHINE', purchase_date: '', purchase_value: 0, useful_life_months: 60, salvage_value: 0, location: '' });
                loadData();
            }
        } catch (err) {
            console.error('Error creating asset:', err);
        }
    };

    const runDepreciation = async () => {
        const now = new Date();
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/assets/run-depreciation?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.status === 'success') {
                alert(`Penyusutan selesai: ${data.data.assets_processed} aset, total Rp ${data.data.total_depreciation.toLocaleString()}`);
                loadData();
            }
        } catch (err) {
            console.error('Error running depreciation:', err);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const getCategoryIcon = (category) => {
        const icons = { MACHINE: '⚙️', VEHICLE: '🚗', COMPUTER: '💻', FURNITURE: '🪑', BUILDING: '🏢' };
        return icons[category] || '📦';
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🏭 Aktiva Tetap</h1>
                    <p className="page-subtitle">Manajemen aset dan penyusutan</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={runDepreciation}>📉 Hitung Penyusutan</Button>
                    <Button variant="primary" onClick={() => setShowAddModal(true)}>➕ Tambah Aset</Button>
                </div>
            </div>

            {/* Summary */}
            {summary && (
                <div className="summary-grid">
                    <Card className="summary-card">
                        <div className="summary-content">
                            <span className="summary-value">{summary.total_assets}</span>
                            <span className="summary-label">Total Aset</span>
                        </div>
                    </Card>
                    <Card className="summary-card">
                        <div className="summary-content">
                            <span className="summary-value">{formatCurrency(summary.total_purchase_value)}</span>
                            <span className="summary-label">Nilai Perolehan</span>
                        </div>
                    </Card>
                    <Card className="summary-card warning">
                        <div className="summary-content">
                            <span className="summary-value">{formatCurrency(summary.total_accumulated_depreciation)}</span>
                            <span className="summary-label">Akumulasi Penyusutan</span>
                        </div>
                    </Card>
                    <Card className="summary-card success">
                        <div className="summary-content">
                            <span className="summary-value">{formatCurrency(summary.total_book_value)}</span>
                            <span className="summary-label">Nilai Buku</span>
                        </div>
                    </Card>
                </div>
            )}

            {/* Asset List */}
            <div className="asset-list">
                {loading ? (
                    <div className="loading-state">Memuat aset...</div>
                ) : assets.length === 0 ? (
                    <Card className="empty-state">
                        <p>Belum ada aset terdaftar</p>
                    </Card>
                ) : (
                    assets.map(asset => (
                        <Card key={asset.id} className={`asset-card ${asset.category?.toLowerCase()}`}>
                            <div className="asset-header">
                                <div>
                                    <div className="asset-name">{getCategoryIcon(asset.category)} {asset.name}</div>
                                    <div className="asset-number">{asset.asset_number}</div>
                                </div>
                                <StatusBadge status={asset.status === 'ACTIVE' ? 'success' : 'default'}>
                                    {asset.status}
                                </StatusBadge>
                            </div>
                            <dl className="asset-info">
                                <dt>Kategori</dt>
                                <dd>{asset.category}</dd>
                                <dt>Umur</dt>
                                <dd>{asset.age_months} bulan</dd>
                            </dl>
                            <div className="asset-values">
                                <div className="asset-value">
                                    <span className="asset-value-label">Nilai Perolehan</span>
                                    <span className="asset-value-amount">{formatCurrency(asset.purchase_value)}</span>
                                </div>
                                <div className="asset-value">
                                    <span className="asset-value-label">Penyusutan/bln</span>
                                    <span className="asset-value-amount">{formatCurrency(asset.monthly_depreciation)}</span>
                                </div>
                                <div className="asset-value">
                                    <span className="asset-value-label">Nilai Buku</span>
                                    <span className="asset-value-amount book-value">{formatCurrency(asset.current_book_value)}</span>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Aset Baru" size="medium">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Nama Aset</label>
                            <input type="text" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} placeholder="Mesin Crimping" />
                        </div>
                        <div className="form-group">
                            <label>Kategori</label>
                            <select value={newAsset.category} onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}>
                                <option value="MACHINE">Mesin</option>
                                <option value="VEHICLE">Kendaraan</option>
                                <option value="COMPUTER">Komputer</option>
                                <option value="FURNITURE">Furniture</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Tanggal Beli</label>
                            <input type="date" value={newAsset.purchase_date} onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Nilai Perolehan (Rp)</label>
                            <input type="number" value={newAsset.purchase_value} onChange={(e) => setNewAsset({ ...newAsset, purchase_value: parseFloat(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label>Umur Ekonomis (bulan)</label>
                            <input type="number" value={newAsset.useful_life_months} onChange={(e) => setNewAsset({ ...newAsset, useful_life_months: parseInt(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label>Nilai Residu (Rp)</label>
                            <input type="number" value={newAsset.salvage_value} onChange={(e) => setNewAsset({ ...newAsset, salvage_value: parseFloat(e.target.value) })} />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>Batal</Button>
                        <Button variant="primary" onClick={createAsset}>💾 Simpan</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
