import { useState, useEffect } from 'react';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import { getUsers } from '../../../services/userApi';
import { getProducts } from '../../../services/productApi';
import { getAvailableBatches } from '../../../services/wmsApi';
import { useNotification } from '../../../contexts/NotificationContext';

export default function CreateLoanModal({ isOpen, onClose, onSubmit }) {
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);

    // Form Data
    const [formData, setFormData] = useState({
        customer_id: '',
        customer_name: '',
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
        batch_id: '',
        batch_label: '', // For display
        qty: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadCustomers();
            loadProducts();
            // Reset form
            setFormData({
                customer_id: '',
                customer_name: '',
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default +7 days
                notes: '',
                items: []
            });
            setCurrentItem({ product_id: '', product_name: '', batch_id: '', batch_label: '', qty: '' });
            setBatches([]);
        }
    }, [isOpen]);

    const loadCustomers = async () => {
        try {
            const res = await getUsers({ role: 'CUSTOMER' });
            if (res.data) setCustomers(res.data);
            else setCustomers([]); // Fallback to empty
        } catch (err) {
            console.error("Failed to load customers", err);
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
        setCurrentItem({ ...currentItem, product_id: productId, product_name: prod?.name || '', batch_id: '', qty: '' });

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
        if (!currentItem.product_id || !currentItem.batch_id || !currentItem.qty) {
            addNotification("Perhatian", "Lengkapi data barang (Product, Batch, Qty)", "warning");
            return;
        }

        const batch = batches.find(b => b.id === parseInt(currentItem.batch_id));
        if (parseFloat(currentItem.qty) > batch.current_qty) {
            addNotification("Stok Kurang", `Qty melebihi stok batch (Max: ${batch.current_qty})`, "warning");
            return;
        }

        const newItem = {
            ...currentItem,
            product_id: parseInt(currentItem.product_id),
            batch_id: parseInt(currentItem.batch_id),
            batch_label: batch.barcode || `Batch #${batch.id}`,
            qty: parseFloat(currentItem.qty)
        };

        setFormData({ ...formData, items: [...formData.items, newItem] });
        // Reset Item Form
        setCurrentItem({ ...currentItem, batch_id: '', batch_label: '', qty: '' });
    };

    const handleRemoveItem = (index) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async () => {
        if (!formData.customer_id) {
            addNotification("Validasi", "Pilih Customer!", "warning");
            return;
        }
        if (formData.items.length === 0) {
            addNotification("Validasi", "Masukkan minimal 1 barang pinjaman.", "warning");
            return;
        }

        setLoading(true);
        // Find customer name if not set manually (though select sets ID, we need Name for backend? Backend takes ID, but debug script sent Name too. Let's send Name from selected object)
        const customer = customers.find(c => c.id === parseInt(formData.customer_id));
        const finalData = {
            ...formData,
            customer_id: parseInt(formData.customer_id),
            customer_name: customer ? customer.name : formData.customer_name // Fallback or strict
        };

        try {
            await onSubmit(finalData);
            onClose();
        } catch (err) {
            console.error(err);
            addNotification("Error", "Gagal membuat pinjaman: " + (err.message || "Unknown error"), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buat Pinjaman Baru" size="large">
            <div className="form-grid">
                {/* Header Section */}
                <div className="form-group">
                    <label>Customer</label>
                    <select
                        className="form-input"
                        value={formData.customer_id}
                        onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    >
                        <option value="">-- Pilih Customer --</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
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

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Catatan (Optional)</label>
                    <textarea
                        className="form-input"
                        rows="2"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Contoh: Peminjaman untuk testing site A"
                    />
                </div>

                {/* Item Addition Section */}
                <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1', marginTop: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569' }}>📦 Tambah Barang</h4>
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
                                value={currentItem.batch_id}
                                onChange={(e) => setCurrentItem({ ...currentItem, batch_id: e.target.value })}
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
                            <label style={{ fontSize: '12px' }}>Qty Pinjam</label>
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
                                <th style={{ padding: '8px' }}>Qty</th>
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
                                        <td style={{ padding: '8px' }}>{item.batch_label}</td>
                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.qty}</td>
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
                <Button variant="primary" onClick={handleSubmit} loading={loading}>🚀 Buat Pinjaman</Button>
            </div>
        </Modal>
    );
}
