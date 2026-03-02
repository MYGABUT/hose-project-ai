import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import MainLayout from '../../components/layout/MainLayout/MainLayout';
import InvoiceUploader from '../../components/features/Invoice/InvoiceUploader';
import './InvoiceIngestion.css';

export default function InvoiceIngestion() {
    const [processedInvoices, setProcessedInvoices] = useState([]);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const res = await api.get('/invoice-ingestion');
            if (Array.isArray(res.data)) {
                setProcessedInvoices(res.data);
            } else {
                console.warn("API response is not array:", res.data);
                setProcessedInvoices([]);
            }
        } catch (err) {
            console.error("Failed to fetch invoices", err);
            setProcessedInvoices([]);
        }
    };

    const handleUploadSuccess = (data) => {
        fetchInvoices(); // Refresh list
    };

    return (
        <div className="invoice-ingestion-page">
            <div className="page-header">
                <h1>🧾 Invoice Ingestion (AI OCR)</h1>
                <p className="page-subtitle">Upload and extract data from vendor invoices automatically.</p>
            </div>

            <div className="ingestion-content">
                <section className="upload-section">
                    <h2>New Invoice</h2>
                    <InvoiceUploader onUploadSuccess={handleUploadSuccess} />
                </section>

                <section className="recent-invoices">
                    <h2>Recent Uploads</h2>
                    {processedInvoices.length === 0 ? (
                        <div className="empty-state">No invoices processed yet.</div>
                    ) : (
                        <div className="invoice-list">
                            {processedInvoices.map((inv) => (
                                <div key={inv.inbox_id} className="invoice-item-card">
                                    <div className="invoice-status ocr-done">OCR DONE</div>
                                    <div className="invoice-detail">
                                        <strong>{inv.extracted?.vendor_name || 'Unknown Vendor'}</strong>
                                        <span>Invoice: {inv.extracted?.invoice_number || '-'}</span>
                                        <span>Total: {inv.extracted?.total_amount?.toLocaleString() || '-'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
