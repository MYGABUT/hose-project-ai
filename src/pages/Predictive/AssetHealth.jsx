import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import HealthBar from '../../components/features/Predictive/HealthBar';
import UnitHealthCard from '../../components/features/Predictive/UnitHealthCard';
import FailureAnalysisModal from '../../components/features/Predictive/FailureAnalysisModal';
import { getAssets, updateAssetHM } from '../../services/assetApi';
import './AssetHealth.css';

// Category config with colors
const categoryConfig = {
    factory: { icon: '⚙️', label: 'Pabrik', color: '#607d8b' },
    heavy: { icon: '🚜', label: 'Alat Berat', color: '#ff9800' },
    marine: { icon: '⚓', label: 'Laut/Kapal', color: '#2196f3' },
    oil_gas: { icon: '🛢️', label: 'Migas', color: '#795548' },
    general: { icon: '📦', label: 'Umum', color: '#9c27b0' }
};

const gradeConfig = {
    'A': { label: 'PRIMA', color: 'gold', icon: '🏆' },
    'B': { label: 'BAIK', color: 'green', icon: '✅' },
    'C': { label: 'PERLU SERVIS', color: 'orange', icon: '⚠️' },
    'D': { label: 'KRITIS', color: 'red', icon: '🚨' }
};

export default function AssetHealth() {
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [showFailureModal, setShowFailureModal] = useState(false);
    const [failureHose, setFailureHose] = useState(null);
    const [showHealthCard, setShowHealthCard] = useState(false);
    const [updateHMMOdal, setUpdateHMModal] = useState(false);
    const [newHMInput, setNewHMInput] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await getAssets();
        if (res.status === 'success') {
            setUnits(res.data);

            // If modal open, refresh selected unit
            if (selectedUnit) {
                const refreshed = res.data.find(u => u.id === selectedUnit.id);
                if (refreshed) setSelectedUnit(refreshed);
            }
        }
        setLoading(false);
    };

    const handleUnitClick = (unit) => {
        setSelectedUnit(unit);
    };

    const handleReportFailure = (hose) => {
        setFailureHose(hose);
        setShowFailureModal(true);
    };

    const handleUpdateHM = async () => {
        if (!newHMInput || isNaN(newHMInput)) {
            alert("Masukkan angka yang valid");
            return;
        }

        const res = await updateAssetHM(selectedUnit.id, parseFloat(newHMInput));
        if (res.status === 'success') {
            alert(`✅ HM berhasil diupdate ke ${newHMInput}`);
            setUpdateHMModal(false);
            setNewHMInput('');
            loadData(); // Refresh UI to trigger recalculation
        } else {
            alert('Gagal update HM: ' + res.message);
        }
    }

    // Generate initials from asset name
    const getInitials = (name) => {
        if (!name) return '?';
        const words = name.trim().split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const handleShareToWA = (unit) => {
        // Generate shareable content
        const criticalHoses = unit.hoses.filter(h => h.status === 'critical');
        const message = `🔧 *LAPORAN KESEHATAN UNIT*\n\n` +
            `📍 Unit: ${unit.name}\n` +
            `👤 Client: ${unit.client}\n` +
            `⏱️ HM: ${unit.currentHM}\n` +
            `📊 Status: ${gradeConfig[unit.grade].icon} ${gradeConfig[unit.grade].label}\n\n` +
            (criticalHoses.length > 0
                ? `⚠️ *PERHATIAN:* ${criticalHoses.length} selang perlu diganti segera!\n` +
                criticalHoses.map(h => `- ${h.position} (Overdue: ${h.predictedDate})`).join('\n') + '\n\n'
                : `✅ Semua selang dalam kondisi baik.\n\n`) +
            `_Diverifikasi oleh HOSE PRO System_`;

        // Open WhatsApp with pre-filled message
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const getOverallStats = () => {
        let total = 0, good = 0, warning = 0, critical = 0;
        units.forEach(unit => {
            unit.hoses.forEach(hose => {
                total++;
                if (hose.status === 'good') good++;
                else if (hose.status === 'warning') warning++;
                else if (hose.status === 'critical') critical++;
            });
        });
        return { total, good, warning, critical };
    };

    const stats = getOverallStats();

    return (
        <div className="asset-health-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🔮 Predictive Maintenance</h1>
                    <p className="page-subtitle">Prediksi kesehatan selang hidrolik - Ganti sebelum pecah!</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh Data</Button>
                    {/* <Link to="/predictive/new">
                        <Button variant="primary">+ Tambah Aset</Button>
                     </Link> */}
                </div>
            </div>

            {/* Overview Stats */}
            <div className="health-stats">
                <div className="stat-card total">
                    <span className="stat-value">{loading ? '...' : stats.total}</span>
                    <span className="stat-label">Total Selang Terpasang</span>
                </div>
                <div className="stat-card good">
                    <span className="stat-icon">💚</span>
                    <span className="stat-value">{loading ? '...' : stats.good}</span>
                    <span className="stat-label">Kondisi Prima</span>
                </div>
                <div className="stat-card warning">
                    <span className="stat-icon">💛</span>
                    <span className="stat-value">{loading ? '...' : stats.warning}</span>
                    <span className="stat-label">Perlu Perhatian</span>
                </div>
                <div className="stat-card critical">
                    <span className="stat-icon">❤️</span>
                    <span className="stat-value">{loading ? '...' : stats.critical}</span>
                    <span className="stat-label">Segera Ganti!</span>
                </div>
            </div>

            {/* Unit List */}
            {loading ? (
                <div className="loading-state">Mengambil data aset...</div>
            ) : units.length === 0 ? (
                <div className="empty-state">Belum ada aset terdaftar. Silakan hubungi admin.</div>
            ) : (
                <div className="units-grid">
                    {units.map(unit => (
                        <div
                            key={unit.id}
                            className={`unit-card grade-${unit.grade.toLowerCase()}`}
                            onClick={() => handleUnitClick(unit)}
                        >
                            <div className="unit-header">
                                <div className="unit-photo">
                                    {unit.photo ? (
                                        <img src={unit.photo} alt={unit.name} />
                                    ) : (
                                        <div
                                            className="photo-placeholder-initials"
                                            style={{ backgroundColor: categoryConfig[unit.category]?.color || '#6366f1' }}
                                        >
                                            {getInitials(unit.name)}
                                        </div>
                                    )}
                                    <span className="category-badge">
                                        {categoryConfig[unit.category]?.icon || '📦'}
                                    </span>
                                </div>
                                <div className="unit-info">
                                    <h3 className="unit-name">{unit.name}</h3>
                                    <p className="unit-client">{unit.location} • {categoryConfig[unit.category]?.label || 'Umum'}</p>
                                    <div className="unit-tracking">
                                        {unit.trackingMode === 'hour_meter' ? (
                                            <span className="tracking-badge hm">
                                                ⏱️ {unit.currentHM.toLocaleString()} HM
                                            </span>
                                        ) : (
                                            <span className="tracking-badge calendar">
                                                📅 Calendar
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className={`unit-grade grade-${unit.grade.toLowerCase()}`}>
                                    <span className="grade-icon">{gradeConfig[unit.grade].icon}</span>
                                    <span className="grade-label">{gradeConfig[unit.grade].label}</span>
                                </div>
                            </div>

                            {/* Hose Health Bars */}
                            <div className="unit-hoses">
                                {unit.hoses.map(hose => (
                                    <HealthBar
                                        key={hose.id}
                                        hose={hose}
                                        compact={true}
                                    />
                                ))}
                            </div>

                            <div className="unit-actions">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleShareToWA(unit); }}
                                >
                                    📤 Share WA
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); setSelectedUnit(unit); setShowHealthCard(true); }}
                                >
                                    📋 Health Card
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Unit Detail Modal */}
            <Modal
                isOpen={selectedUnit !== null && !showHealthCard}
                onClose={() => setSelectedUnit(null)}
                title={`Detail Unit: ${selectedUnit?.name}`}
                size="lg"
            >
                {selectedUnit && (
                    <div className="unit-detail">
                        <div className="detail-header">
                            <div className={`grade-badge grade-${selectedUnit.grade.toLowerCase()}`}>
                                {gradeConfig[selectedUnit.grade].icon} {gradeConfig[selectedUnit.grade].label}
                            </div>
                            <p className="detail-client">{selectedUnit.client}</p>
                            {selectedUnit.trackingMode === 'hour_meter' && (
                                <div className="hm-display">
                                    <span className="hm-label">Hour Meter Saat Ini:</span>
                                    <span className="hm-value">{selectedUnit.currentHM.toLocaleString()} Jam</span>
                                    <Button variant="secondary" size="sm" onClick={() => setUpdateHMModal(true)}>Update HM</Button>
                                </div>
                            )}
                        </div>

                        {/* Update HM Inline Form */}
                        {updateHMMOdal && (
                            <div className="hm-update-form" style={{ padding: '10px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        placeholder="Input HM baru..."
                                        value={newHMInput}
                                        onChange={(e) => setNewHMInput(e.target.value)}
                                        style={{ padding: '8px', flex: 1 }}
                                    />
                                    <Button variant="primary" size="sm" onClick={handleUpdateHM}>Simpan</Button>
                                    <Button variant="text" size="sm" onClick={() => setUpdateHMModal(false)}>Batal</Button>
                                </div>
                            </div>
                        )}

                        <div className="detail-hoses">
                            <h4>Daftar Selang Terpasang</h4>
                            {selectedUnit.hoses.map(hose => (
                                <div key={hose.id} className={`hose-detail status-${hose.status}`}>
                                    <div className="hose-header">
                                        <span className="hose-id">#{hose.id}</span>
                                        <span className="hose-position">{hose.position}</span>
                                        <span className={`stress-badge stress-${hose.stressLevel}`}>
                                            {hose.stressLevel === 'high' ? '🔥 High Pressure' :
                                                hose.stressLevel === 'medium' ? '⚡ Medium' : '💧 Low Pressure'}
                                        </span>
                                    </div>

                                    <HealthBar hose={hose} compact={false} />

                                    <div className="hose-prediction">
                                        <div className="prediction-item">
                                            <span className="pred-label">Tgl Pasang:</span>
                                            <span className="pred-value">{hose.installDate}</span>
                                        </div>
                                        {hose.installHM !== null && (
                                            <div className="prediction-item">
                                                <span className="pred-label">Pasang di HM:</span>
                                                <span className="pred-value">{hose.installHM.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="prediction-item highlight">
                                            <span className="pred-label">Prediksi Ganti:</span>
                                            <span className={`pred-value ${hose.status === 'critical' ? 'danger' : ''}`}>
                                                {hose.predictedDate === 'OVERDUE' ? '⚠️ SEGERA!' : hose.predictedDate}
                                            </span>
                                        </div>
                                    </div>

                                    {hose.status === 'critical' && (
                                        <Button variant="danger" fullWidth>
                                            🛒 Buat Penawaran Penggantian
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="detail-actions">
                            <Button variant="secondary" onClick={() => handleShareToWA(selectedUnit)}>
                                📤 Share ke WhatsApp
                            </Button>
                            <Button variant="primary" onClick={() => setShowHealthCard(true)}>
                                📋 Generate Health Card
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Health Card Modal (Shareable) */}
            <Modal
                isOpen={showHealthCard && selectedUnit !== null}
                onClose={() => setShowHealthCard(false)}
                title="Unit Health Card"
                size="md"
            >
                {selectedUnit && (
                    <UnitHealthCard
                        unit={selectedUnit}
                        gradeConfig={gradeConfig}
                        onShare={() => handleShareToWA(selectedUnit)}
                    />
                )}
            </Modal>

            {/* Failure Analysis Modal */}
            <FailureAnalysisModal
                isOpen={showFailureModal}
                onClose={() => { setShowFailureModal(false); setFailureHose(null); }}
                hose={failureHose}
            />
        </div>
    );
}
