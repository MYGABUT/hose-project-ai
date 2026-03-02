import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import { supplierApi } from '../../services/supplierApi';
import './VendorScorecard.css';

const gradeConfig = {
    'A': { color: '#4caf50', bgColor: '#e8f5e9', label: 'Excellent' },
    'A-': { color: '#66bb6a', bgColor: '#e8f5e9', label: 'Very Good' },
    'B+': { color: '#8bc34a', bgColor: '#f1f8e9', label: 'Good' },
    'B': { color: '#cddc39', bgColor: '#f9fbe7', label: 'Above Average' },
    'B-': { color: '#ffeb3b', bgColor: '#fffde7', label: 'Average' },
    'C': { color: '#ffc107', bgColor: '#fff8e1', label: 'Below Average' },
    'D': { color: '#f44336', bgColor: '#ffebee', label: 'Poor' },
    'F': { color: '#b71c1c', bgColor: '#ffcdd2', label: 'Critical' }
};

export default function VendorScorecard() {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await supplierApi.getVendorScorecard();
        if (res.status === 'success') {
            setVendors(res.data);
        }
        setLoading(false);
    };

    const sortedVendors = [...vendors]
        .filter(v => filterCategory === 'all' || v.category === filterCategory)
        .sort((a, b) => b.score - a.score);

    const topPerformers = sortedVendors.filter(v => v.score >= 80);
    const needsAttention = sortedVendors.filter(v => v.score >= 50 && v.score < 80);
    const riskAlert = sortedVendors.filter(v => v.score < 50);

    const handleViewDetail = (vendor) => {
        setSelectedVendor(vendor);
        setShowDetailModal(true);
    };

    const handleUnblock = (vendorId) => {
        if (confirm('Yakin ingin membuka blokir vendor ini? (Override Manager)')) {
            alert('Fitur unblock via API belum diimplementasi');
        }
    };

    const handleStopOrder = (vendorId) => {
        if (confirm('Yakin ingin memblokir pembelian dari vendor ini?')) {
            alert('Fitur blokir via API belum diimplementasi');
        }
    };

    return (
        <div className="vendor-scorecard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Vendor Performance Scorecard</h1>
                    <p className="page-subtitle">Raport Supplier - Data otomatis dari Inbound & PO</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh Data</Button>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <div className="filter-group">
                    <label>Tahun:</label>
                    <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Kategori:</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                        <option value="all">Semua</option>
                        <option value="Hose">Hose</option>
                        <option value="Fitting">Fitting</option>
                    </select>
                </div>
            </div>

            {/* Score Legend */}
            <div className="score-legend">
                <h4>Panduan Skor:</h4>
                <div className="legend-items">
                    <span className="legend-item good">80-100: Top Performer 🏆</span>
                    <span className="legend-item warning">50-79: Needs Attention ⚠️</span>
                    <span className="legend-item danger">0-49: Risk Alert 🚨</span>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">Mengambil data performa vendor...</div>
            ) : sortedVendors.length === 0 ? (
                <div className="empty-state">Belum ada data vendor atau PO.</div>
            ) : (
                <>
                    {/* Top Performers */}
                    {topPerformers.length > 0 && (
                        <Card className="leaderboard-section top">
                            <div className="section-header">
                                <h3>🏆 TOP PERFORMER (Mitra Terbaik)</h3>
                            </div>
                            <div className="vendor-list">
                                {topPerformers.map((vendor, index) => (
                                    <div
                                        key={vendor.id}
                                        className="vendor-card top"
                                        onClick={() => handleViewDetail(vendor)}
                                    >
                                        <div className="vendor-rank">#{index + 1}</div>
                                        <div className="vendor-info">
                                            <div className="vendor-name">{vendor.name}</div>
                                            <div className="vendor-category">{vendor.category}</div>
                                        </div>
                                        <div
                                            className="vendor-grade"
                                            style={{
                                                backgroundColor: gradeConfig[vendor.grade]?.bgColor,
                                                color: gradeConfig[vendor.grade]?.color
                                            }}
                                        >
                                            Grade {vendor.grade}
                                        </div>
                                        <div className="vendor-score">
                                            <span className="score-value">{vendor.score}</span>
                                            <span className="score-max">/100</span>
                                        </div>
                                        <div className="vendor-bar-container">
                                            <div
                                                className="vendor-bar good"
                                                style={{ width: `${vendor.score}%` }}
                                            />
                                            <span className="bar-label">Del: {vendor.metrics.deliveryOnTime}% | Qty: {100 - vendor.metrics.inboundRejectRate}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Needs Attention */}
                    {needsAttention.length > 0 && (
                        <Card className="leaderboard-section attention">
                            <div className="section-header">
                                <h3>⚠️ NEEDS ATTENTION (Perlu Evaluasi)</h3>
                            </div>
                            <div className="vendor-list">
                                {needsAttention.map((vendor, index) => (
                                    <div
                                        key={vendor.id}
                                        className="vendor-card attention"
                                        onClick={() => handleViewDetail(vendor)}
                                    >
                                        <div className="vendor-rank">#{topPerformers.length + index + 1}</div>
                                        <div className="vendor-info">
                                            <div className="vendor-name">{vendor.name}</div>
                                            <div className="vendor-category">{vendor.category}</div>
                                            {vendor.issues && vendor.issues.length > 0 && (
                                                <div className="vendor-issues">
                                                    *Masalah: {vendor.issues.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className="vendor-grade"
                                            style={{
                                                backgroundColor: gradeConfig[vendor.grade]?.bgColor,
                                                color: gradeConfig[vendor.grade]?.color
                                            }}
                                        >
                                            Grade {vendor.grade}
                                        </div>
                                        <div className="vendor-score">
                                            <span className="score-value">{vendor.score}</span>
                                            <span className="score-max">/100</span>
                                        </div>
                                        <div className="vendor-bar-container">
                                            <div
                                                className="vendor-bar warning"
                                                style={{ width: `${vendor.score}%` }}
                                            />
                                            <span className="bar-label">Del: {vendor.metrics.deliveryOnTime}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Risk Alert */}
                    {riskAlert.length > 0 && (
                        <Card className="leaderboard-section risk">
                            <div className="section-header">
                                <h3>🚨 RISK ALERT (Bahaya!)</h3>
                            </div>
                            <div className="vendor-list">
                                {riskAlert.map((vendor, index) => (
                                    <div
                                        key={vendor.id}
                                        className={`vendor-card risk ${vendor.status === 'blocked' ? 'blocked' : ''}`}
                                        onClick={() => handleViewDetail(vendor)}
                                    >
                                        <div className="vendor-rank">#{topPerformers.length + needsAttention.length + index + 1}</div>
                                        <div className="vendor-info">
                                            <div className="vendor-name">{vendor.name}</div>
                                            <div className="vendor-category">{vendor.category}</div>
                                            {vendor.issues && (
                                                <div className="vendor-issues">
                                                    *{vendor.issues.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className="vendor-grade"
                                            style={{
                                                backgroundColor: gradeConfig[vendor.grade]?.bgColor,
                                                color: gradeConfig[vendor.grade]?.color
                                            }}
                                        >
                                            Grade {vendor.grade}
                                        </div>
                                        <div className="vendor-score">
                                            <span className="score-value danger">{vendor.score}</span>
                                            <span className="score-max">/100</span>
                                        </div>
                                        <div className="vendor-bar-container">
                                            <div
                                                className="vendor-bar danger"
                                                style={{ width: `${vendor.score}%` }}
                                            />
                                            <span className="bar-label danger">Reject: {vendor.metrics.inboundRejectRate}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* Vendor Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title={`Detail Vendor: ${selectedVendor?.name}`}
                size="lg"
            >
                {selectedVendor && (
                    <div className="vendor-detail">
                        {/* Grade Header */}
                        <div
                            className="detail-grade-header"
                            style={{ backgroundColor: gradeConfig[selectedVendor.grade]?.bgColor }}
                        >
                            <span
                                className="grade-big"
                                style={{ color: gradeConfig[selectedVendor.grade]?.color }}
                            >
                                {selectedVendor.grade}
                            </span>
                            <div className="grade-info">
                                <span className="score-big">{selectedVendor.score}/100</span>
                                <span className="grade-label">{gradeConfig[selectedVendor.grade]?.label}</span>
                            </div>
                        </div>

                        {/* Status */}
                        {selectedVendor.status === 'blocked' && (
                            <div className="vendor-blocked-alert">
                                🔒 Vendor ini DIBLOKIR. Pembuatan PO tidak diizinkan!
                            </div>
                        )}

                        {/* Metrics */}
                        <div className="detail-metrics">
                            <h4>Breakdown Skor</h4>
                            <div className="metric-grid">
                                <div className="metric-item">
                                    <span className="metric-label">Inbound Reject Rate</span>
                                    <div className="metric-bar-container">
                                        <div
                                            className={`metric-bar ${selectedVendor.metrics.inboundRejectRate > 3 ? 'danger' : selectedVendor.metrics.inboundRejectRate > 1 ? 'warning' : 'good'}`}
                                            style={{ width: `${Math.min(selectedVendor.metrics.inboundRejectRate * 10, 100)}%` }}
                                        />
                                    </div>
                                    <span className={`metric-value ${selectedVendor.metrics.inboundRejectRate > 3 ? 'danger' : ''}`}>
                                        {selectedVendor.metrics.inboundRejectRate}%
                                    </span>
                                </div>

                                <div className="metric-item">
                                    <span className="metric-label">On-Time Delivery</span>
                                    <div className="metric-bar-container">
                                        <div
                                            className={`metric-bar ${selectedVendor.metrics.deliveryOnTime < 80 ? 'danger' : selectedVendor.metrics.deliveryOnTime < 90 ? 'warning' : 'good'}`}
                                            style={{ width: `${selectedVendor.metrics.deliveryOnTime}%` }}
                                        />
                                    </div>
                                    <span className="metric-value">{selectedVendor.metrics.deliveryOnTime}%</span>
                                </div>

                                <div className="metric-item">
                                    <span className="metric-label">Total Volume</span>
                                    <span className="metric-value">{selectedVendor.totalOrders} PO</span>
                                </div>
                            </div>
                        </div>

                        {/* History */}
                        <div className="detail-history">
                            <h4>Riwayat</h4>
                            <div className="history-stats">
                                <div className="history-item">
                                    <span className="history-value">{selectedVendor.totalOrders}</span>
                                    <span className="history-label">Total PO</span>
                                </div>
                                <div className="history-item">
                                    <span className="history-value danger">{selectedVendor.rmaCount}</span>
                                    <span className="history-label">RMA/Reject</span>
                                </div>
                                <div className="history-item">
                                    <span className="history-value">{selectedVendor.lastOrder || '-'}</span>
                                    <span className="history-label">Order Terakhir</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="detail-actions">
                            <Button variant="secondary">
                                📧 Hubungi Vendor
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
