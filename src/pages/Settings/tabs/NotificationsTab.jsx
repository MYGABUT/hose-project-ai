import Card from '../../../components/common/Card/Card';

export default function NotificationsTab({ settings, updateSettings }) {
    return (
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
    );
}
