import { useState, useEffect } from 'react';
import { getLocations, getBatches } from '../../services/wmsApi';
import Card from '../../components/common/Card/Card';
import './WarehouseMap.css';

export default function WarehouseMap() {
    const [locations, setLocations] = useState([]);
    const [loadingMap, setLoadingMap] = useState(false);

    // For when clicking a rack bin
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [binItems, setBinItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);

    useEffect(() => {
        loadMapData();
    }, []);

    const loadMapData = async () => {
        setLoadingMap(true);
        try {
            const res = await getLocations({});
            if (res.status === 'success') {
                setLocations(res.data || []);
            }
        } catch (error) {
            console.error(error);
        }
        setLoadingMap(false);
    };

    const handleLocationClick = async (loc) => {
        setSelectedLocation(loc);
        setLoadingItems(true);
        try {
            // We reuse getBatches but filter for the clicked location
            const res = await getBatches({ location_code: loc.code, available_only: true });
            if (res.status === 'success') {
                setBinItems(res.data || []);
            }
        } catch (error) {
            console.error(error);
        }
        setLoadingItems(false);
    };

    // Grouping logic for rendering: Zone -> Rack -> Bin
    const mapHierarchy = {};
    locations.forEach(loc => {
        const zone = loc.zone || 'UNKNOWN';
        const rack = loc.rack || 'FLOOR';

        if (!mapHierarchy[zone]) mapHierarchy[zone] = {};
        if (!mapHierarchy[zone][rack]) mapHierarchy[zone][rack] = [];

        mapHierarchy[zone][rack].push(loc);
    });

    return (
        <div className="warehouse-map-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🗺️ Peta Gudang</h1>
                    <p className="page-subtitle">Visualisasi tata letak rak dan lokasi barang</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={loadMapData}>
                        🔄 Refresh Peta
                    </button>
                </div>
            </div>

            <div className="map-layout">
                {/* LEFT: Map Visuals */}
                <div className="map-container">
                    {loadingMap ? (
                        <div className="loading-state">Membangun peta...</div>
                    ) : (
                        Object.entries(mapHierarchy).map(([zone, racks]) => (
                            <div key={zone} className="map-zone">
                                <h3 className="zone-title">ZONA: {zone}</h3>
                                <div className="racks-grid">
                                    {Object.entries(racks).map(([rack, bins]) => (
                                        <div key={rack} className="map-rack">
                                            <div className="rack-header">RAK {rack}</div>
                                            <div className="bins-container">
                                                {bins.map(bin => {
                                                    const isSelected = selectedLocation?.id === bin.id;
                                                    const isFull = bin.current_usage >= (bin.capacity || 100);

                                                    return (
                                                        <div
                                                            key={bin.id}
                                                            className={`map-bin ${isSelected ? 'selected' : ''} ${isFull ? 'full' : ''}`}
                                                            onClick={() => handleLocationClick(bin)}
                                                            title={bin.code}
                                                        >
                                                            {bin.level}-{bin.bin}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* RIGHT: Bin Details */}
                <div className="map-sidebar">
                    <Card className="bin-detail-card">
                        {!selectedLocation ? (
                            <div className="empty-selection">
                                👆 Klik pada kotak rak di peta untuk melihat isi lokasi tersebut.
                            </div>
                        ) : (
                            <div className="bin-info">
                                <h2>Lokasi: {selectedLocation.code}</h2>
                                <div className="bin-badges">
                                    <span className="badge zone">{selectedLocation.zone}</span>
                                    <span className="badge type">{selectedLocation.type.replace('_', ' ')}</span>
                                </div>

                                <h3 className="inventory-header">Barang di Lokasi Ini:</h3>
                                {loadingItems ? (
                                    <div className="loading-state">Memuat barang...</div>
                                ) : binItems.length === 0 ? (
                                    <div className="empty-state">Rak ini kosong.</div>
                                ) : (
                                    <ul className="bin-items-list">
                                        {binItems.map(item => (
                                            <li key={item.id} className="bin-item">
                                                <div className="item-main">
                                                    <strong>{item.barcode}</strong>
                                                    <span className="qty">{item.current_qty} {item.product?.unit || 'Pcs'}</span>
                                                </div>
                                                <div className="item-sub">
                                                    {item.product?.sku}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
