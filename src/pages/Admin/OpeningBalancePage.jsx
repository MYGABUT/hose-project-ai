import { useState, useEffect } from 'react';
import Button from '../../components/common/Button/Button';
import './OpeningBalancePage.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function OpeningBalancePage() {
    const [activeTab, setActiveTab] = useState('inventory'); // inventory | supplier
    const [loading, setLoading] = useState(false);

    // Inventory State
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [invItems, setInvItems] = useState([
        { product_id: '', qty: 1, cost_price: 0, location_code: 'A-01' }
    ]);

    // Supplier State
    const [suppliers, setSuppliers] = useState([]);
    const [supItems, setSupItems] = useState([
        { supplier_id: '', amount: 0, due_date: '' }
    ]);

    useEffect(() => {
        loadMasterData();
    }, []);

    const loadMasterData = async () => {
        try {
            // Load Products
            const prodRes = await fetch(`${API_BASE_URL}/api/v1/products?limit=1000`);
            const prodData = await prodRes.json();
            if (prodData.status === 'success') setProducts(prodData.data);

            // Load Locations
            const locRes = await fetch(`${API_BASE_URL}/api/v1/storage-locations`);
            const locData = await locRes.json();
            if (locData.status === 'success') setLocations(locData.data);

            // Load Suppliers
            const supRes = await fetch(`${API_BASE_URL}/api/v1/suppliers`);
            const supData = await supRes.json();
            if (supData.status === 'success') setSuppliers(supData.data);

        } catch (error) {
            console.error("Failed to load master data", error);
        }
    };

    // Inventory Handlers
    const addInvRow = () => {
        setInvItems([...invItems, { product_id: '', qty: 1, cost_price: 0, location_code: 'A-01' }]);
    };

    const removeInvRow = (idx) => {
        setInvItems(invItems.filter((_, i) => i !== idx));
    };

    const updateInvRow = (idx, field, value) => {
        const newItems = [...invItems];
        newItems[idx][field] = value;
        setInvItems(newItems);
    };

    const submitInventory = async () => {
        if (!window.confirm(`Yakin ingin submit ${invItems.length} item sebagai Saldo Awal?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/inventory/opening-balance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invItems)
            });
            const data = await res.json();
            if (data.status === 'success') {
                alert('✅ Saldo Awal Stok Berhasil Diimport!');
                setInvItems([{ product_id: '', qty: 1, cost_price: 0, location_code: 'A-01' }]);
            } else {
                alert('Gagal: ' + data.detail);
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
        setLoading(false);
    };

    // Supplier Handlers
    const addSupRow = () => {
        setSupItems([...supItems, { supplier_id: '', amount: 0, due_date: '' }]);
    };

    const removeSupRow = (idx) => {
        setSupItems(supItems.filter((_, i) => i !== idx));
    };

    const updateSupRow = (idx, field, value) => {
        const newItems = [...supItems];
        newItems[idx][field] = value;
        setSupItems(newItems);
    };

    const submitSupplier = async () => {
        if (!window.confirm(`Yakin ingin submit Saldo Hutang?`)) return;

        setLoading(true);
        try {
            // Loop because API is single item per call (simplified)
            let success = 0;
            for (const item of supItems) {
                if (!item.supplier_id || !item.amount) continue;

                await fetch(`${API_BASE_URL}/api/v1/suppliers/opening-balance?supplier_id=${item.supplier_id}&amount=${item.amount}&due_date=${item.due_date}`, {
                    method: 'POST'
                });
                success++;
            }
            alert(`✅ ${success} Saldo Hutang Berhasil Diimport!`);
            setSupItems([{ supplier_id: '', amount: 0, due_date: '' }]);

        } catch (e) {
            alert('Error: ' + e.message);
        }
        setLoading(false);
    };

    return (
        <div className="opening-balance-page">
            <div className="setup-card">
                <div className="setup-header">
                    <h1 className="setup-title">🚀 Go-Live Setup: Saldo Awal (Opening Balance)</h1>
                    <p className="setup-subtitle">
                        Inject data awal untuk inventory dan keuangan sebelum memulai transaksi harian.
                    </p>
                </div>

                <div className="tabs">
                    <button
                        className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inventory')}
                    >
                        📦 Saldo Stok (Inventory)
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'supplier' ? 'active' : ''}`}
                        onClick={() => setActiveTab('supplier')}
                    >
                        💰 Saldo Hutang (AP)
                    </button>
                </div>

                {activeTab === 'inventory' ? (
                    <div className="form-section">
                        {invItems.map((item, idx) => (
                            <div key={idx} className="input-row">
                                <select
                                    value={item.product_id}
                                    onChange={(e) => updateInvRow(idx, 'product_id', parseInt(e.target.value))}
                                >
                                    <option value="">-- Pilih Produk --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Qty"
                                    value={item.qty}
                                    onChange={(e) => updateInvRow(idx, 'qty', parseFloat(e.target.value))}
                                />
                                <input
                                    type="number"
                                    placeholder="Harga Modal"
                                    value={item.cost_price}
                                    onChange={(e) => updateInvRow(idx, 'cost_price', parseFloat(e.target.value))}
                                />
                                <select
                                    value={item.location_code}
                                    onChange={(e) => updateInvRow(idx, 'location_code', e.target.value)}
                                >
                                    {locations.map(l => (
                                        <option key={l.id} value={l.code}>{l.code}</option>
                                    ))}
                                </select>
                                <button className="remove-btn" onClick={() => removeInvRow(idx)}>✕</button>
                            </div>
                        ))}
                        <button className="add-row-btn" onClick={addInvRow}>+ Tambah Baris Item</button>

                        <div className="submit-section">
                            <Button variant="primary" onClick={submitInventory} loading={loading}>
                                📥 Submit Saldo Awal Stok
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="form-section">
                        {supItems.map((item, idx) => (
                            <div key={idx} className="input-row" style={{ gridTemplateColumns: "2fr 1fr 1fr auto" }}>
                                <select
                                    value={item.supplier_id}
                                    onChange={(e) => updateSupRow(idx, 'supplier_id', parseInt(e.target.value))}
                                >
                                    <option value="">-- Pilih Supplier --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Jumlah Hutang (Rp)"
                                    value={item.amount}
                                    onChange={(e) => updateSupRow(idx, 'amount', parseFloat(e.target.value))}
                                />
                                <input
                                    type="date"
                                    placeholder="Jatuh Tempo"
                                    value={item.due_date}
                                    onChange={(e) => updateSupRow(idx, 'due_date', e.target.value)}
                                />
                                <button className="remove-btn" onClick={() => removeSupRow(idx)}>✕</button>
                            </div>
                        ))}
                        <button className="add-row-btn" onClick={addSupRow}>+ Tambah Baris Hutang</button>

                        <div className="submit-section">
                            <Button variant="primary" onClick={submitSupplier} loading={loading}>
                                📥 Submit Saldo Hutang
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
