import React, { useState } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import { HiUpload, HiDownload, HiCheck, HiX, HiExclamation } from 'react-icons/hi';
import { importApi } from '../../services/importApi';
import './SalesImportPage.css'; // Will create this

const SalesImportPage = () => {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, errors: 0 });
    const [imported, setImported] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const handleDownloadTemplate = async () => {
        try {
            await importApi.downloadTemplate('sales');
        } catch (error) {
            console.error(error);
            alert("Gagal download template");
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setPreviewData([]);
        setImported(false);
        setErrorMsg(null);
    };

    const handlePreview = async () => {
        if (!file) return;
        setLoading(true);
        setErrorMsg(null);
        try {
            const data = await importApi.importSales(file, true); // Preview = true
            setPreviewData(data.data);

            // Calculate stats
            const errs = data.data.filter(r => r.status === 'ERROR').length;
            setStats({
                total: data.data.length,
                errors: errs
            });

        } catch (error) {
            console.error(error);
            setErrorMsg(error.response?.data?.detail || "Gagal memproses file");
        } finally {
            setLoading(false);
        }
    };

    const handleCommit = async () => {
        if (!file) return;
        if (stats.errors > 0) {
            alert("Harap perbaiki error di file Excel sebelum import!");
            return;
        }

        if (!confirm(`Yakin ingin mengimport ${stats.total} baris data penjualan?`)) return;

        setLoading(true);
        try {
            const res = await importApi.importSales(file, false); // Preview = false (COMMIT)
            setImported(true);
            alert(res.message);
            setFile(null);
            setPreviewData([]);
        } catch (error) {
            console.error(error);
            setErrorMsg(error.response?.data?.detail || "Gagal import data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sales-import-page">
            <h1 className="page-title">Import Data Penjualan (History)</h1>

            {/* Step 1: Upload & Template */}
            <Card title="Upload Excel">
                <div className="upload-section">
                    <div className="file-input-wrapper">
                        <label className="input-label" htmlFor="file_input">
                            Pilih File Excel (.xlsx) atau CSV (.csv)
                        </label>
                        <input
                            className="file-input"
                            id="file_input"
                            type="file"
                            accept=".xlsx, .csv"
                            onChange={handleFileChange}
                        />
                        <p className="help-text">
                            Gunakan template Excel atau format CSV standar.
                        </p>
                    </div>

                    <div className="template-action">
                        <Button variant="secondary" onClick={handleDownloadTemplate} icon={<HiDownload />}>
                            Download Template
                        </Button>
                    </div>
                </div>

                {file && !imported && (
                    <div className="action-buttons">
                        <Button onClick={handlePreview} isLoading={loading} disabled={loading || previewData.length > 0} icon={<HiUpload />}>
                            Preview Data
                        </Button>

                        {previewData.length > 0 && (
                            <Button variant="primary" onClick={handleCommit} isLoading={loading} disabled={loading || stats.errors > 0} icon={<HiCheck />}>
                                Commit Import
                            </Button>
                        )}

                        {previewData.length > 0 && (
                            <Button variant="danger" onClick={() => { setFile(null); setPreviewData([]); }} icon={<HiX />}>
                                Batal
                            </Button>
                        )}
                    </div>
                )}
            </Card>

            {/* Error Display */}
            {errorMsg && (
                <div className="error-alert">
                    <HiExclamation className="icon" />
                    <span><span className="font-bold">Error!</span> {errorMsg}</span>
                </div>
            )}

            {/* Step 2: Preview Results */}
            {previewData.length > 0 && (
                <Card title="Preview Result">
                    <div className="preview-header">
                        <div className="badges">
                            <span className="badge info">Total: {stats.total} Baris</span>
                            {stats.errors > 0 ? (
                                <span className="badge error">Error: {stats.errors} Baris</span>
                            ) : (
                                <span className="badge success">Siap Import</span>
                            )}
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="preview-table">
                            <thead>
                                <tr>
                                    <th>Line</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>SO Number</th>
                                    <th>Customer</th>
                                    <th>SKU</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                    <th>Error Info</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((row, idx) => (
                                    <tr key={idx} className={row.status === 'ERROR' ? 'row-error' : ''}>
                                        <td>{idx + 1}</td>
                                        <td>
                                            {row.status === 'OK' && <span className="badge success small">OK</span>}
                                            {row.status === 'SKIP' && <span className="badge warning small">SKIP</span>}
                                            {row.status === 'ERROR' && <span className="badge error small">ERROR</span>}
                                        </td>
                                        <td>{row.date}</td>
                                        <td>{row.so_number}</td>
                                        <td>{row.customer}</td>
                                        <td>{row.sku}</td>
                                        <td>{row.qty}</td>
                                        <td>{new Intl.NumberFormat('id-ID').format(row.price)}</td>
                                        <td>{new Intl.NumberFormat('id-ID').format(row.qty * row.price)}</td>
                                        <td className="text-error">
                                            {row.error}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default SalesImportPage;
