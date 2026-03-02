/**
 * Rack Manager - Enhanced Dynamic Binning UI
 * With Pattern-based Wizard Generator and Smart Receiving
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import './RackManager.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

const STATUS_COLORS = {
    EMPTY: '#e5e7eb',
    PARTIAL: '#fcd34d',
    FULL: '#f87171'
};

const SUFFIX_OPTIONS = [
    { value: 'number', label: 'Angka (1, 2, 3...)' },
    { value: 'alpha', label: 'Huruf (A, B, C...)' },
    { value: 'roman', label: 'Romawi (I, II, III...)' }
];

export default function RackManager() {
    const navigate = useNavigate();
    const [treeData, setTreeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [showGenerator, setShowGenerator] = useState(false);
    const [showReceiving, setShowReceiving] = useState(false);
    const [zones, setZones] = useState([]);

    // Generator State
    const [generatorData, setGeneratorData] = useState({
        parent_zone: '',
        prefix: '',
        suffix_type: 'number',
        start_number: 1,
        end_number: 10,
        max_capacity_per_slot: 100,
        warehouse: 'MAIN',
        type: 'HOSE_RACK'
    });
    const [previewCodes, setPreviewCodes] = useState([]);

    // Smart Receiving State
    const [receivingData, setReceivingData] = useState({
        item_name: '',
        quantity: 0,
        zone_prefix: ''
    });
    const [slotRecommendations, setSlotRecommendations] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);

    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadTree();
        loadZones();
    }, []);

    useEffect(() => {
        // Auto-generate preview when generator data changes
        generatePreview();
    }, [generatorData.prefix, generatorData.start_number, generatorData.end_number, generatorData.suffix_type]);

    const loadTree = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations/tree`);
            const data = await res.json();
            if (data.status === 'success') {
                setTreeData(data.data);
            }
        } catch (err) {
            showMessage('error', `Error: ${err.message}`);
        }
        setLoading(false);
    };

    const loadZones = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations/zones`);
            const data = await res.json();
            if (data.status === 'success') {
                setZones(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const toggleExpand = (nodeId) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
        } else {
            newExpanded.add(nodeId);
        }
        setExpandedNodes(newExpanded);
    };

    // ============ GENERATOR LOGIC ============

    const generatePreview = () => {
        if (!generatorData.prefix) {
            setPreviewCodes([]);
            return;
        }

        const codes = [];
        const { prefix, start_number, end_number, suffix_type } = generatorData;

        for (let i = start_number; i <= Math.min(end_number, start_number + 99); i++) {
            let suffix = '';
            if (suffix_type === 'number') {
                suffix = String(i);
            } else if (suffix_type === 'alpha') {
                suffix = String.fromCharCode(64 + i); // A=1, B=2...
            } else if (suffix_type === 'roman') {
                suffix = toRoman(i);
            }
            codes.push(`${prefix}${suffix}`);
        }
        setPreviewCodes(codes);
    };

    const toRoman = (num) => {
        const romanMap = [
            ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
        ];
        let result = '';
        for (const [roman, val] of romanMap) {
            while (num >= val) {
                result += roman;
                num -= val;
            }
        }
        return result;
    };

    const handleGenerate = async () => {
        if (!generatorData.prefix) {
            showMessage('error', 'Prefix harus diisi');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prefix: generatorData.prefix,
                    start_number: generatorData.start_number,
                    end_number: generatorData.end_number,
                    max_capacity_per_slot: generatorData.max_capacity_per_slot,
                    zone: generatorData.parent_zone,
                    warehouse: generatorData.warehouse,
                    type: generatorData.type
                })
            });
            const data = await res.json();

            if (res.ok) {
                showMessage('success', `✅ ${data.message}`);
                setShowGenerator(false);
                loadTree();
            } else {
                showMessage('error', data.detail || 'Gagal generate');
            }
        } catch (err) {
            showMessage('error', err.message);
        }
    };

    // ============ SMART RECEIVING LOGIC ============

    const findBestSlots = async () => {
        if (!receivingData.zone_prefix || receivingData.quantity <= 0) {
            showMessage('error', 'Isi zona dan qty');
            return;
        }

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/locations/next-empty?zone_prefix=${encodeURIComponent(receivingData.zone_prefix)}`
            );
            const data = await res.json();

            if (data.status === 'success' && data.data) {
                // Get all slots for this zone to show auto-switching
                const allSlotsRes = await fetch(`${API_BASE_URL}/api/v1/locations?zone=${receivingData.zone_prefix}&limit=20`);
                const allSlots = await allSlotsRes.json();

                if (allSlots.status === 'success') {
                    // Simulate auto-switching logic
                    const recommendations = allSlots.data.map(slot => {
                        const current = slot.current_usage || 0;
                        const capacity = slot.capacity || 100;
                        const available = capacity - current;
                        const canFit = available >= receivingData.quantity;

                        return {
                            ...slot,
                            available,
                            canFit,
                            status: current >= capacity ? 'FULL' : (current > 0 ? 'PARTIAL' : 'EMPTY'),
                            percentFull: Math.round((current / capacity) * 100)
                        };
                    }).sort((a, b) => a.code.localeCompare(b.code));

                    setSlotRecommendations(recommendations);

                    // Auto-select first available
                    const firstAvailable = recommendations.find(s => s.canFit);
                    if (firstAvailable) {
                        setSelectedSlot(firstAvailable);
                    }
                }
            } else {
                showMessage('error', data.message || 'Tidak ditemukan slot kosong');
            }
        } catch (err) {
            showMessage('error', err.message);
        }
    };

    const handleSetFull = async (node) => {
        if (!confirm(`Set ${node.code} sebagai PENUH?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations/${node.id}/set-full`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Manual set by user' })
            });
            const data = await res.json();
            if (data.status === 'success') {
                showMessage('success', data.message);
                loadTree();
            }
        } catch (err) {
            showMessage('error', err.message);
        }
    };

    const handleSetEmpty = async (node) => {
        if (!confirm(`Reset ${node.code} menjadi KOSONG?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations/${node.id}/set-empty`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.status === 'success') {
                showMessage('success', data.message);
                loadTree();
            }
        } catch (err) {
            showMessage('error', err.message);
        }
    };

    const handleDeleteLocation = async (node) => {
        if (!confirm(`⚠️ HAPUS lokasi ${node.code}?\n\nLokasi akan dihapus permanen dari database.`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations/${node.code}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok) {
                showMessage('success', `✅ Lokasi ${node.code} berhasil dihapus`);
                loadTree();
            } else {
                showMessage('error', data.detail || 'Gagal menghapus lokasi');
            }
        } catch (err) {
            showMessage('error', err.message);
        }
    };

    // ============ TREE RENDERING ============

    const renderTreeNode = (node, depth = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes.has(node.id);
        const isSelected = selectedNode?.id === node.id;

        return (
            <div key={node.id} className="tree-node-container">
                <div
                    className={`tree-node ${isSelected ? 'selected' : ''}`}
                    style={{ paddingLeft: `${depth * 24 + 8}px` }}
                    onClick={() => setSelectedNode(node)}
                >
                    {hasChildren ? (
                        <button
                            className="tree-toggle"
                            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                        >
                            {isExpanded ? '▼' : '▶'}
                        </button>
                    ) : (
                        <span className="tree-toggle-placeholder">•</span>
                    )}

                    <span
                        className="status-dot"
                        style={{ backgroundColor: STATUS_COLORS[node.capacity_status] || STATUS_COLORS.EMPTY }}
                    ></span>

                    <span className="node-code">{node.code}</span>

                    {node.can_store_items && (
                        <span className="node-info">
                            {node.current_qty || 0}/{node.max_capacity || '∞'}
                        </span>
                    )}

                    {hasChildren && (
                        <span className="children-count">
                            ({node.children.length} slot)
                        </span>
                    )}

                    <div className="node-actions">
                        {!node.can_store_items && (
                            <button
                                className="action-btn add"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setGeneratorData({ ...generatorData, parent_zone: node.code, prefix: `${node.code}-` });
                                    setShowGenerator(true);
                                }}
                                title="Generate Slots"
                            >
                                +
                            </button>
                        )}
                        {node.can_store_items && node.capacity_status !== 'FULL' && (
                            <button
                                className="action-btn full"
                                onClick={(e) => { e.stopPropagation(); handleSetFull(node); }}
                                title="Set Penuh"
                            >
                                ⛔
                            </button>
                        )}
                        {node.capacity_status === 'FULL' && (
                            <button
                                className="action-btn empty"
                                onClick={(e) => { e.stopPropagation(); handleSetEmpty(node); }}
                                title="Reset Kosong"
                            >
                                ✅
                            </button>
                        )}
                        {node.can_store_items && (
                            <button
                                className="action-btn delete"
                                onClick={(e) => { e.stopPropagation(); handleDeleteLocation(node); }}
                                title="Hapus Lokasi"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="tree-children">
                        {node.children.map(child => renderTreeNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="rack-manager-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">📦 Rack Manager</h1>
                    <p className="page-subtitle">Kelola hierarki rak dan slot dinamis</p>
                </div>
                <div className="header-actions">
                    <Button variant="ghost" onClick={() => navigate('/inventory/map')}>
                        🗺️ Peta Rak
                    </Button>
                    <Button variant="secondary" onClick={() => setShowReceiving(true)}>
                        📥 Smart Receiving
                    </Button>
                    <Button variant="secondary" onClick={loadTree}>
                        🔄 Refresh
                    </Button>
                    <Button variant="primary" onClick={() => setShowGenerator(true)}>
                        ✨ Wizard Generator
                    </Button>
                </div>
            </div>

            {/* Toast */}
            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Main Content */}
            <div className="manager-layout">
                {/* Tree View */}
                <Card className="tree-card">
                    <h3>🌳 Hierarki Lokasi</h3>

                    {loading ? (
                        <div className="loading-state">Memuat...</div>
                    ) : treeData.length === 0 ? (
                        <div className="empty-state">
                            <p>Belum ada data lokasi</p>
                            <Button onClick={() => setShowGenerator(true)}>
                                Wizard Generator
                            </Button>
                        </div>
                    ) : (
                        <div className="tree-container">
                            {treeData.map(node => renderTreeNode(node))}
                        </div>
                    )}

                    {/* Legend */}
                    <div className="legend">
                        <span className="legend-item">
                            <span className="status-dot" style={{ backgroundColor: STATUS_COLORS.EMPTY }}></span>
                            Kosong
                        </span>
                        <span className="legend-item">
                            <span className="status-dot" style={{ backgroundColor: STATUS_COLORS.PARTIAL }}></span>
                            Terisi Sebagian
                        </span>
                        <span className="legend-item">
                            <span className="status-dot" style={{ backgroundColor: STATUS_COLORS.FULL }}></span>
                            Penuh
                        </span>
                    </div>
                </Card>

                {/* Detail Panel */}
                {selectedNode && (
                    <Card className="detail-panel">
                        <h3>📍 {selectedNode.code}</h3>
                        <div className="detail-info">
                            <div className="info-row">
                                <span>Status:</span>
                                <span className={`status-badge ${selectedNode.capacity_status?.toLowerCase()}`}>
                                    {selectedNode.capacity_status}
                                </span>
                            </div>
                            <div className="info-row">
                                <span>Dapat diisi:</span>
                                <span>{selectedNode.can_store_items ? 'Ya' : 'Tidak (Container)'}</span>
                            </div>
                            <div className="info-row">
                                <span>Kapasitas Max:</span>
                                <span>{selectedNode.max_capacity || '∞'}</span>
                            </div>
                            <div className="info-row">
                                <span>Terisi:</span>
                                <span>{selectedNode.current_qty || 0}</span>
                            </div>
                            <div className="info-row">
                                <span>Jumlah Slot:</span>
                                <span>{selectedNode.children?.length || 0}</span>
                            </div>
                        </div>

                        <div className="detail-actions">
                            {!selectedNode.can_store_items && (
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        setGeneratorData({ ...generatorData, parent_zone: selectedNode.code, prefix: `${selectedNode.code}-` });
                                        setShowGenerator(true);
                                    }}
                                >
                                    ➕ Tambah Slot
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                onClick={() => navigate(`/inventory?location=${selectedNode.code}`)}
                            >
                                📦 Lihat Isi
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            {/* ============ WIZARD GENERATOR MODAL ============ */}
            {showGenerator && (
                <div className="modal-overlay" onClick={() => setShowGenerator(false)}>
                    <div className="modal-content wizard-modal" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h2>✨ WIZARD GENERATOR RAK OTOMATIS</h2>
                            <button className="close-btn" onClick={() => setShowGenerator(false)}>✕</button>
                        </div>

                        <div className="wizard-body">
                            {/* Step 1: Parent Zone */}
                            <div className="wizard-step">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <label>LOGIKA RAK (Parent Zone)</label>
                                    <select
                                        value={generatorData.parent_zone}
                                        onChange={e => setGeneratorData({
                                            ...generatorData,
                                            parent_zone: e.target.value,
                                            prefix: e.target.value ? `${e.target.value}-` : ''
                                        })}
                                    >
                                        <option value="">-- Pilih Zone atau Buat Baru --</option>
                                        {zones.map(z => (
                                            <option key={z} value={z}>{z}</option>
                                        ))}
                                        <option value="NEW">➕ Zone Baru (Input Manual)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Step 2: Naming Pattern */}
                            <div className="wizard-step">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <label>FORMAT PENAMAAN (Naming Pattern)</label>
                                    <div className="pattern-row">
                                        <div className="pattern-field">
                                            <span className="field-label">Prefix (Awalan)</span>
                                            <input
                                                type="text"
                                                placeholder="Contoh: A1-, RAK-BESI-"
                                                value={generatorData.prefix}
                                                onChange={e => setGeneratorData({ ...generatorData, prefix: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                        <div className="pattern-field">
                                            <span className="field-label">Suffix (Akhiran)</span>
                                            <select
                                                value={generatorData.suffix_type}
                                                onChange={e => setGeneratorData({ ...generatorData, suffix_type: e.target.value })}
                                            >
                                                {SUFFIX_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Range */}
                            <div className="wizard-step">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <label>RENTANG (Range)</label>
                                    <div className="range-row">
                                        <div className="range-field">
                                            <span className="field-label">Mulai dari</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={generatorData.start_number}
                                                onChange={e => setGeneratorData({ ...generatorData, start_number: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                        <span className="range-separator">sampai</span>
                                        <div className="range-field">
                                            <span className="field-label">Berakhir di</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={generatorData.end_number}
                                                onChange={e => setGeneratorData({ ...generatorData, end_number: parseInt(e.target.value) || 10 })}
                                            />
                                        </div>
                                        <div className="range-field">
                                            <span className="field-label">Kapasitas/Slot</span>
                                            <input
                                                type="number"
                                                placeholder="Pcs"
                                                value={generatorData.max_capacity_per_slot || ''}
                                                onChange={e => setGeneratorData({ ...generatorData, max_capacity_per_slot: parseFloat(e.target.value) || null })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 4: Preview */}
                            <div className="wizard-step preview-step">
                                <div className="step-number">4</div>
                                <div className="step-content">
                                    <label>PREVIEW HASIL ({previewCodes.length} slots)</label>
                                    <div className="preview-grid">
                                        {previewCodes.slice(0, 20).map((code, i) => (
                                            <div key={i} className="preview-item">
                                                <span className="preview-check">✓</span>
                                                <span className="preview-code">{code}</span>
                                                <span className="preview-cap">(Kap: {generatorData.max_capacity_per_slot || '∞'})</span>
                                            </div>
                                        ))}
                                        {previewCodes.length > 20 && (
                                            <div className="preview-more">
                                                ... dan {previewCodes.length - 20} lagi
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="wizard-footer">
                            <Button variant="ghost" onClick={() => setShowGenerator(false)}>
                                Batal
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleGenerate}
                                disabled={previewCodes.length === 0}
                            >
                                🚀 GENERATE {previewCodes.length} SLOT SEKARANG
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ SMART RECEIVING MODAL ============ */}
            {showReceiving && (
                <div className="modal-overlay" onClick={() => setShowReceiving(false)}>
                    <div className="modal-content receiving-modal" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h2>📥 SMART RECEIVING (Auto-Switching)</h2>
                            <button className="close-btn" onClick={() => setShowReceiving(false)}>✕</button>
                        </div>

                        <div className="receiving-body">
                            {/* Input Section */}
                            <div className="receiving-input">
                                <div className="input-group">
                                    <label>Nama Item</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: FITTING HYDRAULIC JIC"
                                        value={receivingData.item_name}
                                        onChange={e => setReceivingData({ ...receivingData, item_name: e.target.value })}
                                    />
                                </div>
                                <div className="input-row">
                                    <div className="input-group">
                                        <label>Quantity (Pcs)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={receivingData.quantity || ''}
                                            onChange={e => setReceivingData({ ...receivingData, quantity: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Zone Prefix</label>
                                        <select
                                            value={receivingData.zone_prefix}
                                            onChange={e => setReceivingData({ ...receivingData, zone_prefix: e.target.value })}
                                        >
                                            <option value="">-- Pilih Zone --</option>
                                            {zones.map(z => (
                                                <option key={z} value={z}>{z}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <Button variant="primary" onClick={findBestSlots}>
                                    🔍 Cari Lokasi Optimal
                                </Button>
                            </div>

                            {/* Recommendations */}
                            {slotRecommendations.length > 0 && (
                                <div className="recommendations">
                                    <h4>REKOMENDASI LOKASI (AUTO-SWITCHING):</h4>
                                    <div className="slot-list">
                                        {slotRecommendations.map((slot, i) => (
                                            <div
                                                key={slot.id}
                                                className={`slot-item ${slot.canFit ? 'available' : 'full'} ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                                                onClick={() => slot.canFit && setSelectedSlot(slot)}
                                            >
                                                <span className="slot-num">{i + 1}.</span>
                                                <span className="slot-code">RAK {slot.code}</span>
                                                <span className={`slot-status ${slot.status.toLowerCase()}`}>
                                                    [Status: {slot.status} / {slot.percentFull}%]
                                                </span>
                                                <span className="slot-action">
                                                    {slot.canFit ? (
                                                        <span className="action-ok">→ PAKAI ✅</span>
                                                    ) : (
                                                        <span className="action-skip">→ SKIP ❌</span>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedSlot && (
                                        <div className="selected-result">
                                            <div className="result-label">LOKASI TERPILIH:</div>
                                            <div className="result-value">
                                                <strong>{selectedSlot.code}</strong>
                                                <span className="result-info">
                                                    (Sisa: {selectedSlot.available} pcs)
                                                </span>
                                            </div>
                                            <Button variant="success">
                                                ✅ Konfirmasi Penempatan
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
