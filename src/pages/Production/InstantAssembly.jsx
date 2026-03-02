
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import './InstantAssembly.css';

const API_URL = import.meta.env.VITE_AI_API_URL || "";

export default function InstantAssembly() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);

    // Form State
    const [resultProductId, setResultProductId] = useState('');
    const [qtyResult, setQtyResult] = useState(1);
    const [notes, setNotes] = useState('');
    const [materials, setMaterials] = useState([
        { product_id: '', qty: 1, batch_id: '' }
    ]);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await fetch(`${API_URL}/api/v1/products`);
            const data = await response.json();
            if (data.status === 'success') {
                setProducts(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
        }
    };

    const handleAddMaterial = () => {
        setMaterials([...materials, { product_id: '', qty: 1, batch_id: '' }]);
    };

    const handleRemoveMaterial = (index) => {
        const newMaterials = [...materials];
        newMaterials.splice(index, 1);
        setMaterials(newMaterials);
    };

    const handleMaterialChange = (index, field, value) => {
        const newMaterials = [...materials];
        newMaterials[index][field] = value;
        setMaterials(newMaterials);
    };

    const handleSubmit = async () => {
        if (!resultProductId) {
            alert("Pilih Produk Hasil!");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                result_product_id: parseInt(resultProductId),
                qty_result: parseFloat(qtyResult),
                notes: notes,
                materials: materials.map(m => ({
                    product_id: parseInt(m.product_id),
                    qty: parseFloat(m.qty),
                    batch_id: m.batch_id ? parseInt(m.batch_id) : null
                }))
            };

            const response = await fetch(`${API_URL}/api/v1/assembly/instant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                alert("✅ Modif Berhasil! Stok Barang Jadi bertambah, Bahan Baku berkurang.");
                // Reset form
                setResultProductId('');
                setQtyResult(1);
                setMaterials([{ product_id: '', qty: 1, batch_id: '' }]);
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
        <div className="instant-assembly-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">⚡ Modif (Rakitan Dadakan)</h1>
                    <p className="text-muted">Potong stok bahan baku & tambah stok barang jadi secara instan.</p>
                </div>
            </div>

            <div className="assembly-container">
                {/* Result Product Section */}
                <Card className="result-card">
                    <h2 className="section-title">📦 Barang Jadi (Hasil)</h2>
                    <div className="form-group">
                        <label>Pilih Produk Jadi</label>
                        <select
                            className="form-select"
                            value={resultProductId}
                            onChange={(e) => setResultProductId(e.target.value)}
                        >
                            <option value="">-- Pilih Produk --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <Input
                            label="Jumlah (Qty)"
                            type="number"
                            value={qtyResult}
                            onChange={(e) => setQtyResult(e.target.value)}
                        />
                        <Input
                            label="Catatan"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Contoh: Modif R2 Panjang 1.5M untuk Customer A"
                        />
                    </div>
                </Card>

                {/* Materials Section */}
                <Card className="materials-card">
                    <h2 className="section-title">🔧 Bahan Baku (Komponen)</h2>
                    <p className="text-muted mb-4">Stok komponen ini akan dipotong otomatis.</p>

                    {materials.map((mat, index) => (
                        <div key={index} className="material-row">
                            <div className="material-select">
                                <label>Material #{index + 1}</label>
                                <select
                                    className="form-select"
                                    value={mat.product_id}
                                    onChange={(e) => handleMaterialChange(index, 'product_id', e.target.value)}
                                >
                                    <option value="">-- Pilih Material --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="material-qty">
                                <Input
                                    label="Qty Pakai"
                                    type="number"
                                    value={mat.qty}
                                    onChange={(e) => handleMaterialChange(index, 'qty', e.target.value)}
                                />
                            </div>

                            <button
                                className="btn-remove"
                                onClick={() => handleRemoveMaterial(index)}
                                title="Hapus Baris"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}

                    <Button
                        variant="secondary"
                        onClick={handleAddMaterial}
                        className="btn-add-row"
                    >
                        + Tambah Material Lain
                    </Button>
                </Card>
            </div>

            <div className="action-footer">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? 'Memproses...' : '🚀 PROSES MODIF SEKARANG'}
                </Button>
            </div>
        </div>
    );
}
