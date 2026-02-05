import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import { getReadyToShip, createDeliveryOrder } from '../../services/outboundApi';
import './Outbound.css';

export default function CreateDelivery() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const soIdFilter = searchParams.get('so_id');

    const [readyItems, setReadyItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedItems, setSelectedItems] = useState([]); // Array of items
    const [form, setForm] = useState({
        driverName: '',
        licensePlate: '',
        notes: ''
    });

    useEffect(() => {
        loadReadyItems();
    }, [soIdFilter]);

    const loadReadyItems = async () => {
        setLoading(true);
        // Pass so_id if available to filter from DB
        const result = await getReadyToShip(soIdFilter);
        if (result.status === 'success') {
            const items = result.data || [];
            setReadyItems(items);

            // If filtered by SO, auto-select all items by default for convenience
            if (soIdFilter && items.length > 0) {
                setSelectedItems(items);
            }
        }
        setLoading(false);
    };

    const handleToggleItem = (item) => {
        // We'll track selection by item object or unique ID combination
        // Assuming item has a unique `id` or `so_line_id`
        // Let's rely on index if generic, but ideally unique ID.
        // Looking at backend usually readyItems are grouped by SO Line?
        // Let's assume item has `so_line_id` or `id`.

        const isSelected = selectedItems.find(i => i.so_line_id === item.so_line_id);

        if (isSelected) {
            setSelectedItems(selectedItems.filter(i => i.so_line_id !== item.so_line_id));
        } else {
            setSelectedItems([...selectedItems, item]);
        }
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) return alert("Pilih minimal satu barang untuk dikirim");
        if (!form.driverName || !form.licensePlate) return alert("Isi nama driver dan plat nomor");

        if (!confirm(`Buat Surat Jalan untuk ${selectedItems.length} item?`)) return;

        setSubmitting(true);

        // Prepare payload per backend expectation
        // Backend usually expects list of lines or so_ids?
        // Let's construct a payload that matches common patterns or what backend typically needs.
        // Based on `createDeliveryOrder` usage pattern (we don't see backend code for it yet but can infer).
        // Usually: { driver_name, license_plate, notes, items: [...] }

        // Backend Expects:
        // class DOCreate(BaseModel):
        //     so_id: int
        //     lines: List[DOLineCreate]
        //     driver_name: Optional[str]
        //     vehicle_no: Optional[str]
        //     notes: Optional[str]

        // Get so_id from the first selected item
        const firstItem = selectedItems[0];
        if (!firstItem) return; // Should be handled by length check above

        const payload = {
            so_id: firstItem.so_id,
            driver_name: form.driverName,
            vehicle_no: form.licensePlate, // Map licensePlate -> vehicle_no
            notes: form.notes,
            lines: selectedItems.map(item => ({ // Map items -> lines
                so_line_id: item.so_line_id,
                qty: item.qty_ready,
                notes: ''
            }))
        };

        const result = await createDeliveryOrder(payload);

        if (result.status === 'success') {
            alert("✅ Surat Jalan Berhasil Dibuat!");
            navigate('/outbound');
        } else {
            alert("Gagal: " + result.message);
        }
        setSubmitting(false);
    };

    return (
        <div className="outbound-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📝 Buat Surat Jalan</h1>
                    <p className="page-subtitle">Pilih barang siap kirim & assign driver</p>
                </div>
                <div className="header-actions">
                    <Button variant="ghost" onClick={() => navigate('/outbound')}>
                        Batal
                    </Button>
                </div>
            </div>

            <div className="create-delivery-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

                {/* Left: Items Selection */}
                <Card title="📦 Pilih Barang Siap Kirim">
                    {loading ? (
                        <p>Memuat data...</p>
                    ) : readyItems.length === 0 ? (
                        <div className="empty-state">
                            <p>Tidak ada barang yang siap dikirim (QC Passed)</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th width="40px"><input type="checkbox" disabled /></th>
                                    <th>SO / Customer</th>
                                    <th>Barang</th>
                                    <th>Qty Siap</th>
                                </tr>
                            </thead>
                            <tbody>
                                {readyItems.map((item, idx) => {
                                    const isSelected = selectedItems.some(i => i.so_line_id === item.so_line_id);
                                    return (
                                        <tr key={idx} onClick={() => handleToggleItem(item)} style={{ cursor: 'pointer', background: isSelected ? '#e3f2fd' : 'inherit' }}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => { }} // handled by row click
                                                />
                                            </td>
                                            <td>
                                                <strong>{item.so_number}</strong>
                                                <div style={{ fontSize: '0.85em', color: '#666' }}>{item.customer_name}</div>
                                            </td>
                                            <td>{item.description}</td>
                                            <td>
                                                <span className="badge badge-success">{item.qty_ready} pcs</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    <p className="text-muted" style={{ marginTop: '10px' }}>
                        {selectedItems.length} item dipilih
                    </p>
                </Card>

                {/* Right: Driver Info */}
                <div className="delivery-form-sidebar">
                    <Card title="🚚 Informasi Pengiriman">
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label>Nama Driver / Ekspedisi</label>
                            <input
                                type="text"
                                className="form-input"
                                style={{ width: '100%', padding: '8px' }}
                                value={form.driverName}
                                onChange={e => setForm({ ...form, driverName: e.target.value })}
                                placeholder="Contoh: Budi (JNE)"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label>Plat Nomor / No Resi</label>
                            <input
                                type="text"
                                className="form-input"
                                style={{ width: '100%', padding: '8px' }}
                                value={form.licensePlate}
                                onChange={e => setForm({ ...form, licensePlate: e.target.value })}
                                placeholder="Contoh: B 1234 XYZ"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Catatan</label>
                            <textarea
                                className="form-input"
                                style={{ width: '100%', padding: '8px' }}
                                rows={3}
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                            ></textarea>
                        </div>

                        <Button
                            variant="primary"
                            style={{ width: '100%' }}
                            onClick={handleSubmit}
                            loading={submitting}
                            disabled={selectedItems.length === 0}
                        >
                            🚀 Buat Surat Jalan
                        </Button>
                    </Card>
                </div>

            </div>
        </div>
    );
}
