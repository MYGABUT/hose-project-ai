
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import './SwapTransaction.css';

const API_URL = import.meta.env.VITE_AI_API_URL || "";

export default function SwapTransaction() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);

    // Form State
    const [customerId, setCustomerId] = useState('');
    const [notes, setNotes] = useState('');

    // Return Item (IN)
    const [returnProductId, setReturnProductId] = useState('');
    const [returnQty, setReturnQty] = useState(1);
    const [returnReason, setReturnReason] = useState('Salah Beli');

    // New Item (OUT)
    const [outProductId, setOutProductId] = useState('');
    const [outQty, setOutQty] = useState(1);
    const [outBatchId, setOutBatchId] = useState('');

    // Financial Calc
    const [calcResult, setCalcResult] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [prodRes, custRes] = await Promise.all([
                fetch(`${API_URL}/api/v1/products`),
                fetch(`${API_URL}/api/v1/customers`)
            ]);

            const prodData = await prodRes.json();
            const custData = await custRes.json();

            if (prodData.status === 'success') setProducts(prodData.data);
            if (custData.data) setCustomers(custData.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        }
    };

    const getPrice = (prodId) => {
        if (!prodId) return 0;
        const p = products.find(x => x.id === parseInt(prodId));
        return params => p ? p.price : 0;
    };

    // Calculate Delta Visualization
    const prodIn = products.find(p => p.id === parseInt(returnProductId));
    const prodOut = products.find(p => p.id === parseInt(outProductId));

    const valIn = prodIn ? (prodIn.price * returnQty) : 0;
    const valOut = prodOut ? (prodOut.price * outQty) : 0;
    const delta = valOut - valIn;

    const handleSubmit = async () => {
        if (!customerId || !returnProductId || !outProductId) {
            alert("Harap lengkapi semua data!");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                customer_id: parseInt(customerId),
                return_product_id: parseInt(returnProductId),
                return_qty: parseFloat(returnQty),
                return_reason: returnReason,
                out_product_id: parseInt(outProductId),
                out_qty: parseFloat(outQty),
                out_batch_id: outBatchId ? parseInt(outBatchId) : null,
                notes: notes
            };

            const response = await fetch(`${API_URL}/api/v1/sales/swap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                setCalcResult(result);
                alert(`✅ Tukar Guling Berhasil!\n${result.message}`);
                // Simple Reset or Redirect? Stay to show invoice info?
                // Let's reset main fields
                setReturnProductId('');
                setOutProductId('');
            } else {
                alert(`❌ Gagal: ${result.detail || 'Terjadi kesalahan'}`);
            }
        } catch (error) {
            alert("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="swap-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🔄 Tukar Guling (Swap Asset)</h1>
                    <p className="text-muted">Retur barang salah beli & ambil barang baru dalam satu transaksi.</p>
                </div>
            </div>

            <div className="swap-container">
                {/* HEAD: Customer */}
                <Card className="customer-card">
                    <div className="form-group">
                        <label>Customer / Pelanggan</label>
                        <select
                            className="form-select big-select"
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                        >
                            <option value="">-- Pilih Customer --</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </Card>

                <div className="transaction-grid">
                    {/* LEFT: RETURN (IN) */}
                    <Card className="in-card">
                        <h2 className="section-title text-red">🔙 Barang Dikembalikan (IN)</h2>
                        <div className="form-group">
                            <label>Produk</label>
                            <select
                                className="form-select"
                                value={returnProductId}
                                onChange={(e) => setReturnProductId(e.target.value)}
                            >
                                <option value="">-- Pilih Barang Retur --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-row">
                            <Input
                                label="Qty"
                                type="number"
                                value={returnQty}
                                onChange={(e) => setReturnQty(e.target.value)}
                            />
                            <div className="price-display">
                                <label>Estimasi Nilai</label>
                                <div className="val">Rp {valIn.toLocaleString()}</div>
                            </div>
                        </div>
                        <Input
                            label="Alasan Retur"
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                        />
                    </Card>

                    {/* RIGHT: NEW (OUT) */}
                    <Card className="out-card">
                        <h2 className="section-title text-green">📦 Barang Baru (OUT)</h2>
                        <div className="form-group">
                            <label>Produk</label>
                            <select
                                className="form-select"
                                value={outProductId}
                                onChange={(e) => setOutProductId(e.target.value)}
                            >
                                <option value="">-- Pilih Barang Baru --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-row">
                            <Input
                                label="Qty"
                                type="number"
                                value={outQty}
                                onChange={(e) => setOutQty(e.target.value)}
                            />
                            <div className="price-display">
                                <label>Harga Baru</label>
                                <div className="val">Rp {valOut.toLocaleString()}</div>
                            </div>
                        </div>
                        <Input
                            label="Catatan / Batch Khusus"
                            placeholder="Optional Batch ID"
                            value={outBatchId}
                            onChange={(e) => setOutBatchId(e.target.value)}
                        />
                    </Card>
                </div>

                {/* SUMMARY */}
                <Card className="summary-card">
                    <div className="summary-row">
                        <span>Total Nilai Baru (Out):</span>
                        <span>Rp {valOut.toLocaleString()}</span>
                    </div>
                    <div className="summary-row text-red">
                        <span>(-) Nilai Retur (In):</span>
                        <span>Rp {valIn.toLocaleString()}</span>
                    </div>
                    <div className="summary-divider"></div>
                    <div className="summary-total">
                        <span>Selisih (Bayar/Kembali):</span>
                        <span className={delta >= 0 ? 'text-green' : 'text-red'}>
                            Rp {Math.abs(delta).toLocaleString()}
                            {delta > 0 ? ' (Tagih Customer)' : ' (Refund/Simpan)'}
                        </span>
                    </div>

                    <div className="action-row">
                        <Button
                            variant="primary"
                            size="lg"
                            className="btn-block"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Memproses...' : '💱 PROSES TUKAR BARANG'}
                        </Button>
                    </div>
                </Card>

                {calcResult && (
                    <Card className="result-card mt-4">
                        <h3>✅ Transaksi Selesai</h3>
                        <p>{calcResult.message}</p>
                        {calcResult.invoice && (
                            <div className="invoice-info">
                                📜 Invoice Terbit: <b>{calcResult.invoice.number}</b> senilai <b>Rp {calcResult.invoice.amount.toLocaleString()}</b>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
}
