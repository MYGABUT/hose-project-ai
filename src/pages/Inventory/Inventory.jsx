/**
 * Inventory Management - Stock Rolls & Remnants
 * With API Integration, Add Roll Modal, and Excel-Style Combo Inputs
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import Modal from '../../components/common/Modal/Modal';
import './Inventory.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

// ============ Excel-Style Combo Input Component ============
function ComboInput({
    value,
    onChange,
    options,
    placeholder,
    displayKey = 'name',
    valueKey = 'id',
    onAddNew,
    addNewLabel = 'Tambah Baru'
}) {
    const [inputValue, setInputValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState(options);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        // Update input display when value changes
        if (value) {
            const selected = options.find(o => String(o[valueKey]) === String(value));
            if (selected) {
                setInputValue(typeof displayKey === 'function' ? displayKey(selected) : selected[displayKey]);
            }
        } else {
            setInputValue('');
        }
    }, [value, options]);

    useEffect(() => {
        // Filter options based on input
        const filtered = options.filter(o => {
            const display = typeof displayKey === 'function' ? displayKey(o) : o[displayKey];
            return display?.toLowerCase().includes(inputValue.toLowerCase());
        });
        setFilteredOptions(filtered);
    }, [inputValue, options]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onChange(option[valueKey]);
        setInputValue(typeof displayKey === 'function' ? displayKey(option) : option[displayKey]);
        setShowDropdown(false);
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        setShowDropdown(true);
        // Clear selection if typing
        if (value) {
            onChange('');
        }
    };

    const handleAddNew = () => {
        if (onAddNew && inputValue.trim()) {
            onAddNew(inputValue.trim());
            setShowDropdown(false);
        }
    };

    const showAddOption = inputValue.trim() &&
        !filteredOptions.some(o => {
            const display = typeof displayKey === 'function' ? displayKey(o) : o[displayKey];
            return display?.toLowerCase() === inputValue.toLowerCase();
        });

    return (
        <div className="combo-input-wrapper">
            <input
                ref={inputRef}
                type="text"
                className="combo-input"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setShowDropdown(true)}
                placeholder={placeholder}
            />
            <span className="combo-arrow">▼</span>

            {showDropdown && (
                <div ref={dropdownRef} className="combo-dropdown">
                    {filteredOptions.length === 0 && !showAddOption && (
                        <div className="combo-empty">Tidak ada hasil</div>
                    )}

                    {filteredOptions.slice(0, 10).map((option) => (
                        <div
                            key={option[valueKey]}
                            className={`combo-option ${String(option[valueKey]) === String(value) ? 'selected' : ''}`}
                            onClick={() => handleSelect(option)}
                        >
                            {typeof displayKey === 'function' ? displayKey(option) : option[displayKey]}
                        </div>
                    ))}

                    {showAddOption && onAddNew && (
                        <div className="combo-add-new" onClick={handleAddNew}>
                            ➕ {addNewLabel}: <strong>{inputValue}</strong>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============ Main Component ============
export default function Inventory() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const locationFilter = searchParams.get('location');

    const [activeTab, setActiveTab] = useState('rolls');
    const [loading, setLoading] = useState(true);
    const [rollsData, setRollsData] = useState([]);
    const [zones, setZones] = useState([]);
    const [selectedZone, setSelectedZone] = useState(locationFilter || '');

    // Add Roll Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [newRoll, setNewRoll] = useState({
        product_id: '',
        batch_number: '',
        location_id: '',
        initial_qty: '',
        unit: 'meter',
        source: 'RECEIVING',
        source_reference: '',
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Unit display toggle (meter vs roll)
    const [unitDisplay, setUnitDisplay] = useState('meter'); // 'meter' or 'roll'

    // Helper to format qty with conversion
    const formatQty = (qty, product) => {
        // Default values for conversion (1 ROLL = 50 METER for hoses)
        const altUnit = product?.alt_unit || 'ROLL';
        const conversionFactor = product?.conversion_factor || 50;

        if (unitDisplay === 'roll' && conversionFactor > 0) {
            const rollQty = qty / conversionFactor;
            return `${rollQty.toFixed(2)} ${altUnit}`;
        }
        return `${qty}m`;
    };

    const formatQtyDual = (qty, product) => {
        const altUnit = product?.alt_unit || 'ROLL';
        const conversionFactor = product?.conversion_factor || 50;
        const rollQty = conversionFactor > 0 ? qty / conversionFactor : 0;

        if (unitDisplay === 'roll') {
            return `${rollQty.toFixed(1)} ${altUnit} (${qty}m)`;
        }
        return `${qty}m (${rollQty.toFixed(1)} ${altUnit})`;
    };

    useEffect(() => {
        loadData();
        loadProducts();
        loadLocations();
    }, [selectedZone]);

    const loadData = async () => {
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/api/v1/batches?limit=200`;
            if (selectedZone) {
                url += `&zone=${encodeURIComponent(selectedZone)}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            if (data.status === 'success') {
                // Filter ONLY HOSE products - exclude FITTING/CONNECTOR/ADAPTER/ACCESSORY
                const hoseOnly = (data.data || []).filter(b => {
                    const category = b.product_category?.toUpperCase();
                    // Exclude FITTING categories
                    if (category === 'FITTING' || category === 'CONNECTOR' ||
                        category === 'ADAPTER' || category === 'ACCESSORY') {
                        return false;
                    }
                    // Also exclude by SKU/name pattern
                    if (b.product_sku?.toUpperCase().startsWith('FIT-') ||
                        b.product_name?.toLowerCase().includes('elbow') ||
                        b.product_name?.toLowerCase().includes('nipple') ||
                        b.product_name?.toLowerCase().includes('coupler') ||
                        b.product_name?.toLowerCase().includes('adapter')) {
                        return false;
                    }
                    return true;
                });
                setRollsData(hoseOnly);
            }

            // Load zones
            const zRes = await fetch(`${API_BASE_URL}/api/v1/locations/zones`);
            const zData = await zRes.json();
            if (zData.status === 'success') {
                setZones(zData.data || []);
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Gagal memuat data' });
        }
        setLoading(false);
    };

    const loadProducts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/products?limit=200`);
            const data = await res.json();
            if (data.status === 'success') {
                // Filter only HOSE products for the dropdown
                const hoseProducts = (data.data || []).filter(p => {
                    const cat = p.category?.toUpperCase();
                    return cat === 'HOSE' || cat === 'ASSEMBLY' || !cat;
                });
                setProducts(hoseProducts);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadLocations = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations?limit=200`);
            const data = await res.json();
            if (data.status === 'success') {
                setLocations(data.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const generateBatchNumber = () => {
        const date = new Date();
        const y = date.getFullYear().toString().slice(-2);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ROLL-${y}${m}${d}-${r}`;
    };

    // ============ Add New Product (Excel-style) ============
    const handleAddNewProduct = async (productName) => {
        try {
            // Auto-generate SKU: extract first word as brand guess
            const words = productName.split(' ');
            const brand = words[0]?.toUpperCase() || 'GEN';
            const category = 'HOSE';

            const res = await fetch(`${API_BASE_URL}/api/v1/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: productName,
                    brand: brand,
                    category: category,
                    unit: 'METER'
                })
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                // Add to local list and select it
                const newProduct = data.data;
                setProducts(prev => [...prev, newProduct]);
                setNewRoll(prev => ({ ...prev, product_id: newProduct.id }));
                setMessage({ type: 'success', text: `✅ Produk "${productName}" ditambahkan dengan kode ${newProduct.sku}` });
            } else {
                setMessage({ type: 'error', text: data.detail || 'Gagal menambah produk' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    // ============ Add New Location (Excel-style) ============
    const handleAddNewLocation = async (locationCode) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: locationCode.toUpperCase(),
                    warehouse: 'MAIN',
                    zone: 'GENERAL',
                    type: 'HOSE_RACK',
                    capacity: 100
                })
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                // Add to local list and select it
                const newLocation = data.data;
                setLocations(prev => [...prev, newLocation]);
                setNewRoll(prev => ({ ...prev, location_id: newLocation.id }));
                setMessage({ type: 'success', text: `✅ Lokasi "${locationCode}" ditambahkan` });
            } else {
                setMessage({ type: 'error', text: data.detail || 'Gagal menambah lokasi' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    const handleAddRoll = async () => {
        if (!newRoll.product_id || !newRoll.initial_qty || !newRoll.location_id) {
            setMessage({ type: 'error', text: 'Produk, qty, dan lokasi harus diisi' });
            return;
        }

        setSaving(true);
        try {
            // Get location code from id
            const selectedLocation = locations.find(l => String(l.id) === String(newRoll.location_id));
            const locationCode = selectedLocation?.code || '';

            // Handle unit conversion (Roll -> Meter)
            let finalQty = parseFloat(newRoll.initial_qty);
            const selectedProduct = products.find(p => String(p.id) === String(newRoll.product_id));

            if (newRoll.unit === 'roll') {
                const conversion = selectedProduct?.conversion_factor || 50; // Default 50m if not set
                finalQty = finalQty * conversion;
                console.log(`🔄 Converting ${newRoll.initial_qty} Roll -> ${finalQty} Meter (Factor: ${conversion})`);
            }

            // Use /batches/inbound endpoint with correct BatchInbound schema
            const payload = {
                product_id: parseInt(newRoll.product_id),
                batch_number: newRoll.batch_number || generateBatchNumber(),
                location_code: locationCode,
                quantity: finalQty,
                source_type: newRoll.source || 'MANUAL',
                source_reference: newRoll.source_reference || null,
                received_by: 'system'
            };

            const res = await fetch(`${API_BASE_URL}/api/v1/batches/inbound`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: `✅ ${data.message || 'Roll berhasil ditambahkan'}` });
                setShowAddModal(false);
                setNewRoll({
                    product_id: '',
                    batch_number: '',
                    location_id: '',
                    initial_qty: '',
                    unit: 'meter',
                    source: 'RECEIVING',
                    source_reference: '',
                });
                loadData();
            } else {
                setMessage({ type: 'error', text: data.detail || 'Gagal menambah roll' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
        setSaving(false);
    };

    // Auto-hide message
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const usableRemnants = rollsData.filter(r => r.current_qty > 0 && r.current_qty < 5);
    const activeRolls = rollsData.filter(r => r.current_qty >= 5);

    return (
        <div className="inventory-page">
            {/* Toast */}
            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">📦 Stok Rolls</h1>
                    <p className="page-subtitle">Manajemen stok gulungan hose dan sisa potongan</p>
                </div>
                <div className="header-actions">
                    {/* Unit Toggle */}
                    <div className="unit-toggle">
                        <span className="toggle-label">Tampilan:</span>
                        <button
                            className={`toggle-btn ${unitDisplay === 'meter' ? 'active' : ''}`}
                            onClick={() => setUnitDisplay('meter')}
                        >
                            📏 Meter
                        </button>
                        <button
                            className={`toggle-btn ${unitDisplay === 'roll' ? 'active' : ''}`}
                            onClick={() => setUnitDisplay('roll')}
                        >
                            📦 Roll
                        </button>
                    </div>
                    <select
                        className="zone-filter"
                        value={selectedZone}
                        onChange={e => setSelectedZone(e.target.value)}
                    >
                        <option value="">Semua Zone</option>
                        {zones.map(z => (
                            <option key={z} value={z}>{z}</option>
                        ))}
                    </select>
                    <Button variant="secondary" onClick={loadData}>
                        🔄 Refresh
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/inventory/map')}>
                        🗺️ Peta Rak
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/inventory/racks')}>
                        📊 Kelola Rak
                    </Button>
                    <Button variant="primary" onClick={() => setShowAddModal(true)}>
                        ➕ Tambah Roll Baru
                    </Button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'rolls' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rolls')}
                >
                    📦 Roll Utuh ({activeRolls.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'remnants' ? 'active' : ''}`}
                    onClick={() => setActiveTab('remnants')}
                >
                    ✂️ Sisa/Remnant ({usableRemnants.length})
                </button>
            </div>

            {loading ? (
                <div className="loading-state">Memuat data...</div>
            ) : (
                <>
                    {/* Rolls Tab */}
                    {activeTab === 'rolls' && (
                        <div className="rolls-grid">
                            {activeRolls.length === 0 ? (
                                <Card className="empty-card">
                                    <p>Belum ada data roll</p>
                                    <Button onClick={() => setShowAddModal(true)}>
                                        ➕ Tambah Roll Pertama
                                    </Button>
                                </Card>
                            ) : (
                                activeRolls.map((roll) => {
                                    const isLow = roll.current_qty < 10;

                                    return (
                                        <Card key={roll.id} className="roll-card">
                                            <div className="roll-header">
                                                <span className="roll-id">{roll.batch_number}</span>
                                                <StatusBadge status={isLow ? 'warning' : 'ok'} size="sm" />
                                            </div>
                                            <div className="roll-body">
                                                <h3 className="roll-name">{roll.product_name || 'Unknown Product'}</h3>
                                                <div className="roll-location">
                                                    📍 {roll.location_code || '-'}
                                                </div>
                                                <div className="roll-meter">
                                                    <div className="meter-header">
                                                        <span>Sisa</span>
                                                        <span className="meter-value">
                                                            {formatQtyDual(roll.current_qty, roll)} / {formatQtyDual(roll.initial_qty, roll)}
                                                        </span>
                                                    </div>
                                                    <div className="meter-bar">
                                                        <div
                                                            className="meter-fill"
                                                            style={{
                                                                width: `${(roll.current_qty / roll.initial_qty) * 100}%`,
                                                                backgroundColor: isLow ? 'var(--color-danger)' : 'var(--color-success)'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Remnants Tab */}
                    {activeTab === 'remnants' && (
                        <div className="remnants-section">
                            <div className="remnants-summary">
                                <div className="summary-item">
                                    <span className="summary-value">{usableRemnants.length}</span>
                                    <span className="summary-label">Sisa Potongan</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-value">
                                        {usableRemnants.reduce((sum, r) => sum + (r.current_qty || 0), 0).toFixed(1)}m
                                    </span>
                                    <span className="summary-label">Total Panjang</span>
                                </div>
                            </div>

                            <div className="remnants-list">
                                {usableRemnants.length === 0 ? (
                                    <p className="empty-text">Tidak ada sisa potongan</p>
                                ) : (
                                    usableRemnants.map((remnant) => (
                                        <div key={remnant.id} className="remnant-item">
                                            <div className="remnant-info">
                                                <div className="remnant-id">{remnant.batch_number}</div>
                                                <div className="remnant-spec">{remnant.product_name}</div>
                                                <div className="remnant-meta">
                                                    📍 {remnant.location_code}
                                                </div>
                                            </div>
                                            <div className="remnant-length">
                                                <span className="length-value">{remnant.current_qty}m</span>
                                            </div>
                                            <div className="remnant-actions">
                                                <Button variant="primary" size="sm">Pakai</Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Add Roll Modal - Excel Style Combo Inputs */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="➕ Tambah Roll Baru"
                size="md"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowAddModal(false)} disabled={saving}>
                            Batal
                        </Button>
                        <Button variant="primary" onClick={handleAddRoll} disabled={saving}>
                            {saving ? 'Menyimpan...' : '💾 Simpan'}
                        </Button>
                    </>
                }
            >
                <div className="add-roll-form">
                    {/* Excel-Style Product Combo */}
                    <div className="form-group">
                        <label>Produk * <span className="hint">(ketik untuk cari atau tambah baru)</span></label>
                        <ComboInput
                            value={newRoll.product_id}
                            onChange={(val) => setNewRoll({ ...newRoll, product_id: val })}
                            options={products}
                            displayKey={(p) => `${p.name} (${p.sku})`}
                            valueKey="id"
                            placeholder="Ketik nama produk..."
                            onAddNew={handleAddNewProduct}
                            addNewLabel="Tambah Produk"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>No. Batch</label>
                            <input
                                type="text"
                                placeholder="Auto-generate jika kosong"
                                value={newRoll.batch_number}
                                onChange={e => setNewRoll({ ...newRoll, batch_number: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Jumlah (Qty) *</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="Contoh: 50"
                                value={newRoll.initial_qty}
                                onChange={e => setNewRoll({ ...newRoll, initial_qty: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Satuan</label>
                            <select
                                value={newRoll.unit}
                                onChange={e => setNewRoll({ ...newRoll, unit: e.target.value })}
                            >
                                <option value="meter">Meter</option>
                                <option value="pcs">Pcs</option>
                                <option value="roll">Roll</option>
                                <option value="kg">Kg</option>
                            </select>
                        </div>
                        {/* Excel-Style Location Combo */}
                        <div className="form-group">
                            <label>Lokasi * <span className="hint">(ketik untuk cari atau tambah baru)</span></label>
                            <ComboInput
                                value={newRoll.location_id}
                                onChange={(val) => setNewRoll({ ...newRoll, location_id: val })}
                                options={locations}
                                displayKey="code"
                                valueKey="id"
                                placeholder="Ketik kode lokasi..."
                                onAddNew={handleAddNewLocation}
                                addNewLabel="Tambah Lokasi"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Sumber</label>
                            <select
                                value={newRoll.source}
                                onChange={e => setNewRoll({ ...newRoll, source: e.target.value })}
                            >
                                <option value="RECEIVING">Penerimaan (Receiving)</option>
                                <option value="PRODUCTION">Produksi</option>
                                <option value="TRANSFER">Transfer</option>
                                <option value="ADJUSTMENT">Adjustment</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Referensi</label>
                            <input
                                type="text"
                                placeholder="No. PO / GRN"
                                value={newRoll.source_reference}
                                onChange={e => setNewRoll({ ...newRoll, source_reference: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
