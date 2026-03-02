import { useState } from 'react';
import './GlobalSearch.css';

import { api } from '../../../services/api';

export default function GlobalSearch({ isOpen, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await api.get('/search/global', { params: { q: searchQuery } });
            if (res.data.found) {
                setSearchResult(res.data);
            } else {
                setSearchResult(null);
                // Optional: Show toast or small error
                alert(`Tidak ditemukan data untuk "${searchQuery}"`);
            }
        } catch (err) {
            console.error("Search error:", err);
            alert("Gagal melakukan pencarian via server.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleClose = () => {
        setSearchQuery('');
        setSearchResult(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="global-search-overlay" onClick={handleClose}>
            <div className="global-search-modal" onClick={(e) => e.stopPropagation()}>
                <form className="search-form" onSubmit={handleSearch}>
                    <div className="search-input-wrapper">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Cari Hose ID, QR Code, atau Serial Number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="clear-btn"
                                onClick={() => { setSearchQuery(''); setSearchResult(null); }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <button type="submit" className="search-btn" disabled={isSearching}>
                        {isSearching ? 'Mencari...' : 'Track'}
                    </button>
                </form>

                {searchResult && (
                    <div className="search-result">
                        <div className="result-header">
                            <div className="result-id-section">
                                <span className="result-id">{searchResult.hoseId}</span>
                                <span className="result-spec">{searchResult.spec}</span>
                            </div>
                            <span className={`result-status status-${searchResult.status.toLowerCase()}`}>
                                {searchResult.status}
                            </span>
                        </div>

                        <div className="timeline">
                            <h4 className="timeline-title">Riwayat Kehidupan Selang</h4>
                            {searchResult.events.map((event, idx) => (
                                <div key={idx} className="timeline-item">
                                    <div className="timeline-dot"></div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <span className="timeline-action">{event.action}</span>
                                            <span className="timeline-date">{event.date}</span>
                                        </div>
                                        <div className="timeline-detail">{event.detail}</div>
                                        <div className="timeline-user">oleh {event.user}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="search-tips">
                    <span className="tip-label">Tips:</span>
                    <span className="tip-text">Ketik H-2024-889-01 atau scan QR code selang</span>
                </div>
            </div>
        </div>
    );
}
