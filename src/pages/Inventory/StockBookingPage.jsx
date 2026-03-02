/**
 * Stock Booking Page - Manage Sales/Service Reservations
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import '../Admin/Admin.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function StockBookingPage() {
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/bookings/active`);
            const data = await res.json();
            if (data.status === 'success') setBookings(data.data || []);
        } catch (err) {
            console.error('Error:', err);
        }
        setLoading(false);
    };

    const releaseBooking = async (id) => {
        if (!confirm('Lepas booking ini? Stok akan kembali Available.')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${id}/release`, { method: 'POST' });
            if (res.ok) loadData();
        } catch (err) {
            console.error('Error:', err);
        }
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🔒 Stock Booking</h1>
                    <p className="page-subtitle">Daftar stok yang di-book sales/teknisi</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                </div>
            </div>

            <div className="log-list">
                {loading ? <div className="loading-state">Memuat data...</div> : bookings.length === 0 ? <Card className="empty-state"><p>Tidak ada booking aktif</p></Card> : bookings.map(b => (
                    <Card key={b.id} className="log-card">
                        <div className="log-header">
                            <span className="log-entity" style={{ color: '#ef4444' }}>🔒 Qty: {b.qty}</span>
                            <span className="log-user">👤 Booked by: {b.booked_by_name}</span>
                            <span className="log-time">Exp: {new Date(b.expiry_date).toLocaleDateString()}</span>
                        </div>
                        <div className="log-body">
                            <div className="log-detail" style={{ marginBottom: '8px' }}>
                                <strong>Untuk Customer:</strong> {b.customer_name}
                            </div>
                            {b.notes && <div className="log-detail" style={{ color: 'var(--color-text-secondary)' }}>"{b.notes}"</div>}

                            <div className="transfer-actions" style={{ marginTop: '12px' }}>
                                <Button size="sm" variant="secondary" onClick={() => releaseBooking(b.id)}>🔓 Release Stok</Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
