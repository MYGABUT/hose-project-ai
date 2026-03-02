import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import Input from '../../components/common/Input/Input';
import { useNotification } from '../../contexts/NotificationContext';
import crmApi from '../../services/crmApi';

const COLUMNS = [
    { id: 'PROSPECT', title: 'Prospect', color: '#3b82f6' },
    { id: 'NEGOTIATION', title: 'Negotiation', color: '#f59e0b' },
    { id: 'WON', title: 'Won', color: '#10b981' },
    { id: 'LOST', title: 'Lost', color: '#ef4444' }
];

export default function CRMKanban() {
    const { addNotification } = useNotification();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    // Drag and Drop state
    const [draggedLead, setDraggedLead] = useState(null);

    // Modal state for Add/Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        company_name: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        estimated_value: 0,
        status: 'PROSPECT'
    });

    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        setLoading(true);
        try {
            const res = await crmApi.getLeads();
            setLeads(res.data || []);
        } catch (err) {
            addNotification('Error', 'Gagal mengambil data Lead', 'error');
            console.error(err);
        }
        setLoading(false);
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e, lead) => {
        setDraggedLead(lead);
        e.dataTransfer.effectAllowed = 'move';
        // Make the ghost image slightly transparent
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedLead(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, columnId) => {
        e.preventDefault();
        if (!draggedLead) return;
        if (draggedLead.status === columnId) return; // No change

        // Optimistic UI Update
        const updatedLeads = leads.map(lead =>
            lead.id === draggedLead.id ? { ...lead, status: columnId } : lead
        );
        setLeads(updatedLeads);

        try {
            await crmApi.updateLead(draggedLead.id, { status: columnId });
            addNotification('Sukses', `Lead dipindah ke ${COLUMNS.find(c => c.id === columnId)?.title}`, 'success');
        } catch (err) {
            addNotification('Gagal', 'Terjadi kesalahan saat memindah Lead', 'error');
            loadLeads(); // Revert
        }
    };

    // --- Form Handlers ---
    const handleOpenModal = (lead = null) => {
        if (lead) {
            setEditingLead(lead);
            setFormData({
                title: lead.title,
                company_name: lead.company_name,
                contact_person: lead.contact_person || '',
                contact_email: lead.contact_email || '',
                contact_phone: lead.contact_phone || '',
                estimated_value: lead.estimated_value || 0,
                status: lead.status
            });
        } else {
            setEditingLead(null);
            setFormData({
                title: '', company_name: '', contact_person: '',
                contact_email: '', contact_phone: '', estimated_value: 0, status: 'PROSPECT'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingLead) {
                await crmApi.updateLead(editingLead.id, formData);
                addNotification('Sukses', 'Lead berhasil diperbarui', 'success');
            } else {
                await crmApi.createLead(formData);
                addNotification('Sukses', 'Lead baru berhasil dibuat', 'success');
            }
            setIsModalOpen(false);
            loadLeads();
        } catch (err) {
            addNotification('Gagal', 'Gagal menyimpan data Lead', 'error');
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
    };

    // Calculate totals per column
    const getColumnTotal = (columnId) => {
        return leads
            .filter(l => l.status === columnId)
            .reduce((acc, curr) => acc + (curr.estimated_value || 0), 0);
    };

    return (
        <div className="p-8 w-full max-w-[1600px] mx-auto bg-slate-50 min-h-[calc(100vh-64px)] overflow-x-hidden">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">CRM Sales Leads</h1>
                    <p className="text-sm text-gray-500">Pipeline negosiasi dan prospek pelanggan baru</p>
                </div>
                <Button variant="primary" onClick={() => handleOpenModal()}>+ Tambah Lead</Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-pulse text-gray-400 font-medium">Memuat Pipeline...</div>
                </div>
            ) : (
                <div className="flex gap-6 items-start overflow-x-auto pb-8 h-full">
                    {COLUMNS.map(col => {
                        const colLeads = leads.filter(l => l.status === col.id);
                        return (
                            <div
                                key={col.id}
                                className="flex-1 min-w-[320px] max-w-[400px] bg-gray-100 rounded-xl p-4 flex flex-col gap-4 border border-gray-200"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                {/* Column Header */}
                                <div className="flex justify-between items-center border-b-2 pb-2" style={{ borderColor: col.color }}>
                                    <h3 className="font-bold text-gray-700 uppercase tracking-wider text-sm">
                                        {col.title} <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full ml-1">{colLeads.length}</span>
                                    </h3>
                                    <span className="text-sm font-semibold text-gray-600">
                                        {formatCurrency(getColumnTotal(col.id))}
                                    </span>
                                </div>

                                {/* Kanban Cards */}
                                <div className="flex flex-col gap-3 min-h-[150px]">
                                    {colLeads.length === 0 && (
                                        <div className="text-center text-sm text-gray-400 py-4 italic border-2 border-dashed border-gray-200 rounded-lg">
                                            Tarik lead ke sini
                                        </div>
                                    )}
                                    {colLeads.map(lead => (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => handleOpenModal(lead)}
                                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-grab hover:shadow-md transition-shadow hover:border-blue-300 relative group"
                                        >
                                            <div className="w-1.5 h-full absolute left-0 top-0 rounded-l-xl" style={{ backgroundColor: col.color }}></div>
                                            <div className="pl-3">
                                                <h4 className="font-semibold text-gray-800 text-base">{lead.title}</h4>
                                                <p className="text-sm text-gray-500 font-medium">{lead.company_name}</p>

                                                <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-end">
                                                    <div className="text-xs text-gray-400">
                                                        <div>{lead.contact_person || 'No Contact'}</div>
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-700">
                                                        {formatCurrency(lead.estimated_value)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal Form */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLead ? "Edit Lead" : "Lead Baru"} size="medium">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Input
                        label="Judul Peluang (Pekerjaan/Proyek) *"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="Contoh: Pengadaan Selang Excavator"
                    />
                    <Input
                        label="Nama Perusahaan *"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        required
                        placeholder="PT. Maju Mundur"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Nama Kontak (PIC)"
                            value={formData.contact_person}
                            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        />
                        <Input
                            label="Telepon"
                            value={formData.contact_phone}
                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        />
                    </div>

                    <Input
                        label="Estimasi Nilai (Rp)"
                        type="number"
                        value={formData.estimated_value}
                        onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                    />

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Status Tahap</label>
                        <select
                            className="bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm max-w-[200px]"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                        <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
                        <Button variant="primary" type="submit">Simpan Lead</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
