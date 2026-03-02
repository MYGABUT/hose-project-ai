import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';

export default function MaintenanceTab({
    settings,
    auditLog,
    exporting,
    handleExportBackupImage,
    handleExportBackupJSON,
    showResetConfirm,
    setShowResetConfirm,
    resetPassword,
    setResetPassword,
    handleFactoryReset
}) {
    return (
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
    );
}
