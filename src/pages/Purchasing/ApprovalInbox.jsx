/**
 * Approval Inbox - For Bos/Manager to approve/reject PRs
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import Modal from '../../components/common/Modal/Modal';
import './Purchasing.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function ApprovalInbox() {
    const [loading, setLoading] = useState(true);
    const [pendingPRs, setPendingPRs] = useState([]);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedPR, setSelectedPR] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadPendingPRs();
    }, []);

    const loadPendingPRs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/pr/pending`);
            const data = await res.json();
            if (data.status === 'success') {
                setPendingPRs(data.data || []);
            }
        } catch (err) {
            console.error('Error loading pending PRs:', err);
        }
        setLoading(false);
    };

    const approvePR = async (prId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/pr/${prId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approved_by: 'Bos' })
            });
            const data = await res.json();
            if (data.status === 'success') {
                loadPendingPRs();
            }
        } catch (err) {
            console.error('Error approving PR:', err);
        }
    };

    const openRejectModal = (pr) => {
        setSelectedPR(pr);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const rejectPR = async () => {
        if (!rejectReason.trim()) {
            alert('Masukkan alasan penolakan');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/pr/${selectedPR.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rejected_by: 'Bos',
                    reason: rejectReason
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setShowRejectModal(false);
                loadPendingPRs();
            }
        } catch (err) {
            console.error('Error rejecting PR:', err);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const getPriorityLabel = (priority) => {
        const labels = {
            'LOW': { text: '🟢 Low', class: 'low' },
            'NORMAL': { text: '🔵 Normal', class: 'normal' },
            'HIGH': { text: '🟠 High', class: 'high' },
            'URGENT': { text: '🔴 Urgent', class: 'urgent' }
        };
        return labels[priority] || labels.NORMAL;
    };

    return (
        <div className="purchasing-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📥 Approval Inbox</h1>
                    <p className="page-subtitle">Purchase Request menunggu persetujuan</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadPendingPRs}>🔄 Refresh</Button>
                </div>
            </div>

            {/* Pending Count */}
            <div className="summary-grid">
                <Card className="summary-card warning">
                    <div className="summary-icon">📋</div>
                    <div className="summary-content">
                        <span className="summary-value">{pendingPRs.length}</span>
                        <span className="summary-label">Menunggu Approval</span>
                    </div>
                </Card>
            </div>

            {/* Pending PRs */}
            <div className="approval-inbox">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : pendingPRs.length === 0 ? (
                    <Card className="empty-state">
                        <p>✅ Tidak ada PR yang menunggu approval</p>
                    </Card>
                ) : (
                    pendingPRs.map(pr => (
                        <Card
                            key={pr.id}
                            className={`approval-card ${pr.priority === 'URGENT' ? 'urgent' : ''}`}
                        >
                            <div className="pr-header">
                                <div className="pr-number">{pr.pr_number}</div>
                                <StatusBadge status="warning">PENDING</StatusBadge>
                                <span className={`pr-priority ${getPriorityLabel(pr.priority).class}`}>
                                    {getPriorityLabel(pr.priority).text}
                                </span>
                            </div>

                            <div className="pr-body">
                                <div className="pr-info">
                                    <span className="info-label">Diminta oleh:</span>
                                    <span className="info-value">{pr.requested_by}</span>
                                </div>
                                <div className="pr-info">
                                    <span className="info-label">Supplier:</span>
                                    <span className="info-value">{pr.supplier_name || '-'}</span>
                                </div>
                                <div className="pr-info">
                                    <span className="info-label">Dibutuhkan:</span>
                                    <span className="info-value">{pr.required_date || '-'}</span>
                                </div>
                                <div className="pr-info">
                                    <span className="info-label">Est. Total:</span>
                                    <span className="info-value">{formatCurrency(pr.estimated_total)}</span>
                                </div>
                            </div>

                            {pr.notes && (
                                <div className="pr-notes">
                                    💬 {pr.notes}
                                </div>
                            )}

                            <div className="pr-footer">
                                <span className="pr-date">
                                    Submit: {pr.requested_at ? new Date(pr.requested_at).toLocaleString('id-ID') : '-'}
                                </span>
                                <div className="approval-actions">
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => openRejectModal(pr)}
                                    >
                                        ❌ Tolak
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="success"
                                        onClick={() => approvePR(pr.id)}
                                    >
                                        ✅ Approve
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <Modal
                    isOpen={showRejectModal}
                    onClose={() => setShowRejectModal(false)}
                    title={`Tolak PR ${selectedPR?.pr_number}`}
                    size="small"
                >
                    <div className="pr-form">
                        <div className="form-group">
                            <label>Alasan Penolakan *</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Masukkan alasan penolakan..."
                                rows={3}
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                                Batal
                            </Button>
                            <Button variant="danger" onClick={rejectPR}>
                                ❌ Konfirmasi Tolak
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
