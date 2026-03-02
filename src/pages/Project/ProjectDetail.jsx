import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import './Project.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, wo, sppd, reports, commission

    // Forms
    const [showWOModal, setShowWOModal] = useState(false);
    const [woForm, setWoForm] = useState({ technician_name: '', task_name: '', description: '', priority: 'NORMAL', scheduled_date: '' });

    const [showSPPDModal, setShowSPPDModal] = useState(false);
    const [sppdForm, setSppdForm] = useState({ technician_name: '', destination: '', start_date: '', end_date: '', transport_cost: 0, accommodation_cost: 0, meal_allowance: 0, other_cost: 0 });

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportForm, setReportForm] = useState({ report_date: '', technician_name: '', activity_description: '', challenges: '', materials_used: '', progress_percentage: 0 });

    const [showCommissionModal, setShowCommissionModal] = useState(false);
    const [commissionForm, setCommissionForm] = useState({ document_number: '', client_evaluator: '', evaluation_date: '', status: 'PENDING', notes: '' });

    useEffect(() => {
        loadProject();
    }, [id]);

    const loadProject = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`);
            const data = await res.json();
            if (data.status === 'success') {
                setProject(data.data);
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const updateStatus = async (newStatus) => {
        if (!confirm(`Ubah status project menjadi ${newStatus}?`)) return;
        await fetch(`${API_BASE_URL}/api/v1/projects/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        loadProject();
    };

    // --- Submit Handlers ---
    const submitWO = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/v1/projects/${id}/work-orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(woForm)
            });
            alert('SPK Created!');
            setShowWOModal(false);
            loadProject();
        } catch (e) { alert(e.message); }
    };

    const updateWOStatus = async (woId, status) => {
        await fetch(`${API_BASE_URL}/api/v1/projects/work-orders/${woId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        loadProject();
    };

    const submitSPPD = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/v1/projects/${id}/sppd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sppdForm)
            });
            alert('SPPD Created!');
            setShowSPPDModal(false);
            loadProject();
        } catch (e) { alert(e.message); }
    };

    const submitReport = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/v1/projects/${id}/daily-reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportForm)
            });
            alert('Laporan Harian Tersimpan!');
            setShowReportModal(false);
            loadProject();
        } catch (e) { alert(e.message); }
    };

    const submitCommission = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/v1/projects/${id}/commissioning`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commissionForm)
            });
            alert('Commissioning Updated!');
            setShowCommissionModal(false);
            loadProject();
        } catch (e) { alert(e.message); }
    };

    // --- Renderers ---
    if (loading || !project) return <div className="project-detail">Loading...</div>;

    const renderOverview = () => (
        <div className="overview-tab">
            <div className="p-stat-card">
                <div className="p-stat-info">
                    <h3>Deskripsi Project</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{project.description || '-'}</p>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <div className="p-stat-card">
                    <div className="p-stat-info">
                        <span className="p-stat-label">Total Nilai Project</span>
                        <span className="p-stat-value">Rp {project.total_value?.toLocaleString()}</span>
                    </div>
                </div>
                <div className="p-stat-card">
                    <div className="p-stat-info">
                        <span className="p-stat-label">Durasi</span>
                        <span className="p-stat-value">{project.start_date} s/d {project.end_date}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderWO = () => (
        <div className="wo-tab">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <Button size="sm" onClick={() => setShowWOModal(true)}>➕ Buat SPK (Work Order)</Button>
            </div>
            {project.work_orders.length === 0 ? <p>Belum ada SPK.</p> : (
                project.work_orders.map(wo => (
                    <div key={wo.id} className="sub-list-item">
                        <div className="item-left">
                            <h4>{wo.task_name} <span className={`wo-status ${wo.status.toLowerCase()}`}>{wo.status}</span></h4>
                            <p>👨‍🔧 {wo.technician_name} | 📅 {wo.scheduled_date} | ⚠️ Priority: {wo.priority}</p>
                            <p style={{ fontSize: '13px', marginTop: '4px' }}>{wo.description}</p>
                        </div>
                        <div className="item-right">
                            {wo.status !== 'COMPLETED' && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {wo.status === 'OPEN' && <Button size="xs" onClick={() => updateWOStatus(wo.id, 'IN_PROGRESS')}>Start</Button>}
                                    {wo.status === 'IN_PROGRESS' && <Button size="xs" variant="success" onClick={() => updateWOStatus(wo.id, 'COMPLETED')}>Finish</Button>}
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderSPPD = () => (
        <div className="sppd-tab">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <Button size="sm" onClick={() => setShowSPPDModal(true)}>➕ Buat SPPD</Button>
            </div>
            {project.sppd.length === 0 ? <p>Belum ada SPPD.</p> : (
                project.sppd.map(s => (
                    <div key={s.id} className="sub-list-item">
                        <div className="item-left">
                            <h4>✈️ {s.destination} - {s.technician_name}</h4>
                            <p>📅 {s.start_date} s/d {s.end_date}</p>
                            <p>💰 Total Biaya: Rp {s.total_cost?.toLocaleString()}</p>
                        </div>
                        <div className="item-right">
                            <span className="wo-status">{s.status}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderReports = () => (
        <div className="reports-tab">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <Button size="sm" onClick={() => setShowReportModal(true)}>➕ Tulis Laporan Harian</Button>
            </div>
            {project.daily_reports.length === 0 ? <p>Belum ada Laporan Harian.</p> : (
                project.daily_reports.map(r => (
                    <div key={r.id} className="sub-list-item">
                        <div className="item-left">
                            <h4>📋 Laporan {r.report_date} - {r.technician_name}</h4>
                            <p><strong>Aktivitas:</strong> {r.activity_description}</p>
                            {r.challenges && <p style={{ color: '#ef4444' }}><strong>Kendala:</strong> {r.challenges}</p>}
                            <p><strong>Progress:</strong> {r.progress_percentage}%</p>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderCommission = () => (
        <div className="commission-tab">
            {project.commissioning ? (
                <div className="setup-card">
                    <h3>📝 Berita Acara Serah Terima (BAST)</h3>
                    <p><strong>No Dokumen:</strong> {project.commissioning.document_number}</p>
                    <p><strong>Evaluator Klien:</strong> {project.commissioning.client_evaluator}</p>
                    <p><strong>Tanggal:</strong> {project.commissioning.evaluation_date}</p>
                    <p><strong>Status:</strong> {project.commissioning.status}</p>
                    <p><strong>Catatan:</strong> {project.commissioning.notes}</p>
                    <Button size="sm" onClick={() => {
                        setCommissionForm(project.commissioning);
                        setShowCommissionModal(true);
                    }}>Update BAST</Button>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Belum ada Berita Acara.</p>
                    <Button onClick={() => setShowCommissionModal(true)}>➕ Buat Berita Acara (Commissioning)</Button>
                </div>
            )}
        </div>
    );

    return (
        <div className="project-detail">
            <button className="back-btn" onClick={() => navigate('/projects')}>← Kembali ke Dashboard</button>

            <div className="project-detail-header">
                <div>
                    <div className="project-top" style={{ justifyContent: 'flex-start', gap: '10px' }}>
                        <span className={`project-status ${project.status.toLowerCase()}`}>{project.status}</span>
                        <h1>{project.name}</h1>
                    </div>
                    <p className="project-client">🏢 {project.customer_name}</p>
                </div>
                <div>
                    {project.status === 'NEW' && <Button onClick={() => updateStatus('IN_PROGRESS')}>🚀 Start Project</Button>}
                    {project.status === 'IN_PROGRESS' && <Button variant="success" onClick={() => updateStatus('COMPLETED')}>✅ Finish Project</Button>}
                </div>
            </div>

            <div className="detail-tabs">
                {['overview', 'wo', 'sppd', 'reports', 'commission'].map(tab => (
                    <button
                        key={tab}
                        className={`detail-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'overview' && '🔍 Overview'}
                        {tab === 'wo' && '🛠️ Work Orders'}
                        {tab === 'sppd' && '✈️ SPPD'}
                        {tab === 'reports' && '📋 Daily Reports'}
                        {tab === 'commission' && '✍️ Commissioning'}
                    </button>
                ))}
            </div>

            <div className="tab-content">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'wo' && renderWO()}
                {activeTab === 'sppd' && renderSPPD()}
                {activeTab === 'reports' && renderReports()}
                {activeTab === 'commission' && renderCommission()}
            </div>

            {/* Modals */}
            <Modal isOpen={showWOModal} onClose={() => setShowWOModal(false)} title="➕ Buat Work Order (SPK)">
                <div className="form-grid">
                    <div className="form-group"><label>Nama Teknisi</label><input type="text" value={woForm.technician_name} onChange={e => setWoForm({ ...woForm, technician_name: e.target.value })} /></div>
                    <div className="form-group"><label>Judul Tugas (Task)</label><input type="text" value={woForm.task_name} onChange={e => setWoForm({ ...woForm, task_name: e.target.value })} /></div>
                    <div className="form-group"><label>Deskripsi</label><textarea value={woForm.description} onChange={e => setWoForm({ ...woForm, description: e.target.value })} /></div>
                    <div className="form-group"><label>Prioritas</label><select value={woForm.priority} onChange={e => setWoForm({ ...woForm, priority: e.target.value })}><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></div>
                    <div className="form-group"><label>Jadwal</label><input type="date" value={woForm.scheduled_date} onChange={e => setWoForm({ ...woForm, scheduled_date: e.target.value })} /></div>
                </div>
                <div className="modal-actions"><Button variant="secondary" onClick={() => setShowWOModal(false)}>Batal</Button><Button variant="primary" onClick={submitWO}>Simpan SPK</Button></div>
            </Modal>

            <Modal isOpen={showSPPDModal} onClose={() => setShowSPPDModal(false)} title="➕ Buat SPPD">
                <div className="form-grid">
                    <div className="form-group"><label>Nama Teknisi</label><input type="text" value={sppdForm.technician_name} onChange={e => setSppdForm({ ...sppdForm, technician_name: e.target.value })} /></div>
                    <div className="form-group"><label>Tujuan Dinas</label><input type="text" value={sppdForm.destination} onChange={e => setSppdForm({ ...sppdForm, destination: e.target.value })} /></div>
                    <div className="form-group"><label>Tgl Berangkat</label><input type="date" value={sppdForm.start_date} onChange={e => setSppdForm({ ...sppdForm, start_date: e.target.value })} /></div>
                    <div className="form-group"><label>Tgl Kembali</label><input type="date" value={sppdForm.end_date} onChange={e => setSppdForm({ ...sppdForm, end_date: e.target.value })} /></div>
                    <div className="form-group"><label>Transport (Rp)</label><input type="number" value={sppdForm.transport_cost} onChange={e => setSppdForm({ ...sppdForm, transport_cost: parseFloat(e.target.value) })} /></div>
                    <div className="form-group"><label>Penginapan (Rp)</label><input type="number" value={sppdForm.accommodation_cost} onChange={e => setSppdForm({ ...sppdForm, accommodation_cost: parseFloat(e.target.value) })} /></div>
                    <div className="form-group"><label>Uang Makan (Rp)</label><input type="number" value={sppdForm.meal_allowance} onChange={e => setSppdForm({ ...sppdForm, meal_allowance: parseFloat(e.target.value) })} /></div>
                </div>
                <div className="modal-actions"><Button variant="secondary" onClick={() => setShowSPPDModal(false)}>Batal</Button><Button variant="primary" onClick={submitSPPD}>Simpan SPPD</Button></div>
            </Modal>

            <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="➕ Laporan Harian">
                <div className="form-grid">
                    <div className="form-group"><label>Tanggal</label><input type="date" value={reportForm.report_date} onChange={e => setReportForm({ ...reportForm, report_date: e.target.value })} /></div>
                    <div className="form-group"><label>Teknisi</label><input type="text" value={reportForm.technician_name} onChange={e => setReportForm({ ...reportForm, technician_name: e.target.value })} /></div>
                    <div className="form-group"><label>Aktivitas</label><textarea rows={3} value={reportForm.activity_description} onChange={e => setReportForm({ ...reportForm, activity_description: e.target.value })} /></div>
                    <div className="form-group"><label>Kendala</label><textarea value={reportForm.challenges} onChange={e => setReportForm({ ...reportForm, challenges: e.target.value })} /></div>
                    <div className="form-group"><label>Progress (%)</label><input type="number" max="100" value={reportForm.progress_percentage} onChange={e => setReportForm({ ...reportForm, progress_percentage: parseInt(e.target.value) })} /></div>
                </div>
                <div className="modal-actions"><Button variant="secondary" onClick={() => setShowReportModal(false)}>Batal</Button><Button variant="primary" onClick={submitReport}>Simpan Laporan</Button></div>
            </Modal>

            <Modal isOpen={showCommissionModal} onClose={() => setShowCommissionModal(false)} title="✍️ Commissioning (BAST)">
                <div className="form-grid">
                    <div className="form-group"><label>No Dokumen</label><input type="text" value={commissionForm.document_number} onChange={e => setCommissionForm({ ...commissionForm, document_number: e.target.value })} /></div>
                    <div className="form-group"><label>Evaluator Klien (PIC)</label><input type="text" value={commissionForm.client_evaluator} onChange={e => setCommissionForm({ ...commissionForm, client_evaluator: e.target.value })} /></div>
                    <div className="form-group"><label>Tanggal Sign-off</label><input type="date" value={commissionForm.evaluation_date} onChange={e => setCommissionForm({ ...commissionForm, evaluation_date: e.target.value })} /></div>
                    <div className="form-group"><label>Status</label><select value={commissionForm.status} onChange={e => setCommissionForm({ ...commissionForm, status: e.target.value })}><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select></div>
                    <div className="form-group"><label>Catatan</label><textarea value={commissionForm.notes} onChange={e => setCommissionForm({ ...commissionForm, notes: e.target.value })} /></div>
                </div>
                <div className="modal-actions"><Button variant="secondary" onClick={() => setShowCommissionModal(false)}>Batal</Button><Button variant="primary" onClick={submitCommission}>Simpan BAST</Button></div>
            </Modal>

        </div>
    );
}
