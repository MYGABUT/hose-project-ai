import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useAuth } from '../../contexts/AuthContext';
import { getAuditLogs } from '../../services/auditApi';
import Button from '../../components/common/Button/Button';
import Card from '../../components/common/Card/Card';
import './Settings.css';

// Default settings
const DEFAULT_SETTINGS = {
    // Company Profile
    company: {
        name: 'PT. HOSE PRO INDONESIA',
        address: 'Jl. Industri No. 123, Kawasan Industri MM2100, Bekasi 17520',
        phone: '+62 21 8998 1234',
        email: 'info@hosepro.id',
        website: 'www.hosepro.id',
        npwp: '01.234.567.8-901.000',
        logo: null
    },
    // Tax & Finance
    tax: {
        ppnRate: 12,
        currency: 'IDR',
        currencySymbol: 'Rp'
    },
    // Document Footer
    documents: {
        invoiceFooter: 'Barang yang sudah dibeli tidak dapat dikembalikan. Pembayaran dalam 30 hari.',
        invoiceFormat: 'INV/{YEAR}/{MONTH}/{0001}',
        doFormat: 'DO/{YEAR}/{MONTH}/{0001}',
        poFormat: 'PO/{YEAR}/{MONTH}/{0001}'
    },
    // Security
    security: {
        sessionTimeout: 30, // minutes
        requirePasswordChange: true,
        minPasswordLength: 8,
        pamDefaultDuration: 60 // minutes
    },
    // Operations
    operations: {
        globalMinStock: 10,
        maxDiscountWithoutApproval: 5, // percent
        lowStockAlertEnabled: true
    },
    // Integrations
    integrations: {
        waApiKey: '',
        waSenderNumber: '',
        smtpHost: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        printerType: 'A4' // A4 | Thermal80mm | Thermal58mm
    }
};

const TABS = [
    { id: 'profile', label: 'Profil PT', icon: '🏢' },
    { id: 'security', label: 'Keamanan', icon: '🔒' },
    { id: 'operations', label: 'Operasional', icon: '⚙️' },
    { id: 'notifications', label: 'Notifikasi', icon: '🔔' },
    { id: 'maintenance', label: 'Maintenance', icon: '🛠️' }
];

export default function Settings() {
    const { user } = useAuth();
    const backupCardRef = useRef(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [auditLog, setAuditLog] = useState([]);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetPassword, setResetPassword] = useState('');

    // Check for Super Admin access
    // Fix: Key values are lowercase in AuthContext
    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'manager';

    // Load settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('enterpriseSettings');
        if (saved) {
            try {
                setSettings(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }

        // Fetch audit logs
        loadAuditLogs();
    }, []);

    const loadAuditLogs = async () => {
        try {
            const res = await getAuditLogs({ limit: 20 });
            if (res.status === 'success') {
                setAuditLog(res.data);
            }
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        }
    };

    const updateSettings = (category, field, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: value
            }
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        // Simulate API call
        await new Promise(r => setTimeout(r, 1000));
        localStorage.setItem('enterpriseSettings', JSON.stringify(settings));
        setSaving(false);
        setHasChanges(false);
        alert('✅ Pengaturan berhasil disimpan!');
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            updateSettings('company', 'logo', event.target?.result);
        };
        reader.readAsDataURL(file);
    };

    // Export backup as image
    const handleExportBackupImage = async () => {
        setExporting(true);

        try {
            // Create a hidden div with backup info
            const backupDiv = document.createElement('div');
            backupDiv.style.cssText = 'position: absolute; left: -9999px; background: white; padding: 40px; width: 800px; font-family: Arial, sans-serif;';
            backupDiv.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3B82F6; padding-bottom: 20px;">
                    <h1 style="color: #3B82F6; margin: 0 0 10px 0; font-size: 28px;">🏢 HOSE PRO - DATA BACKUP</h1>
                    <p style="color: #64748B; margin: 0;">Exported: ${new Date().toLocaleString('id-ID')}</p>
                    <p style="color: #64748B; margin: 5px 0 0 0;">By: ${user?.name || 'Admin'}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div style="background: #F1F5F9; padding: 20px; border-radius: 12px;">
                        <h3 style="color: #1E293B; margin: 0 0 15px 0; font-size: 16px;">🏢 Identitas Perusahaan</h3>
                        <p style="margin: 5px 0; color: #475569;"><strong>Nama:</strong> ${settings.company.name}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Alamat:</strong> ${settings.company.address}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Telepon:</strong> ${settings.company.phone}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Email:</strong> ${settings.company.email}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>NPWP:</strong> ${settings.company.npwp}</p>
                    </div>
                    
                    <div style="background: #ECFDF5; padding: 20px; border-radius: 12px;">
                        <h3 style="color: #1E293B; margin: 0 0 15px 0; font-size: 16px;">💰 Keuangan & Pajak</h3>
                        <p style="margin: 5px 0; color: #475569;"><strong>PPN Rate:</strong> ${settings.tax.ppnRate}%</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Mata Uang:</strong> ${settings.tax.currency}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Max Diskon:</strong> ${settings.operations.maxDiscountWithoutApproval}%</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Min Stock Alert:</strong> ${settings.operations.globalMinStock} pcs</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div style="background: #FEF3C7; padding: 20px; border-radius: 12px;">
                        <h3 style="color: #1E293B; margin: 0 0 15px 0; font-size: 16px;">🔒 Keamanan</h3>
                        <p style="margin: 5px 0; color: #475569;"><strong>Session Timeout:</strong> ${settings.security.sessionTimeout === 0 ? 'Tidak aktif' : settings.security.sessionTimeout + ' menit'}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Min Password:</strong> ${settings.security.minPasswordLength} karakter</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>PAM Duration:</strong> ${settings.security.pamDefaultDuration} menit</p>
                    </div>
                    
                    <div style="background: #EDE9FE; padding: 20px; border-radius: 12px;">
                        <h3 style="color: #1E293B; margin: 0 0 15px 0; font-size: 16px;">📄 Format Dokumen</h3>
                        <p style="margin: 5px 0; color: #475569;"><strong>Invoice:</strong> ${settings.documents.invoiceFormat}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>Surat Jalan:</strong> ${settings.documents.doFormat}</p>
                        <p style="margin: 5px 0; color: #475569;"><strong>PO:</strong> ${settings.documents.poFormat}</p>
                    </div>
                </div>
                
                <div style="text-align: center; padding-top: 20px; border-top: 2px dashed #CBD5E1;">
                    <p style="color: #94A3B8; font-size: 12px; margin: 0;">
                        🔐 Dokumen ini adalah backup pengaturan sistem HOSE PRO<br/>
                        Simpan dengan aman. Jangan bagikan ke pihak tidak berwenang.
                    </p>
                </div>
            `;

            document.body.appendChild(backupDiv);

            // Use html2canvas to convert to image
            const canvas = await html2canvas(backupDiv, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false
            });

            document.body.removeChild(backupDiv);

            // Download as PNG with blob to fail safe
            canvas.toBlob((blob) => {
                if (!blob) {
                    alert('Gagal membuat gambar backup.');
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `HosePro_Backup_${new Date().toISOString().split('T')[0]}.png`;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');

            alert('✅ Backup berhasil disimpan sebagai gambar!');
        } catch (err) {
            console.error('Error exporting backup:', err);
            alert('❌ Gagal export backup. Coba lagi.');
        }

        setExporting(false);
    };

    // Export backup as JSON (original)
    const handleExportBackupJSON = () => {
        const data = {
            settings,
            exportedAt: new Date().toISOString(),
            exportedBy: user?.name
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hosepro_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFactoryReset = () => {
        if (resetPassword !== 'RESET-HOSE-PRO-2026') {
            alert('❌ Password reset salah!');
            return;
        }

        localStorage.removeItem('enterpriseSettings');
        setSettings(DEFAULT_SETTINGS);
        setShowResetConfirm(false);
        setResetPassword('');
        alert('✅ Factory Reset berhasil. Semua pengaturan dikembalikan ke default.');
    };

    // Access denied for non-admin
    if (!isSuperAdmin) {
        return (
            <div className="settings-access-denied">
                <div className="denied-icon">🔒</div>
                <h2>Akses Ditolak</h2>
                <p>Halaman ini hanya dapat diakses oleh Super Admin atau Manager.</p>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <div>
                    <h1 className="page-title">⚙️ Pengaturan Sistem</h1>
                    <p className="page-subtitle">Konfigurasi aplikasi dan kebijakan perusahaan</p>
                </div>
                {hasChanges && (
                    <div className="unsaved-indicator">
                        <span className="unsaved-dot"></span>
                        Perubahan belum disimpan
                    </div>
                )}
            </div>

            <div className="settings-layout">
                {/* Sidebar Tabs */}
                <div className="settings-sidebar">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="settings-content">
                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="settings-section">
                            <Card title="🏢 Identitas Perusahaan" className="settings-card">
                                <div className="form-grid">
                                    <div className="form-group logo-upload">
                                        <label>Logo Perusahaan</label>
                                        <div className="logo-preview">
                                            {settings.company.logo ? (
                                                <img src={settings.company.logo} alt="Logo" />
                                            ) : (
                                                <div className="logo-placeholder">
                                                    <span>📷</span>
                                                    <span>Upload Logo</span>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                            />
                                        </div>
                                        <span className="form-hint">Format: PNG/JPG, Max 2MB</span>
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Nama Perusahaan</label>
                                        <input
                                            type="text"
                                            value={settings.company.name}
                                            onChange={e => updateSettings('company', 'name', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Alamat Lengkap</label>
                                        <textarea
                                            rows={2}
                                            value={settings.company.address}
                                            onChange={e => updateSettings('company', 'address', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Telepon</label>
                                        <input
                                            type="text"
                                            value={settings.company.phone}
                                            onChange={e => updateSettings('company', 'phone', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={settings.company.email}
                                            onChange={e => updateSettings('company', 'email', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Website</label>
                                        <input
                                            type="text"
                                            value={settings.company.website}
                                            onChange={e => updateSettings('company', 'website', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>NPWP</label>
                                        <input
                                            type="text"
                                            value={settings.company.npwp}
                                            onChange={e => updateSettings('company', 'npwp', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </Card>

                            <Card title="💰 Konfigurasi Pajak & Keuangan" className="settings-card">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>PPN (Pajak Pertambahan Nilai)</label>
                                        <div className="input-with-suffix">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.tax.ppnRate}
                                                onChange={e => updateSettings('tax', 'ppnRate', parseInt(e.target.value) || 0)}
                                            />
                                            <span className="input-suffix">%</span>
                                        </div>
                                        <span className="form-hint">Otomatis dipakai untuk semua kalkulasi sales</span>
                                    </div>

                                    <div className="form-group">
                                        <label>Mata Uang Default</label>
                                        <select
                                            value={settings.tax.currency}
                                            onChange={e => updateSettings('tax', 'currency', e.target.value)}
                                        >
                                            <option value="IDR">IDR (Rupiah)</option>
                                            <option value="USD">USD (Dollar)</option>
                                            <option value="SGD">SGD (Singapore Dollar)</option>
                                        </select>
                                    </div>
                                </div>
                            </Card>

                            <Card title="📄 Format Dokumen" className="settings-card">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Format Nomor Invoice</label>
                                        <input
                                            type="text"
                                            value={settings.documents.invoiceFormat}
                                            onChange={e => updateSettings('documents', 'invoiceFormat', e.target.value)}
                                        />
                                        <span className="form-hint">Variabel: {'{YEAR}'}, {'{MONTH}'}, {'{0001}'}</span>
                                    </div>

                                    <div className="form-group">
                                        <label>Format Nomor Surat Jalan</label>
                                        <input
                                            type="text"
                                            value={settings.documents.doFormat}
                                            onChange={e => updateSettings('documents', 'doFormat', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Format Nomor PO</label>
                                        <input
                                            type="text"
                                            value={settings.documents.poFormat}
                                            onChange={e => updateSettings('documents', 'poFormat', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Footer Invoice</label>
                                        <textarea
                                            rows={2}
                                            value={settings.documents.invoiceFooter}
                                            onChange={e => updateSettings('documents', 'invoiceFooter', e.target.value)}
                                            placeholder="Teks yang muncul di bagian bawah invoice..."
                                        />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                        <div className="settings-section">
                            <Card title="🔐 Kebijakan Session" className="settings-card">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Session Timeout</label>
                                        <select
                                            value={settings.security.sessionTimeout}
                                            onChange={e => updateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
                                        >
                                            <option value={15}>15 Menit</option>
                                            <option value={30}>30 Menit</option>
                                            <option value={60}>1 Jam</option>
                                            <option value={120}>2 Jam</option>
                                            <option value={0}>Tidak Timeout</option>
                                        </select>
                                        <span className="form-hint">User otomatis logout jika tidak aktif</span>
                                    </div>

                                    <div className="form-group">
                                        <label>PAM Default Duration</label>
                                        <div className="input-with-suffix">
                                            <input
                                                type="number"
                                                min="5"
                                                max="480"
                                                value={settings.security.pamDefaultDuration}
                                                onChange={e => updateSettings('security', 'pamDefaultDuration', parseInt(e.target.value) || 60)}
                                            />
                                            <span className="input-suffix">menit</span>
                                        </div>
                                        <span className="form-hint">Default durasi saat request akses</span>
                                    </div>
                                </div>
                            </Card>

                            <Card title="🔑 Kebijakan Password" className="settings-card">
                                <div className="form-grid">
                                    <div className="form-group checkbox-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={settings.security.requirePasswordChange}
                                                onChange={e => updateSettings('security', 'requirePasswordChange', e.target.checked)}
                                            />
                                            <span className="checkbox-text">Wajib ganti password default saat login pertama</span>
                                        </label>
                                    </div>

                                    <div className="form-group">
                                        <label>Minimal Panjang Password</label>
                                        <div className="input-with-suffix">
                                            <input
                                                type="number"
                                                min="6"
                                                max="20"
                                                value={settings.security.minPasswordLength}
                                                onChange={e => updateSettings('security', 'minPasswordLength', parseInt(e.target.value) || 8)}
                                            />
                                            <span className="input-suffix">karakter</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <div className="security-preview">
                                <h4>📋 Preview Kebijakan Aktif</h4>
                                <ul>
                                    <li>✅ Session timeout: <strong>{settings.security.sessionTimeout === 0 ? 'Tidak aktif' : `${settings.security.sessionTimeout} menit`}</strong></li>
                                    <li>✅ Password minimal: <strong>{settings.security.minPasswordLength} karakter</strong></li>
                                    <li>✅ Default akses PAM: <strong>{settings.security.pamDefaultDuration} menit</strong></li>
                                    <li>{settings.security.requirePasswordChange ? '✅' : '❌'} Wajib ganti password default</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* OPERATIONS TAB */}
                    {activeTab === 'operations' && (
                        <div className="settings-section">
                            <Card title="📦 Inventory Alerts" className="settings-card">
                                <div className="form-grid">
                                    <div className="form-group checkbox-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={settings.operations.lowStockAlertEnabled}
                                                onChange={e => updateSettings('operations', 'lowStockAlertEnabled', e.target.checked)}
                                            />
                                            <span className="checkbox-text">Aktifkan peringatan stok rendah</span>
                                        </label>
                                    </div>

                                    <div className="form-group">
                                        <label>Global Minimum Stock</label>
                                        <div className="input-with-suffix">
                                            <input
                                                type="number"
                                                min="1"
                                                value={settings.operations.globalMinStock}
                                                onChange={e => updateSettings('operations', 'globalMinStock', parseInt(e.target.value) || 10)}
                                            />
                                            <span className="input-suffix">pcs</span>
                                        </div>
                                        <span className="form-hint">Item dengan stok di bawah angka ini akan masuk laporan Low Stock</span>
                                    </div>
                                </div>
                            </Card>

                            <Card title="💼 Approval Limits" className="settings-card">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Maksimum Diskon Tanpa Approval</label>
                                        <div className="input-with-suffix">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.operations.maxDiscountWithoutApproval}
                                                onChange={e => updateSettings('operations', 'maxDiscountWithoutApproval', parseInt(e.target.value) || 0)}
                                            />
                                            <span className="input-suffix">%</span>
                                        </div>
                                        <span className="form-hint">Di atas nilai ini, Sales harus minta approval Manager</span>
                                    </div>
                                </div>

                                <div className="approval-preview">
                                    <h4>Contoh:</h4>
                                    <div className="preview-examples">
                                        <div className="example allowed">
                                            <span className="example-icon">✅</span>
                                            <span>Diskon 3% → Langsung lolos</span>
                                        </div>
                                        <div className="example blocked">
                                            <span className="example-icon">🔒</span>
                                            <span>Diskon {settings.operations.maxDiscountWithoutApproval + 5}% → Butuh PIN Manager</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* NOTIFICATIONS TAB */}
                    {activeTab === 'notifications' && (
                        <div className="settings-section">
                            <Card title="📱 WhatsApp Gateway" className="settings-card">
                                <div className="integration-status not-configured">
                                    <span className="status-icon">⚠️</span>
                                    <span>Belum dikonfigurasi</span>
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>API Key</label>
                                        <input
                                            type="password"
                                            value={settings.integrations.waApiKey}
                                            onChange={e => updateSettings('integrations', 'waApiKey', e.target.value)}
                                            placeholder="Masukkan API Key dari provider WA"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Nomor Pengirim</label>
                                        <input
                                            type="text"
                                            value={settings.integrations.waSenderNumber}
                                            onChange={e => updateSettings('integrations', 'waSenderNumber', e.target.value)}
                                            placeholder="628123456789"
                                        />
                                    </div>
                                </div>
                                <p className="form-hint">Untuk notifikasi approval ke Manager via WhatsApp</p>
                            </Card>

                            <Card title="📧 Email Server (SMTP)" className="settings-card">
                                <div className="integration-status not-configured">
                                    <span className="status-icon">⚠️</span>
                                    <span>Belum dikonfigurasi</span>
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>SMTP Host</label>
                                        <input
                                            type="text"
                                            value={settings.integrations.smtpHost}
                                            onChange={e => updateSettings('integrations', 'smtpHost', e.target.value)}
                                            placeholder="smtp.gmail.com"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Port</label>
                                        <input
                                            type="number"
                                            value={settings.integrations.smtpPort}
                                            onChange={e => updateSettings('integrations', 'smtpPort', parseInt(e.target.value) || 587)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Username</label>
                                        <input
                                            type="text"
                                            value={settings.integrations.smtpUsername}
                                            onChange={e => updateSettings('integrations', 'smtpUsername', e.target.value)}
                                            placeholder="noreply@hosepro.id"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Password</label>
                                        <input
                                            type="password"
                                            value={settings.integrations.smtpPassword}
                                            onChange={e => updateSettings('integrations', 'smtpPassword', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </Card>

                            <Card title="🖨️ Printer & Cetak" className="settings-card">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Ukuran Kertas Default</label>
                                        <select
                                            value={settings.integrations.printerType}
                                            onChange={e => updateSettings('integrations', 'printerType', e.target.value)}
                                        >
                                            <option value="A4">A4 (210 x 297 mm)</option>
                                            <option value="Thermal80mm">Thermal 80mm</option>
                                            <option value="Thermal58mm">Thermal 58mm</option>
                                            <option value="Label">Label Sticker (100x50mm)</option>
                                        </select>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* MAINTENANCE TAB */}
                    {activeTab === 'maintenance' && (
                        <div className="settings-section">
                            <Card title="📋 Audit Log (Kotak Hitam)" className="settings-card audit-card">
                                <p className="card-description">Catatan aktivitas penting dalam sistem</p>
                                <div className="audit-table-wrapper">
                                    <table className="audit-table">
                                        <thead>
                                            <tr>
                                                <th>Waktu</th>
                                                <th>User</th>
                                                <th>Aksi</th>
                                                <th>Detail</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLog.map(log => (
                                                <tr key={log.id}>
                                                    <td className="audit-time">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                                                    <td className="audit-user">{log.user_name}</td>
                                                    <td>
                                                        <span className={`audit-action action-${log.action?.toLowerCase()}`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="audit-detail">
                                                        {log.changes_summary || log.details || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            <Card title="💾 Backup Data" className="settings-card">
                                <p className="card-description">Download backup pengaturan dan data penting</p>
                                <div className="backup-options">
                                    <div className="backup-option">
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            onClick={handleExportBackupImage}
                                            loading={exporting}
                                            icon={<span>🖼️</span>}
                                        >
                                            {exporting ? 'Membuat...' : 'Simpan Gambar (PNG)'}
                                        </Button>
                                        <span className="backup-option-desc">Visual backup dengan info perusahaan</span>
                                    </div>
                                    <div className="backup-option">
                                        <Button
                                            variant="secondary"
                                            size="lg"
                                            onClick={handleExportBackupJSON}
                                            icon={<span>📄</span>}
                                        >
                                            Simpan JSON
                                        </Button>
                                        <span className="backup-option-desc">Data mentah untuk restore system</span>
                                    </div>
                                </div>
                            </Card>

                            <Card title="⚠️ Factory Reset" className="settings-card danger-card">
                                <p className="card-description danger-text">
                                    Mengembalikan semua pengaturan ke default. Tindakan ini tidak dapat dibatalkan!
                                </p>
                                {!showResetConfirm ? (
                                    <Button
                                        variant="danger"
                                        onClick={() => setShowResetConfirm(true)}
                                    >
                                        🔄 Factory Reset
                                    </Button>
                                ) : (
                                    <div className="reset-confirm">
                                        <p>Masukkan password reset untuk konfirmasi:</p>
                                        <input
                                            type="password"
                                            placeholder="Password Reset"
                                            value={resetPassword}
                                            onChange={e => setResetPassword(e.target.value)}
                                        />
                                        <div className="reset-buttons">
                                            <Button variant="secondary" onClick={() => {
                                                setShowResetConfirm(false);
                                                setResetPassword('');
                                            }}>
                                                Batal
                                            </Button>
                                            <Button variant="danger" onClick={handleFactoryReset}>
                                                Konfirmasi Reset
                                            </Button>
                                        </div>
                                        <span className="reset-hint">Hint: RESET-HOSE-PRO-2026</span>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="settings-actions">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setSettings(DEFAULT_SETTINGS);
                                setHasChanges(false);
                            }}
                        >
                            Reset ke Default
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            loading={saving}
                            disabled={!hasChanges}
                        >
                            {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
