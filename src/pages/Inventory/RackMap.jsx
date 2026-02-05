/**
 * Visual Rack Map - Bird's eye view of warehouse
 * Interactive rack visualization with color-coded occupancy
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import './RackMap.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

const COLOR_MAP = {
    empty: { bg: '#f3f4f6', border: '#d1d5db', label: 'Kosong' },
    low: { bg: '#dcfce7', border: '#86efac', label: '< 30%' },
    medium: { bg: '#fef3c7', border: '#fcd34d', label: '30-70%' },
    high: { bg: '#fed7aa', border: '#fb923c', label: '70-90%' },
    full: { bg: '#fecaca', border: '#f87171', label: '> 90%' },
};

export default function RackMap() {
    const navigate = useNavigate();
    const [mapData, setMapData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedZone, setSelectedZone] = useState(null);
    const [selectedCell, setSelectedCell] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // grid or list

    useEffect(() => {
        loadMapData();
    }, []);

    const loadMapData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/locations/rack-map`);
            const result = await response.json();
            if (result.status === 'success') {
                setMapData(result.data);
                // Auto-select first zone
                const zones = Object.keys(result.data.zones);
                if (zones.length > 0 && !selectedZone) {
                    setSelectedZone(zones[0]);
                }
            }
        } catch (err) {
            console.error('Load map error:', err);
        }
        setLoading(false);
    };

    const handleCellClick = (cell) => {
        setSelectedCell(selectedCell?.id === cell.id ? null : cell);
    };

    const getZoneGrid = (zoneData) => {
        if (!zoneData || zoneData.length === 0) return [];

        // Find grid dimensions
        let maxRow = 0, maxCol = 0;
        zoneData.forEach(loc => {
            if (loc.position.row > maxRow) maxRow = loc.position.row;
            if (loc.position.col > maxCol) maxCol = loc.position.col;
        });

        // Create grid
        const grid = [];
        for (let row = 0; row <= maxRow; row++) {
            const rowData = [];
            for (let col = 0; col <= maxCol; col++) {
                const cell = zoneData.find(
                    loc => loc.position.row === row && loc.position.col === col
                );
                rowData.push(cell || null);
            }
            grid.push(rowData);
        }
        return grid;
    };

    if (loading) {
        return (
            <div className="rack-map-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Memuat peta gudang...</p>
                </div>
            </div>
        );
    }

    const zones = mapData ? Object.keys(mapData.zones) : [];
    const currentZoneData = selectedZone ? mapData.zones[selectedZone] : [];
    const grid = getZoneGrid(currentZoneData);

    return (
        <div className="rack-map-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">🗺️ Visual Rack Map</h1>
                    <p className="page-subtitle">Denah gudang interaktif</p>
                </div>
                <Button variant="secondary" onClick={loadMapData}>
                    🔄 Refresh
                </Button>
                <Button variant="primary" onClick={() => navigate('/inventory/racks')}>
                    ⚙️ Kelola Rak
                </Button>
            </div>

            {/* Summary Cards */}
            {mapData && (
                <div className="summary-cards">
                    <div className="summary-card total">
                        <span className="summary-value">{mapData.total_locations}</span>
                        <span className="summary-label">Total Lokasi</span>
                    </div>
                    {Object.entries(COLOR_MAP).map(([key, val]) => (
                        <div key={key} className={`summary-card ${key}`}>
                            <span className="summary-value">{mapData.summary[key]}</span>
                            <span className="summary-label">{val.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Zone Selector */}
            {zones.length > 0 && (
                <div className="zone-selector">
                    <span className="zone-label">Zone:</span>
                    {zones.map(zone => (
                        <button
                            key={zone}
                            className={`zone-btn ${selectedZone === zone ? 'active' : ''}`}
                            onClick={() => setSelectedZone(zone)}
                        >
                            {zone}
                            <span className="zone-count">
                                ({mapData.zones[zone].length})
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Main Content */}
            <div className="map-container">
                {/* Grid View */}
                <Card className="grid-card">
                    <div className="grid-header">
                        <h3>{selectedZone || 'Select Zone'}</h3>
                        <div className="view-toggle">
                            <button
                                className={viewMode === 'grid' ? 'active' : ''}
                                onClick={() => setViewMode('grid')}
                            >
                                Grid
                            </button>
                            <button
                                className={viewMode === 'list' ? 'active' : ''}
                                onClick={() => setViewMode('list')}
                            >
                                List
                            </button>
                        </div>
                    </div>

                    {viewMode === 'grid' ? (
                        <div className="rack-grid">
                            {grid.map((row, rowIdx) => (
                                <div key={rowIdx} className="grid-row">
                                    <span className="row-label">{String.fromCharCode(65 + rowIdx)}</span>
                                    {row.map((cell, colIdx) => (
                                        <div
                                            key={colIdx}
                                            className={`grid-cell ${cell ? cell.color : 'placeholder'} ${selectedCell?.id === cell?.id ? 'selected' : ''
                                                }`}
                                            style={cell ? {
                                                backgroundColor: COLOR_MAP[cell.color].bg,
                                                borderColor: COLOR_MAP[cell.color].border
                                            } : undefined}
                                            onClick={() => cell && handleCellClick(cell)}
                                        >
                                            {cell && (
                                                <>
                                                    <span className="cell-code">{cell.code}</span>
                                                    <span className="cell-pct">{cell.occupancy_pct}%</span>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {/* Column labels */}
                            <div className="grid-row col-labels">
                                <span className="row-label"></span>
                                {grid[0]?.map((_, colIdx) => (
                                    <span key={colIdx} className="col-label">{colIdx + 1}</span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="rack-list">
                            {currentZoneData.map(loc => (
                                <div
                                    key={loc.id}
                                    className={`list-item ${loc.color} ${selectedCell?.id === loc.id ? 'selected' : ''
                                        }`}
                                    onClick={() => handleCellClick(loc)}
                                >
                                    <span className="list-code">{loc.code}</span>
                                    <div className="list-bar">
                                        <div
                                            className="list-bar-fill"
                                            style={{
                                                width: `${loc.occupancy_pct}%`,
                                                backgroundColor: COLOR_MAP[loc.color].border
                                            }}
                                        ></div>
                                    </div>
                                    <span className="list-pct">{loc.occupancy_pct}%</span>
                                    <span className="list-qty">{loc.current_qty}m</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Detail Panel */}
                {selectedCell && (
                    <Card className="detail-panel">
                        <div className="detail-header">
                            <h3>{selectedCell.code}</h3>
                            <button
                                className="close-btn"
                                onClick={() => setSelectedCell(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="detail-body">
                            {/* Quick Stats */}
                            <div className="occupancy-visual">
                                <div className="occupancy-ring">
                                    <svg viewBox="0 0 36 36" className="circular-chart">
                                        <path
                                            className="circle-bg"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path
                                            className="circle-fill"
                                            style={{
                                                stroke: COLOR_MAP[selectedCell.color]?.border || '#ccc',
                                                strokeDasharray: `${selectedCell.occupancy_pct}, 100`
                                            }}
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <span className="occupancy-text">{selectedCell.occupancy_pct}%</span>
                                </div>
                            </div>

                            {/* Batch List Section */}
                            <div className="batch-list-section" style={{ marginTop: '1rem' }}>
                                <h4>📦 Isi Rak ({selectedCell.item_count} Items)</h4>
                                <RackBatchList locationCode={selectedCell.code} />
                            </div>

                            <div className="detail-info" style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                <div className="info-row">
                                    <span className="info-label">Kapasitas</span>
                                    <span className="info-value">{selectedCell.capacity}m</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Terisi</span>
                                    <span className="info-value">{selectedCell.current_qty}m</span>
                                </div>
                            </div>

                            <Button
                                variant="primary"
                                className="detail-btn"
                                onClick={() => window.location.href = `/inventory?location=${selectedCell.code}`}
                            >
                                🔍 Lihat Selengkapnya
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            {/* Legend */}
            <div className="legend">
                {/* ... existing legend ... */}
                <span className="legend-title">Legenda:</span>
                {Object.entries(COLOR_MAP).map(([key, val]) => (
                    <div key={key} className="legend-item">
                        <span
                            className="legend-color"
                            style={{ backgroundColor: val.bg, borderColor: val.border }}
                        ></span>
                        <span className="legend-label">{val.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Sub-component to fetch and display batches dynamically
function RackBatchList({ locationCode }) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!locationCode) return;

        async function fetchContent() {
            setLoading(true);
            try {
                // Dynamically import API to avoid circular deps if any
                const { getBatches } = await import('../../services/wmsApi');
                const res = await getBatches({
                    location_code: locationCode,
                    limit: 5, // Only show top 5 in mini-view
                    available_only: true
                });
                setBatches(res.data || []);
            } catch (err) {
                console.error("Failed to load rack content", err);
            }
            setLoading(false);
        }

        fetchContent();
    }, [locationCode]);

    if (loading) return <div style={{ fontSize: '0.9rem', color: '#666' }}>Memuat data...</div>;
    if (batches.length === 0) return <div style={{ fontSize: '0.9rem', color: '#888', fontStyle: 'italic' }}>Tidak ada item (Kosong)</div>;

    return (
        <div className="mini-batch-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {batches.map(b => (
                <div key={b.id} style={{
                    padding: '8px',
                    borderBottom: '1px solid #eee',
                    fontSize: '0.85rem'
                }}>
                    <div style={{ fontWeight: '600' }}>{b.batch_number}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                        <span>{b.product?.sku || 'Unknown Product'}</span>
                        <span>{b.current_qty} {b.product?.unit || 'Units'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem' }}>
                        <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: b.status === 'AVAILABLE' ? '#dcfce7' : '#fee2e2',
                            color: b.status === 'AVAILABLE' ? '#166534' : '#991b1b'
                        }}>
                            {b.status}
                        </span>
                        <span style={{ color: '#888' }}>
                            In: {new Date(b.created_at).toLocaleDateString('id-ID')}
                        </span>
                    </div>
                </div>
            ))}
            {batches.length >= 5 && (
                <div style={{ textAlign: 'center', fontSize: '0.8rem', padding: '5px', color: '#666' }}>
                    ...dan lainnya
                </div>
            )}
        </div>
    );
}
