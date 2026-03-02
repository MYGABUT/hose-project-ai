import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import { supplierApi } from '../../services/supplierApi';
import { useNotification } from '../../contexts/NotificationContext';

export default function Suppliers() {
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        supplier_type: 'REGULAR',
        payment_term: 30,
        credit_limit: 0
    });

    useEffect(() => {
        loadSuppliers();
    }, [search]);

    const loadSuppliers = async () => {
        setLoading(true);
        try {
            const res = await supplierApi.getAll({ search });
            if (res.status === 'success') {
                setSuppliers(res.data || []);
            }
        } catch (err) {
            console.error(err);
            addNotification('Error', 'Gagal memuat data supplier', 'error');
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!formData.name) {
            addNotification('Error', 'Nama Supplier wajib diisi', 'warning');
            return;
        }

        try {
            if (isEditing) {
                await supplierApi.update(formData.id, formData);
                addNotification('Sukses', 'Supplier berhasil diupdate', 'success');
            } else {
                await supplierApi.create(formData);
                addNotification('Sukses', 'Supplier berhasil dibuat', 'success');
            }
            setShowModal(false);
            loadSuppliers();
        } catch (err) {
            console.error(err);
            addNotification('Gagal', err.message, 'error');
        }
    };

    const handleEdit = (supplier) => {
        setFormData(supplier);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleCreate = () => {
        setFormData({
            code: '',
            name: '',
            contact_person: '',
            phone: '',
            email: '',
            address: '',
            supplier_type: 'REGULAR',
            payment_term: 30,
            credit_limit: 0
        });
        setIsEditing(false);
        setShowModal(true);
    };

    return (
        <div className="suppliers-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📁 Manajemen Supplier</h1>
                    <p className="page-subtitle">Daftar pemasok dan vendor</p>
                </div>
                <div className="header-actions">
                    <Button variant="primary" onClick={handleCreate}>+ Tambah Supplier</Button>
                </div>
            </div>

            <Card className="datatable-card">
                <div className="table-filter" style={{ marginBottom: '1rem', display: 'flex', gap: '8px' }}>
                    <Input
                        placeholder="Cari Supplier..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    />
                    <Button variant="secondary" onClick={loadSuppliers}>🔍 Cari</Button>
                </div>

                <div className="table-responsive">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold uppercase">
                            <tr>
                                <th className="px-4 py-3">Kode</th>
                                <th className="px-4 py-3">Nama Supplier</th>
                                <th className="px-4 py-3">Kontak</th>
                                <th className="px-4 py-3">Tipe</th>
                                <th className="px-4 py-3 text-right">Hutang (AP)</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-4">Memuat data...</td></tr>
                            ) : suppliers.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-4">Tidak ada data ditemukan.</td></tr>
                            ) : (
                                suppliers.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{s.code}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{s.name}</div>
                                            <div className="text-xs text-gray-500">{s.address?.substring(0, 30)}...</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>{s.contact_person}</div>
                                            <div className="text-xs text-gray-500">{s.phone}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                                ${s.supplier_type === 'REGULAR' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                {s.supplier_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-red-600">
                                            Rp {(parseFloat(s.total_outstanding) || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button size="xs" variant="ghost" onClick={() => handleEdit(s)}>✏️ Edit</Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={isEditing ? "Edit Supplier" : "Tambah Supplier Baru"}
                size="md"
            >
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Nama Supplier *"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        containerStyle={{ gridColumn: 'span 2' }}
                    />
                    <Input
                        label="Kode (Opsional)"
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        placeholder="Auto-generate"
                    />
                    <div className="form-group">
                        <label className="text-sm font-medium mb-1 block">Tipe Supplier</label>
                        <select
                            className="w-full border rounded p-2 text-sm"
                            value={formData.supplier_type}
                            onChange={e => setFormData({ ...formData, supplier_type: e.target.value })}
                        >
                            <option value="REGULAR">Regular</option>
                            <option value="ONE_TIME">One Time</option>
                            <option value="IMPORT">Import</option>
                        </select>
                    </div>

                    <Input
                        label="Kontak Person"
                        value={formData.contact_person}
                        onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                    <Input
                        label="No. Telepon"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />

                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                    <div className="form-group">
                        <label className="text-sm font-medium mb-1 block">Termin Pembayaran (Hari)</label>
                        <input
                            type="number"
                            className="w-full border rounded p-2 text-sm"
                            value={formData.payment_term}
                            onChange={e => setFormData({ ...formData, payment_term: parseInt(e.target.value) })}
                        />
                    </div>

                    <Input
                        label="Alamat Lengkap"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        containerStyle={{ gridColumn: 'span 2' }}
                        type="textarea"
                    />

                    <div className="col-span-2 pt-2 border-t mt-2">
                        <h4 className="text-sm font-bold text-gray-500 mb-2">Informasi Bank</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Nama Bank"
                                value={formData.bank_name}
                                onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                            />
                            <Input
                                label="No. Rekening"
                                value={formData.bank_account}
                                onChange={e => setFormData({ ...formData, bank_account: e.target.value })}
                            />
                            <Input
                                label="Atas Nama"
                                value={formData.bank_holder}
                                onChange={e => setFormData({ ...formData, bank_holder: e.target.value })}
                                containerStyle={{ gridColumn: 'span 2' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-actions mt-6 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
                    <Button variant="primary" onClick={handleSubmit}>
                        {isEditing ? 'Simpan Perubahan' : 'Buat Supplier'}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
