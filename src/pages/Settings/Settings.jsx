/**
 * HoseMaster WMS - Settings Page
 * System configuration with tab-based navigation
 */
import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useAuth } from '../../contexts/AuthContext';
import { getAuditLogs } from '../../services/auditApi';
import { getSettings, updateSettings as updateSettingsApi } from '../../services/settingsApi';
import Button from '../../components/common/Button/Button';
import './Settings.css';

// Tab components
import ProfileTab from './tabs/ProfileTab';
import SecurityTab from './tabs/SecurityTab';
import OperationsTab from './tabs/OperationsTab';
import NotificationsTab from './tabs/NotificationsTab';
import MaintenanceTab from './tabs/MaintenanceTab';

// Default settings
const DEFAULT_SETTINGS = {
    // Company Profile
    company: {
        name: 'PT. HOSE PRO INDONESIA',
        address: 'Jl. Industri No. 123, Kawasan Industri MM2100, Bekasi 17520',
        phone: '+62 21 8998 1234',
        email: 'info@hosepro.id',
        website: 'www.hosepro.id',
        npwp: '01.234.567.8-012.345',
        logo: null
    },
    // Tax & Finance
    tax: {
        ppnRate: 11,
        currency: 'IDR'
    },
    // Document Formats
    documents: {
        invoiceFormat: 'INV/{YEAR}/{MONTH}/{0001}',
        doFormat: 'DO/{YEAR}/{MONTH}/{0001}',
        poFormat: 'PO/{YEAR}/{MONTH}/{0001}',
        invoiceFooter: 'Terima kasih atas kepercayaan Anda. Pembayaran dalam 30 hari.'
    },
    // Security
    security: {
        sessionTimeout: 30,
        requirePasswordChange: true,
        minPasswordLength: 8,
        pamDefaultDuration: 60
    },
    // Operations
    operations: {
        lowStockAlertEnabled: true,
        globalMinStock: 10,
        maxDiscountWithoutApproval: 5
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
    const [loading, setLoading] = useState(true);

    // Check for Super Admin access
    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'manager';

    // Load settings from API
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getSettings();
                setSettings(prev => ({ ...prev, ...data }));
            } catch (err) {
                console.error('Failed to load settings from API:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
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
        try {
            await updateSettingsApi(settings);
            setHasChanges(false);
            alert('✅ Pengaturan berhasil disimpan ke Database Aman!');
        } catch (err) {
            console.error('Save failed:', err);
            alert('❌ Gagal menyimpan pengaturan.');
        } finally {
            setSaving(false);
        }
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

            const canvas = await html2canvas(backupDiv, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false
            });

            document.body.removeChild(backupDiv);

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
                    {activeTab === 'profile' && (
                        <ProfileTab
                            settings={settings}
                            updateSettings={updateSettings}
                            handleLogoUpload={handleLogoUpload}
                        />
                    )}

                    {activeTab === 'security' && (
                        <SecurityTab
                            settings={settings}
                            updateSettings={updateSettings}
                        />
                    )}

                    {activeTab === 'operations' && (
                        <OperationsTab
                            settings={settings}
                            updateSettings={updateSettings}
                        />
                    )}

                    {activeTab === 'notifications' && (
                        <NotificationsTab
                            settings={settings}
                            updateSettings={updateSettings}
                        />
                    )}

                    {activeTab === 'maintenance' && (
                        <MaintenanceTab
                            settings={settings}
                            auditLog={auditLog}
                            exporting={exporting}
                            handleExportBackupImage={handleExportBackupImage}
                            handleExportBackupJSON={handleExportBackupJSON}
                            showResetConfirm={showResetConfirm}
                            setShowResetConfirm={setShowResetConfirm}
                            resetPassword={resetPassword}
                            setResetPassword={setResetPassword}
                            handleFactoryReset={handleFactoryReset}
                        />
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
