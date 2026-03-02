import Card from '../../../components/common/Card/Card';

export default function OperationsTab({ settings, updateSettings }) {
    return (
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
    );
}
