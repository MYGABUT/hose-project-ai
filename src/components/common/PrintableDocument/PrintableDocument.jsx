import React from 'react';

/**
 * Reusable PrintableDocument component for all transaction documents.
 * This wraps the print-ready content and adds a "Print" button.
 * 
 * Usage:
 * <PrintableDocument
 *   docType="SALES ORDER"
 *   docNumber="SO-20260223-A1B2C3"
 *   docDate="23 Feb 2026"
 *   customerName="PT. Maju Jaya"
 *   customerInfo={{ phone: '08123xxx', address: 'Jl. Industri No.5' }}
 *   lines={[{ description, qty, unit_price, line_total }]}
 *   subtotal={1500000}
 *   tax={165000}
 *   total={1665000}
 *   notes="Pengiriman ke gudang baru"
 * />
 */
export default function PrintableDocument({
    docType = 'DOCUMENT',
    docNumber = '-',
    docDate = '-',
    customerName = '-',
    customerInfo = {},
    lines = [],
    subtotal = 0,
    tax = 0,
    total = 0,
    notes = '',
    companyName = 'HoseMaster Enterprise',
    companyAddress = 'Jl. Industri Hydraulik No. 88, Surabaya',
    companyPhone = '(031) 555-1234',
    children // For custom content below
}) {
    const formatCurrency = (val) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            {/* Print button — only visible on screen */}
            <button className="print-btn no-print" onClick={handlePrint}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak {docType}
            </button>

            {/* Print-only document — hidden on screen, shown when printing */}
            <div className="print-document">
                {/* Header */}
                <div className="doc-header">
                    <div className="company-info">
                        <h2>{companyName}</h2>
                        <p>{companyAddress}</p>
                        <p>Telp: {companyPhone}</p>
                    </div>
                    <div className="doc-title">
                        <h1>{docType}</h1>
                        <div className="doc-number">{docNumber}</div>
                        <div className="doc-date">Tanggal: {docDate}</div>
                    </div>
                </div>

                {/* Customer Info */}
                <div className="doc-parties">
                    <div className="party-box">
                        <h4>Kepada</h4>
                        <p><strong>{customerName}</strong></p>
                        {customerInfo.address && <p>{customerInfo.address}</p>}
                        {customerInfo.phone && <p>Telp: {customerInfo.phone}</p>}
                    </div>
                </div>

                {/* Line Items Table */}
                <table className="doc-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>No</th>
                            <th>Deskripsi</th>
                            <th style={{ width: '60px', textAlign: 'right' }}>Qty</th>
                            <th style={{ width: '120px', textAlign: 'right' }}>Harga Satuan</th>
                            <th style={{ width: '120px', textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, idx) => (
                            <tr key={idx}>
                                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                <td>{line.description || line.product_name || '-'}</td>
                                <td className="num">{line.qty}</td>
                                <td className="num">{formatCurrency(line.unit_price)}</td>
                                <td className="num">{formatCurrency(line.line_total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="doc-totals">
                    <table>
                        <tbody>
                            <tr>
                                <td>Subtotal</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(subtotal)}</td>
                            </tr>
                            {tax > 0 && (
                                <tr>
                                    <td>PPN (11%)</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(tax)}</td>
                                </tr>
                            )}
                            <tr className="grand-total">
                                <td>TOTAL</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Notes */}
                {notes && (
                    <div className="doc-notes">
                        <strong>Catatan:</strong> {notes}
                    </div>
                )}

                {/* Signatures */}
                <div className="doc-footer">
                    <div className="sig-box">
                        <div className="sig-line"></div>
                        <p>Dibuat Oleh</p>
                    </div>
                    <div className="sig-box">
                        <div className="sig-line"></div>
                        <p>Disetujui Oleh</p>
                    </div>
                    <div className="sig-box">
                        <div className="sig-line"></div>
                        <p>Diterima Oleh</p>
                    </div>
                </div>

                {children}
            </div>
        </>
    );
}
