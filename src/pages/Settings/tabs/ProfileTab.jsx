import Card from '../../../components/common/Card/Card';

export default function ProfileTab({ settings, updateSettings, handleLogoUpload }) {
    return (
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
    );
}
