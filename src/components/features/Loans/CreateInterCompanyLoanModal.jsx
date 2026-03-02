import { useState, useEffect } from 'react';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import { getProducts } from '../../../services/productApi';
import { getAvailableBatches } from '../../../services/wmsApi';
import { useNotification } from '../../../contexts/NotificationContext';
// Assuming we have a company API, or we can fetch companies. For now, simulating if api doesn't exist yet, but let's assume there's an endpoint or we fetch from users.
// We need a way to get companies. Let's create a quick fetch to `/api/v1/settings/companies` if it exists.
const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function CreateInterCompanyLoanModal({ isOpen, onClose, onSubmit, currentCompanyId }) {
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState([]);

    // Form Data
    const [formData, setFormData] = useState({
        to_company_id: '',
        from_company_id: currentCompanyId || 1, // Defaulting to 1 if not provided
        due_date: '',
        notes: '',
        items: []
    });

    // Item Addition State
    const [products, setProducts] = useState([]);
    const [batches, setBatches] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        product_id: '',
        product_name: '',
        source_batch_id: '',
        batch_label: '', // For display
        qty: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadCompanies();
            loadProducts();
            // Reset form
            setFormData({
                to_company_id: '',
                from_company_id: currentCompanyId || 1,
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default +30 days
                notes: '',
                items: []
            });
            setCurrentItem({ product_id: '', product_name: '', source_batch_id: '', batch_label: '', qty: '' });
            setBatches([]);
        }
    }, [isOpen, currentCompanyId]);

    const loadCompanies = async () => {
        try {
            // Kita belum memastikan ada endpoint get all companies, tapi anggap ada `/api/v1/settings/companies` atau kita hardcode sementara
            const res = await fetch(`${API_BASE_URL}/api/v1/search?q=&type=company`); // Or something similar
            if (res.ok) {
                const data = await res.json();
                // if search returns companies
                if (data.data && data.data.companies) setCompanies(data.data.companies);
            }
            // Dummy fallback if API doesn't exist yet, we only need ID 1 and 2 for testing
            if (companies.length === 0) {
                setCompanies([
                    { id: 1, name: "HOSE Pusat (HQ)" },
                    { id: 2, name: "HOSE Cabang Surabaya" },
                    { id: 3, name: "PT. Rekanan Abadi" }
                ]);
            }
        } catch (err) {
            console.error("Failed to load companies", err);
            setCompanies([
                { id: 1, name: "HOSE Pusat (HQ)" },
                { id: 2, name: "HOSE Cabang Surabaya" }
            ]);
        }
    };

    const loadProducts = async () => {
        try {
            const res = await getProducts({ limit: 100, active_only: true });
            if (res.data) setProducts(res.data);
        } catch (err) {
            console.error("Failed to load products", err);
        }
    };

    const handleProductChange = async (productId) => {
        const prod = products.find(p => p.id === parseInt(productId));
        setCurrentItem({ ...currentItem, product_id: productId, product_name: prod?.name || '', source_batch_id: '', qty: '' });

        // Load Batches
        if (productId) {
            try {
                const res = await getAvailableBatches({ product_id: productId });
                setBatches(res.data || []);
            } catch (err) {
                console.error("Failed to load batches", err);
                setBatches([]);
            }
        } else {
            setBatches([]);
        }
    };

    const handleAddItem = () => {
        if (!currentItem.product_id || !currentItem.source_batch_id || !currentItem.qty) {
            addNotification("Perhatian", "Lengkapi data barang (Product, Batch, Qty)", "warning");
            return;
        }

        const batch = batches.find(b => b.id === parseInt(currentItem.source_batch_id));
        if (parseFloat(currentItem.qty) > batch.current_qty) {
            addNotification("Stok Kurang", `Qty melebihi stok batch (Max: ${batch.current_qty})`, "warning");
            return;
        }

        const newItem = {
            ...currentItem,
            product_id: parseInt(currentItem.product_id),
            source_batch_id: parseInt(currentItem.source_batch_id),
            batch_label: batch.barcode || `Batch #${batch.id}`,
            qty: parseFloat(currentItem.qty)
        };

        setFormData({ ...formData, items: [...formData.items, newItem] });
        setCurrentItem({ ...currentItem, source_batch_id: '', batch_label: '', qty: '' });
    };

    const handleRemoveItem = (index) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async () => {
        if (!formData.to_company_id) {
            addNotification("Validasi", "Pilih Perusahaan Tujuan!", "warning");
            return;
        }
        if (formData.from_company_id === parseInt(formData.to_company_id)) {
            addNotification("Validasi", "Perusahaan pengirim dan tujuan tidak boleh sama.", "error");
            return;
        }
        if (formData.items.length === 0) {
            addNotification("Validasi", "Masukkan minimal 1 barang konsinyasi/titipan.", "warning");
            return;
        }

        setLoading(true);
        const finalData = {
            ...formData,
            to_company_id: parseInt(formData.to_company_id)
        };

        try {
            await onSubmit(finalData);
            onClose();
        } catch (err) {
            console.error(err);
            addNotification("Error", "Gagal memproses pinjaman: " + (err.message || "Unknown error"), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buat Pinjaman / Konsinyasi B2B" size="large">
            <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', color: '#1e40af', fontSize: '13px', display: 'flex', gap: '8px' }}>
                        <span>ℹ️</span>
                        <span>Mode *B2B Konsinyasi* akan membuat barang tetap menjadi hak milik Perusahaan Anda, namun fisiknya akan dikirim ke Perusahaan rekanan. Saat barang laku di sana, Anda akan menerima laporan *Sales Sync*.</span>
                    </div>
                </div>

                <div className="form-group">
                    <label>Perusahaan Pengirim (Lender)</label>
                    <input type="text" className="form-input" disabled value={companies.find(c => c.id === formData.from_company_id)?.name || `My Company (ID: ${formData.from_company_id})`} />
                </div>

                <div className="form-group">
                    <label>Perusahaan Penerima (Borrower)</label>
                    <select
                        className="form-input"
                        value={formData.to_company_id}
                        onChange={(e) => setFormData({ ...formData, to_company_id: e.target.value })}
                    >
                        <option value="">-- Pilih Perusahaan --</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id} disabled={c.id === formData.from_company_id}>
                                {c.name} {c.id === formData.from_company_id ? "(Ini Anda)" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Tanggal Jatuh Tempo (Due Date)</label>
                    <input
                        type="date"
                        className="form-input"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>Catatan Misi (Optional)</label>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Cth: Titipan display pameran 2 minggu"
                    />
                </div>

                {/* Item Addition Section */}
                <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1', marginTop: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569' }}>📦 Tambah Titipan Asset</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '12px' }}>Produk</label>
                            <select
                                className="form-input"
                                value={currentItem.product_id}
                                onChange={(e) => handleProductChange(e.target.value)}
                            >
                                <option value="">-- Pilih Produk --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '12px' }}>Batch (Stock)</label>
                            <select
                                className="form-input"
                                value={currentItem.source_batch_id}
                                onChange={(e) => setCurrentItem({ ...currentItem, source_batch_id: e.target.value })}
                                disabled={!currentItem.product_id}
                            >
                                <option value="">-- Pilih Batch --</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.barcode || `Batch ${b.id}`} | Qty: {b.current_qty} | {b.location_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '12px' }}>Qty (Kirim)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={currentItem.qty}
                                onChange={(e) => setCurrentItem({ ...currentItem, qty: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <Button variant="secondary" onClick={handleAddItem}>+ Add</Button>
                    </div>
                </div>

                {/* Items List */}
                <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
                    <table className="data-table" style={{ width: '100%', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ padding: '8px' }}>Product</th>
                                <th style={{ padding: '8px' }}>Batch Info</th>
                                <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                                <th style={{ padding: '8px', width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.items.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                                        Belum ada barang dipilih
                                    </td>
                                </tr>
                            ) : (
                                formData.items.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px' }}>{item.product_name}</td>
                                        <td style={{ padding: '8px', color: '#64748b' }}>{item.batch_label}</td>
                                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{item.qty}</td>
                                        <td style={{ padding: '8px' }}>
                                            <button
                                                onClick={() => handleRemoveItem(idx)}
                                                style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '24px' }}>
                <Button variant="secondary" onClick={onClose} disabled={loading}>Batal</Button>
                <Button variant="primary" onClick={handleSubmit} loading={loading}>🚀 Eksekusi Pengiriman</Button>
            </div>
        </Modal>
    );
}
