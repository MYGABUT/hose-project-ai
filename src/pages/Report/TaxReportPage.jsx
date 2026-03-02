/**
 * Tax Report Page - E-Faktur Export
 */
import { useState } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import '../Admin/Admin.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function TaxReportPage() {
    const [period, setPeriod] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
    const [loading, setLoading] = useState(false);

    const downloadCsv = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/reports/efaktur/csv?year=${period.year}&month=${period.month}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `EFaktur_Export_${period.year}_${period.month.toString().padStart(2, '0')}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert('Gagal download CSV');
            }
        } catch (err) {
            console.error('Error downloading CSV:', err);
        }
        setLoading(false);
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🧾 Laporan Pajak (E-Faktur)</h1>
                    <p className="page-subtitle">Export CSV PPN Keluaran untuk aplikasi DJP</p>
                </div>
            </div>

            <Card className="form-card" style={{ maxWidth: '600px' }}>
                <h3>Export Faktur Keluaran</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                    Pilih masa pajak untuk diexport. File CSV yang dihasilkan sesuai dengan format standar impor aplikasi E-Faktur DJP terbaru.
                </p>

                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div className="form-group">
                        <label>Bulan (Masa Pajak)</label>
                        <select
                            value={period.month}
                            onChange={(e) => setPeriod({ ...period, month: parseInt(e.target.value) })}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('id-ID', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Tahun Pajak</label>
                        <select
                            value={period.year}
                            onChange={(e) => setPeriod({ ...period, year: parseInt(e.target.value) })}
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                <Button
                    variant="primary"
                    fullWidth
                    onClick={downloadCsv}
                    disabled={loading}
                >
                    {loading ? 'Mengunduh...' : '📥 Download CSV E-Faktur'}
                </Button>
            </Card>
        </div>
    );
}
