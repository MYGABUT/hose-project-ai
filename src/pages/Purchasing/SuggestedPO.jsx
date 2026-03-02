import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import './Purchasing.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function SuggestedPO() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [filterBrand, setFilterBrand] = useState('ALL');
    const [params, setParams] = useState({ days_supply: 30, days_lookback: 30 });

    useEffect(() => {
        loadSuggestions();
    }, [params]);

    const loadSuggestions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/procurement/purchase-suggestion?days_supply=${params.days_supply}&days_lookback=${params.days_lookback}&min_velocity=0.01`);
            const data = await res.json();
            if (data.status === 'success') {
                setSuggestions(data.data || []);
                // By default select all
                setSelectedItems(new Set((data.data || []).map(item => item.product_id)));
            }
        } catch (err) {
            console.error('Error loading suggestions:', err);
        }
        setLoading(false);
    };

    const toggleSelection = (productId) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(productId)) newSelected.delete(productId);
        else newSelected.add(productId);
        setSelectedItems(newSelected);
    };

    const toggleAll = () => {
        if (selectedItems.size === filteredSuggestions.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredSuggestions.map(i => i.product_id)));
        }
    };

    const generatePR = async () => {
        if (selectedItems.size === 0) return alert('Pilih minimal 1 barang untuk dibuatkan PR');

        const selectedData = suggestions.filter(s => selectedItems.has(s.product_id));

        // Group by brand to create separate PRs if they belong to different suppliers
        const brandGroups = selectedData.reduce((acc, item) => {
            const brand = item.brand || 'UMUM';
            if (!acc[brand]) acc[brand] = [];
            acc[brand].push(item);
            return acc;
        }, {});

        try {
            setLoading(true);
            let successCount = 0;

            for (const [brand, items] of Object.entries(brandGroups)) {
                const prPayload = {
                    supplier_name: brand,
                    required_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // +7 days
                    priority: 'HIGH',
                    requested_by: 'Auto-Restock System',
                    notes: `Berdasarkan pergerakan data penjualan ${params.days_lookback} hari terakhir.`,
                    lines: items.map(item => ({
                        product_name: item.name,
                        qty_requested: item.order_qty,
                        unit: item.category?.includes('HOSE') ? 'METER' : 'PCS',
                        estimated_price: item.cost_price || 0
                    }))
                };

                const res = await fetch(`${API_BASE_URL}/api/v1/pr`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(prPayload)
                });
                const response = await res.json();
                if (response.status === 'success') successCount++;
            }

            alert(`Berhasil men-generate ${successCount} Purchase Request draft!`);
            navigate('/purchasing/requests');
        } catch (err) {
            console.error('Error auto-generating PRs:', err);
            alert('Terjadi kesalahan saat membuat PR otomatis');
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const brands = ['ALL', ...new Set(suggestions.map(s => s.brand).filter(Boolean))];
    const filteredSuggestions = filterBrand === 'ALL'
        ? suggestions
        : suggestions.filter(s => s.brand === filterBrand);

    return (
        <div className="purchasing-page">
            <div className="page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 className="page-title">🤖 Smart Auto-Restock</h1>
                        <StatusBadge status="warning">Beta (Mini MRP)</StatusBadge>
                    </div>
                    <p className="page-subtitle">Sistem merekomendasikan pembelian berdasarkan analisis pergerakan stok harian</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadSuggestions}>🔄 Kalkulasi Ulang</Button>
                    <Button
                        variant="primary"
                        onClick={generatePR}
                        disabled={selectedItems.size === 0 || loading}
                    >
                        ⚡ Buat PR ({selectedItems.size} Item)
                    </Button>
                </div>
            </div>

            <Card className="filter-bar mb-4">
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="filter-item">
                        <label>Filter Brand:</label>
                        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div className="filter-item">
                        <label>Target Stok (Hari):</label>
                        <input
                            type="number"
                            value={params.days_supply}
                            onChange={e => setParams({ ...params, days_supply: parseInt(e.target.value) || 30 })}
                            style={{ width: '80px' }}
                        />
                    </div>
                    <div className="filter-item">
                        <label>Analisis Mundur (Hari):</label>
                        <input
                            type="number"
                            value={params.days_lookback}
                            onChange={e => setParams({ ...params, days_lookback: parseInt(e.target.value) || 30 })}
                            style={{ width: '80px' }}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Menganalisis pergerakan inventori...</div>
                ) : filteredSuggestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">Aman! Tidak ada produk yang mendesak untuk dibeli saat ini.</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.size === filteredSuggestions.length && filteredSuggestions.length > 0}
                                            onChange={toggleAll}
                                        />
                                    </th>
                                    <th>KODE/SKU</th>
                                    <th>BRAND</th>
                                    <th>NAMA PRODUK</th>
                                    <th style={{ textAlign: 'right' }}>STOK TERSEDIA</th>
                                    <th style={{ textAlign: 'right' }}>VELOSITAS (HARI)</th>
                                    <th style={{ textAlign: 'right', background: '#eef2ff' }}>🛒 REKOMENDASI QTY</th>
                                    <th style={{ textAlign: 'right' }}>EST. BIAYA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuggestions.map(item => (
                                    <tr key={item.product_id} className={selectedItems.has(item.product_id) ? 'row-selected' : ''}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(item.product_id)}
                                                onChange={() => toggleSelection(item.product_id)}
                                            />
                                        </td>
                                        <td><strong>{item.sku}</strong></td>
                                        <td>{item.brand || 'N/A'}</td>
                                        <td>{item.name}</td>
                                        <td style={{ textAlign: 'right', color: item.current_stock <= 0 ? '#ef4444' : 'inherit' }}>
                                            {item.current_stock}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>{item.daily_velocity} / hari</td>
                                        <td style={{ textAlign: 'right', background: '#eef2ff', fontWeight: 'bold', color: '#4f46e5' }}>
                                            {item.order_qty}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {formatCurrency(item.estimated_cost)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total Estimasi (Berdasarkan Pilihan):</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                                        {formatCurrency(
                                            filteredSuggestions
                                                .filter(s => selectedItems.has(s.product_id))
                                                .reduce((sum, item) => sum + item.estimated_cost, 0)
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
