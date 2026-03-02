import { useState, useEffect } from 'react';
import Button from '../../common/Button/Button';
import { receiveBatch, getLocations, uploadBatchImage } from '../../../services/wmsApi';
import { resizeImage } from '../../../utils/imageUtils';
import './HoseDataForm.css';

// Brand list from dataset
const BRANDS = [
    'EATON', 'YOKOHAMA', 'PARKER', 'MANULI', 'GATES', 'OLWEG',
    'BRIDGESTONE', 'CENTAUR', 'CONTITECH', 'DUNLOP', 'FLEXTRAL',
    'KURIYAMA', 'MOELLER', 'RYCO', 'SEMPERIT', 'ALFAGOMMA', 'AEROQUIP', 'HYDRAULINK'
];

// Product Categories
const CATEGORIES = ['Hose', 'Fitting', 'Adaptor', 'Ferrule', 'Valve', 'Coupling', 'Lainnya'];

// Standard types
const STANDARDS = ['R1', 'R2', 'R12', 'R13', 'R15', '1SN', '2SN', '4SP', '4SH'];

// Size options (inches)
const SIZES = ['1/4', '3/8', '1/2', '5/8', '3/4', '1', '1-1/4', '1-1/2', '2'];

// DN sizes
const DN_SIZES = ['DN6', 'DN8', 'DN10', 'DN12', 'DN16', 'DN19', 'DN25', 'DN32', 'DN38', 'DN50'];

// Wire types
const WIRE_TYPES = ['1 Wire Braid', '2 Wire Braid', '4 Wire Spiral', '6 Wire Spiral'];

// Dynamic Component Options
const THREAD_TYPES = ['JIC 37°', 'BSPP', 'BSPT', 'NPT', 'ORFS', 'Metric', 'SAE ORB', 'JIS'];
const SEAL_TYPES = ['O-Ring', 'Tapered', 'Flat Face', 'Metal to Metal', 'Bonded Seal'];
const CONFIGURATIONS = ['Straight (Lurus)', '45° Elbow', '90° Elbow', 'Tee', 'Cross', 'Plug/Cap'];

export default function HoseDataForm({
    isOpen,
    onClose,
    onConfirm,
    aiDetectionData = {},
    mode = 'ai' // 'ai' = prefilled from AI, 'manual' = empty form
}) {
    const [formData, setFormData] = useState({
        // Basic Info
        category: 'Hose',
        brand: '',
        tipeHose: '',
        standard: '',

        // Size
        sizeInch: '',
        sizeDN: '',
        hoseODmm: '',
        hoseIDmm: '',

        // Pressure
        workingPressureBar: '',
        workingPressurePsi: '',
        burstPressureBar: '',
        burstPressurePsi: '',

        // Other specs
        temperatureRange: '-40°C to +100°C',
        bendRadiusMm: '',
        wireType: '',

        // Dynamic Specs (Fittings, Adaptors etc)
        threadType: '',
        threadSize: '',
        sealType: '',
        configuration: '',

        // Quantity
        isCutPiece: false,
        cutLengthCm: '',
        lengthMeter: '',
        quantity: '1',

        // Location
        location: 'WH1-STAGING-IN',
        notes: ''
    });

    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [locations, setLocations] = useState([]);
    const [useManualLocation, setUseManualLocation] = useState(false);
    const [useManualBrand, setUseManualBrand] = useState(false);

    // Fetch locations when form opens
    useEffect(() => {
        if (isOpen) {
            // Fetch all locations (HOSE_RACK and FITTING_BIN)
            getLocations({}).then(result => {
                if (result.status === 'success' && result.data) {
                    setLocations(result.data);
                }
            });
        }
    }, [isOpen]);

    // Prefill from AI detection
    useEffect(() => {
        if (isOpen && aiDetectionData && mode === 'ai') {
            setFormData(prev => ({
                ...prev,
                category: mode === 'ai' ? 'Hose' : prev.category,
                brand: aiDetectionData.brand || '',
                tipeHose: aiDetectionData.sku || aiDetectionData.STD || '',
                standard: aiDetectionData.STD || '',
                sizeInch: aiDetectionData.SIZE || aiDetectionData.size_inch || '',
                workingPressureBar: aiDetectionData.pressure_bar || '',
                workingPressurePsi: aiDetectionData.pressure_psi || '',
                notes: aiDetectionData.raw_text_sample ? `OCR: ${aiDetectionData.raw_text_sample.substring(0, 100)}` : ''
            }));
        }
        // Reset errors when opening
        setSaveError(null);
    }, [isOpen, aiDetectionData, mode]);

    // Auto-calculate PSI from BAR
    useEffect(() => {
        if (formData.workingPressureBar && !formData.workingPressurePsi) {
            const psi = Math.round(parseFloat(formData.workingPressureBar) * 14.5038);
            if (!isNaN(psi)) {
                setFormData(prev => ({ ...prev, workingPressurePsi: String(psi) }));
            }
        }
    }, [formData.workingPressureBar]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when field is edited
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.brand) newErrors.brand = 'Brand wajib diisi';
        if (formData.category === 'Hose') {
            if (!formData.standard && !formData.tipeHose) newErrors.standard = 'Standard/Tipe wajib diisi';
            if (formData.isCutPiece) {
                if (!formData.cutLengthCm) newErrors.cutLengthCm = 'Panjang Potongan wajib diisi';
            } else {
                if (!formData.lengthMeter) newErrors.lengthMeter = 'Panjang (meter) wajib diisi';
            }
        }

        if (['Adaptor', 'Fitting', 'Coupling'].includes(formData.category)) {
            if (!formData.tipeHose && !formData.threadType && !formData.threadSize) {
                newErrors.tipeHose = 'Tipe / Part Number atau Spek Ulir wajib diisi';
            }
        }

        if (formData.category === 'Hose' && !formData.sizeInch && !formData.sizeDN && !formData.tipeHose) {
            newErrors.sizeInch = 'Ukuran atau tipe wajib diisi';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        // Generate barcode client-side
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHmmss
        const outputBarcode = `BATCH-${timestamp}`;

        // Prepare data for parent
        const batchData = {
            ...formData,
            barcode: outputBarcode,
            // Build location code from location field
            location: formData.location || 'WH1-STAGING-IN',
            // Source tracking
            source: mode === 'ai' ? 'AI_SCANNER' : 'MANUAL',
            confidence: aiDetectionData?.confidence,
            // Notes from OCR
            notes: formData.notes || aiDetectionData?.raw_text_sample,
            // Pass images too
            raw_images: aiDetectionData?.raw_images || []
        };

        // Pass to parent immediately without saving to API
        onConfirm(batchData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="hose-form-overlay">
            <div className="hose-form-modal">
                <div className="hose-form-header">
                    <div className="header-info">
                        <h2>{mode === 'ai' ? '📝 Lengkapi Data Hose' : '➕ Entry Manual'}</h2>
                        {mode === 'ai' && (
                            <span className="ai-badge">🤖 Data dari AI Detection</span>
                        )}
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="hose-form-content">
                    {/* Section: Brand & Type */}
                    <div className="form-section">
                        <h3>🏷️ Identitas Barang</h3>
                        <div className="form-row">
                            <div className="form-group full-width">
                                <label>Kategori Barang *</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {CATEGORIES.map(cat => (
                                        <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <input
                                                type="radio"
                                                name="category"
                                                value={cat}
                                                checked={formData.category === cat}
                                                onChange={(e) => handleChange('category', e.target.value)}
                                            />
                                            {cat}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>
                                    Brand / Merek *
                                    <button
                                        type="button"
                                        className="location-toggle-btn"
                                        onClick={() => setUseManualBrand(!useManualBrand)}
                                        style={{ marginLeft: '8px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        {useManualBrand ? '📋 Pilih dari daftar' : '✏️ Ketik manual'}
                                    </button>
                                </label>
                                {useManualBrand ? (
                                    <input
                                        type="text"
                                        value={formData.brand}
                                        onChange={(e) => handleChange('brand', e.target.value.toUpperCase())}
                                        placeholder="Ketik nama brand..."
                                        className={errors.brand ? 'error' : ''}
                                    />
                                ) : (
                                    <select
                                        value={formData.brand}
                                        onChange={(e) => handleChange('brand', e.target.value)}
                                        className={errors.brand ? 'error' : ''}
                                    >
                                        <option value="">-- Pilih Brand --</option>
                                        {BRANDS.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                )}
                                {errors.brand && <span className="error-text">{errors.brand}</span>}
                            </div>
                            <div className="form-group">
                                <label>Tipe / SKU / Part Number</label>
                                <input
                                    type="text"
                                    value={formData.tipeHose}
                                    onChange={(e) => handleChange('tipeHose', e.target.value.toUpperCase())}
                                    placeholder="EC110-16, GH493-8, dll"
                                />
                            </div>
                        </div>
                        {formData.category === 'Hose' && (
                            <div className="form-row" style={{ marginTop: '1rem' }}>
                                <div className="form-group full-width">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.isCutPiece}
                                            onChange={(e) => handleChange('isCutPiece', e.target.checked)}
                                        />
                                        <span>✂️ Ini adalah Hose Potongan</span>
                                    </label>
                                </div>
                            </div>
                        )}
                        {formData.category === 'Hose' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Standard *</label>
                                    <select
                                        value={formData.standard}
                                        onChange={(e) => handleChange('standard', e.target.value)}
                                        className={errors.standard ? 'error' : ''}
                                    >
                                        <option value="">-- Pilih Standard --</option>
                                        {STANDARDS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    {errors.standard && <span className="error-text">{errors.standard}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Wire Type</label>
                                    <select
                                        value={formData.wireType}
                                        onChange={(e) => handleChange('wireType', e.target.value)}
                                    >
                                        <option value="">-- Pilih --</option>
                                        {WIRE_TYPES.map(w => (
                                            <option key={w} value={w}>{w}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section: Size & Configuration */}
                    <div className="form-section">
                        <h3>{['Adaptor', 'Fitting', 'Coupling', 'Ferrule', 'Valve'].includes(formData.category) ? '⚙️ Spesifikasi & Ulir' : '📏 Ukuran'}</h3>

                        {/* If NOT Hose, show Thread / Seal / Configs */}
                        {['Adaptor', 'Fitting', 'Coupling', 'Ferrule', 'Valve'].includes(formData.category) && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tipe Ulir (Thread Type)</label>
                                    <select
                                        value={formData.threadType}
                                        onChange={(e) => handleChange('threadType', e.target.value)}
                                        className={errors.threadType ? 'error' : ''}
                                    >
                                        <option value="">-- Pilih --</option>
                                        {THREAD_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Ukuran Ulir (e.g. 1/4", M12x1.5)</label>
                                    <input
                                        type="text"
                                        value={formData.threadSize}
                                        onChange={(e) => handleChange('threadSize', e.target.value)}
                                        placeholder={`e.g. 1/4", M12x1.5`}
                                    />
                                </div>
                            </div>
                        )}

                        {['Adaptor', 'Fitting', 'Coupling', 'Valve'].includes(formData.category) && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Konfigurasi Bentuk</label>
                                    <select
                                        value={formData.configuration}
                                        onChange={(e) => handleChange('configuration', e.target.value)}
                                    >
                                        <option value="">-- Pilih --</option>
                                        {CONFIGURATIONS.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Tipe Seal</label>
                                    <select
                                        value={formData.sealType}
                                        onChange={(e) => handleChange('sealType', e.target.value)}
                                    >
                                        <option value="">-- Pilih --</option>
                                        {SEAL_TYPES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label>Size (Inch) {formData.category === 'Hose' ? '*' : ''}</label>
                                <select
                                    value={formData.sizeInch}
                                    onChange={(e) => handleChange('sizeInch', e.target.value)}
                                    className={errors.sizeInch ? 'error' : ''}
                                >
                                    <option value="">-- Pilih --</option>
                                    {SIZES.map(s => (
                                        <option key={s} value={s}>{s}"</option>
                                    ))}
                                </select>
                                {errors.sizeInch && <span className="error-text">{errors.sizeInch}</span>}
                            </div>
                            <div className="form-group">
                                <label>Size DN</label>
                                <select
                                    value={formData.sizeDN}
                                    onChange={(e) => handleChange('sizeDN', e.target.value)}
                                >
                                    <option value="">-- Pilih --</option>
                                    {DN_SIZES.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {formData.category === 'Hose' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Hose O.D. (mm)</label>
                                    <input
                                        type="number"
                                        value={formData.hoseODmm}
                                        onChange={(e) => handleChange('hoseODmm', e.target.value)}
                                        placeholder="Outer Diameter"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Hose I.D. (mm)</label>
                                    <input
                                        type="number"
                                        value={formData.hoseIDmm}
                                        onChange={(e) => handleChange('hoseIDmm', e.target.value)}
                                        placeholder="Inner Diameter"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section: Pressure */}
                    {formData.category === 'Hose' && (
                        <div className="form-section">
                            <h3>💪 Tekanan</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Working Pressure (Bar)</label>
                                    <input
                                        type="number"
                                        value={formData.workingPressureBar}
                                        onChange={(e) => handleChange('workingPressureBar', e.target.value)}
                                        placeholder="e.g. 280"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Working Pressure (PSI)</label>
                                    <input
                                        type="number"
                                        value={formData.workingPressurePsi}
                                        onChange={(e) => handleChange('workingPressurePsi', e.target.value)}
                                        placeholder="e.g. 4000"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Burst Pressure (Bar)</label>
                                    <input
                                        type="number"
                                        value={formData.burstPressureBar}
                                        onChange={(e) => handleChange('burstPressureBar', e.target.value)}
                                        placeholder="Min Burst"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Bend Radius (mm)</label>
                                    <input
                                        type="number"
                                        value={formData.bendRadiusMm}
                                        onChange={(e) => handleChange('bendRadiusMm', e.target.value)}
                                        placeholder="e.g. 180"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section: Quantity & Location */}
                    <div className="form-section">
                        <h3>📦 Kuantitas & Lokasi</h3>
                        <div className="form-row">
                            {formData.category === 'Hose' && (
                                <div className="form-group">
                                    <label>{formData.isCutPiece ? 'Panjang Potongan (Cm/Meter) *' : 'Panjang (Meter) *'}</label>
                                    <input
                                        type="number"
                                        value={formData.isCutPiece ? formData.cutLengthCm : formData.lengthMeter}
                                        onChange={(e) => handleChange(formData.isCutPiece ? 'cutLengthCm' : 'lengthMeter', e.target.value)}
                                        placeholder={formData.isCutPiece ? "e.g. 150 cm" : "e.g. 50"}
                                        className={(formData.isCutPiece ? errors.cutLengthCm : errors.lengthMeter) ? 'error' : ''}
                                    />
                                    {errors.lengthMeter && !formData.isCutPiece && <span className="error-text">{errors.lengthMeter}</span>}
                                    {errors.cutLengthCm && formData.isCutPiece && <span className="error-text">{errors.cutLengthCm}</span>}
                                </div>
                            )}
                            <div className="form-group">
                                <label>{formData.category === 'Hose' ? (formData.isCutPiece ? 'Jumlah Potongan' : 'Jumlah Roll') : 'Jumlah Item (Pcs) *'}</label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => handleChange('quantity', e.target.value)}
                                    min="1"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>
                                    Lokasi Penyimpanan
                                    <button
                                        type="button"
                                        className="location-toggle-btn"
                                        onClick={() => setUseManualLocation(!useManualLocation)}
                                    >
                                        {useManualLocation ? '📋 Pilih dari daftar' : '✏️ Input manual'}
                                    </button>
                                </label>
                                {useManualLocation ? (
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => handleChange('location', e.target.value.toUpperCase())}
                                        placeholder="WH1-HOSE-A01-L1"
                                    />
                                ) : (
                                    <select
                                        value={formData.location}
                                        onChange={(e) => handleChange('location', e.target.value)}
                                    >
                                        <option value="">-- Pilih Lokasi --</option>
                                        <optgroup label="📦 Staging Area">
                                            <option value="WH1-STAGING-IN">Receiving (Barang Masuk)</option>
                                            <option value="WH1-STAGING-OUT">Shipping (Barang Keluar)</option>
                                            <option value="WH1-STAGING-DO">Ready for Delivery</option>
                                        </optgroup>
                                        <optgroup label="🏭 Rak Hose">
                                            {locations.filter(loc => loc.type === 'HOSE_RACK').map(loc => (
                                                <option key={loc.code} value={loc.code}>
                                                    {loc.code} {loc.description ? `- ${loc.description}` : ''}
                                                </option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="🔩 Rak Fitting">
                                            {locations.filter(loc => loc.type === 'FITTING_BIN').map(loc => (
                                                <option key={loc.code} value={loc.code}>
                                                    {loc.code}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Temperature Range</label>
                                <input
                                    type="text"
                                    value={formData.temperatureRange}
                                    onChange={(e) => handleChange('temperatureRange', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="form-section">
                        <h3>📝 Catatan</h3>
                        <div className="form-group full-width">
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Catatan tambahan (opsional)"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {saveError && (
                    <div className="save-error-message">
                        ⚠️ {saveError}
                    </div>
                )}

                <div className="hose-form-footer">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>
                        Batal
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={isSaving}
                    >
                        {isSaving ? '⏳ Menyimpan...' : '✅ Simpan & Generate Barcode'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
