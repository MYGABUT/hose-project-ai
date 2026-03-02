import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import './Project.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function ProjectDashboard() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Master data for create form
    const [customers, setCustomers] = useState([]);

    // Form Data
    const [formData, setFormData] = useState({
        customer_id: '',
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        total_value: 0
    });

    useEffect(() => {
        loadProjects();
        loadCustomers();
    }, []);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/projects`);
            const data = await res.json();
            if (data.status === 'success') {
                setProjects(data.data);
            }
        } catch (error) {
            console.error("Failed to load projects", error);
        }
        setLoading(false);
    };

    const loadCustomers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/customers?limit=100`);
            const data = await res.json();
            if (data.status === 'success') setCustomers(data.data);
        } catch (e) { console.error(e); }
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.customer_id) return alert('Nama Project & Customer wajib diisi');

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.status === 'success') {
                alert('✅ Project Berhasil Dibuat!');
                setShowCreateModal(false);
                setFormData({});
                loadProjects();
            } else {
                alert(data.detail);
            }
        } catch (e) { alert(e.message); }
    };

    // Stats
    const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'IN_PROGRESS').length,
        completed: projects.filter(p => p.status === 'COMPLETED').length,
        new: projects.filter(p => p.status === 'NEW').length
    };

    return (
        <div className="project-dashboard">
            <div className="project-header">
                <div>
                    <h1>🏗️ Project & Service Dashboard</h1>
                    <p>Kelola Instalasi, Maintenance, dan Teknisi Lapangan</p>
                </div>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    ➕ Buat Project Baru
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="project-stats">
                <div className="p-stat-card">
                    <div className="p-stat-icon">📂</div>
                    <div className="p-stat-info">
                        <span className="p-stat-value">{stats.total}</span>
                        <span className="p-stat-label">Total Project</span>
                    </div>
                </div>
                <div className="p-stat-card">
                    <div className="p-stat-icon" style={{ color: '#b45309', background: '#fef3c7' }}>🔨</div>
                    <div className="p-stat-info">
                        <span className="p-stat-value">{stats.active}</span>
                        <span className="p-stat-label">Sedang Dikerjakan</span>
                    </div>
                </div>
                <div className="p-stat-card">
                    <div className="p-stat-icon" style={{ color: '#047857', background: '#d1fae5' }}>✅</div>
                    <div className="p-stat-info">
                        <span className="p-stat-value">{stats.completed}</span>
                        <span className="p-stat-label">Selesai</span>
                    </div>
                </div>
            </div>

            {/* Project Grid */}
            <div className="project-grid">
                {projects.map(project => (
                    <div
                        key={project.id}
                        className={`project-card status-${project.status.toLowerCase()}`}
                        onClick={() => navigate(`/project/${project.id}`)}
                    >
                        <div className="project-top">
                            <span className={`project-status ${project.status.toLowerCase()}`}>
                                {project.status.replace('_', ' ')}
                            </span>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>#{project.id}</span>
                        </div>
                        <div className="project-client">🏢 {project.customer_name}</div>
                        <h3 className="project-title">{project.name}</h3>
                        <div className="project-dates">
                            📅 {project.start_date || '-'} s/d {project.end_date || '-'}
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                            {project.description ? project.description.substring(0, 100) + '...' : 'Tidak ada deskripsi'}
                        </p>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="➕ Buat Project Baru"
            >
                <div className="form-grid">
                    <div className="form-group">
                        <label>Customer (Klien) *</label>
                        <select
                            value={formData.customer_id}
                            onChange={e => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                        >
                            <option value="">-- Pilih Customer --</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Nama Project *</label>
                        <input
                            type="text"
                            placeholder="Contoh: Instalasi Hidrolik PT Tambang Jaya"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Deskripsi</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Tanggal Mulai</label>
                        <input
                            type="date"
                            value={formData.start_date}
                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Estimasi Selesai</label>
                        <input
                            type="date"
                            value={formData.end_date}
                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Nilai Project (Rp)</label>
                        <input
                            type="number"
                            value={formData.total_value}
                            onChange={e => setFormData({ ...formData, total_value: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>
                <div className="modal-actions" style={{ marginTop: '24px' }}>
                    <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Batal</Button>
                    <Button variant="primary" onClick={handleCreate}>Simpan Project</Button>
                </div>
            </Modal>
        </div>
    );
}
