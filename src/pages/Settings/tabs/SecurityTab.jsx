import Card from '../../../components/common/Card/Card';

export default function SecurityTab({ settings, updateSettings }) {
    return (
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
    );
}
