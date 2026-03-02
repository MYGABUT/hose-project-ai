import { useState, useRef } from 'react';
import { api } from '../../../services/api';
import './InvoiceUploader.css';

export default function InvoiceUploader({ onUploadSuccess }) {
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/invoice-ingestion/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setResult(res.data.data);
            if (onUploadSuccess) onUploadSuccess(res.data.data);

        } catch (err) {
            console.error("Upload failed", err);
            setError(err.response?.data?.detail || "Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="invoice-uploader">
            <div className="upload-zone">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                />

                {!file ? (
                    <div
                        className="upload-placeholder"
                        onClick={() => fileInputRef.current.click()}
                    >
                        <div className="upload-icon">📄</div>
                        <p>Click to upload Invoice (PDF/Image)</p>
                        <span className="upload-hint">Supported: PDF, JPG, PNG</span>
                    </div>
                ) : (
                    <div className="file-preview">
                        <div className="preview-container">
                            {file.type?.startsWith('image/') ? (
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="Invoice Preview"
                                    className="preview-image"
                                />
                            ) : (
                                <embed
                                    src={URL.createObjectURL(file)}
                                    type="application/pdf"
                                    className="preview-pdf"
                                />
                            )}
                        </div>

                        <div className="file-info">
                            <span className="file-icon">📎</span>
                            <span className="file-name">{file.name}</span>
                            <button
                                className="remove-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                    setResult(null);
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {!result && (
                            <button
                                className="upload-btn"
                                onClick={handleUpload}
                                disabled={isUploading}
                            >
                                {isUploading ? 'Scanning...' : 'Scan Invoice 🔍'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}

            {result && (
                <div className="ocr-result">
                    <h3>✅ Extraction Result</h3>
                    <div className="result-grid">
                        <div className="field-group">
                            <label>Invoice Number</label>
                            <input type="text" defaultValue={result.extracted.invoice_number || ''} />
                        </div>
                        <div className="field-group">
                            <label>Date</label>
                            <input type="text" defaultValue={result.extracted.date || ''} />
                        </div>
                        <div className="field-group">
                            <label>Vendor</label>
                            <input type="text" defaultValue={result.extracted.vendor_name || ''} />
                        </div>
                        <div className="field-group">
                            <label>Total Amount</label>
                            <input type="text" defaultValue={result.extracted.total_amount?.toLocaleString() || ''} />
                        </div>
                    </div>

                    <div className="raw-text-preview">
                        <details>
                            <summary>View Raw Text</summary>
                            <pre>{result.raw_text_preview}</pre>
                        </details>
                    </div>
                </div>
            )}
        </div>
    );
}
