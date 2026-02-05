import './MaterialVerification.css';

export default function MaterialVerification({ hose, fitting }) {
    return (
        <div className="material-verification">
            <h3 className="verification-title">VERIFIKASI MATERIAL (Visual Check)</h3>
            <div className="material-grid">
                <div className={`material-card ${hose?.verified ? 'verified' : ''}`}>
                    <div className="material-image">
                        {hose?.image ? (
                            <img src={hose.image} alt={hose.name} />
                        ) : (
                            <div className="image-placeholder">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="M21 15l-5-5L5 21" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="material-info">
                        <div className="material-type">HOSE</div>
                        <div className="material-name">{hose?.brand} {hose?.type} - {hose?.size}</div>
                        <div className={`scan-status ${hose?.verified ? 'scan-verified' : 'scan-pending'}`}>
                            {hose?.verified ? (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 12l2 2 4-4" />
                                        <circle cx="12" cy="12" r="10" />
                                    </svg>
                                    Sudah Discan
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 6v6l4 2" />
                                    </svg>
                                    Belum Discan
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`material-card ${fitting?.verified ? 'verified' : ''}`}>
                    <div className="material-image">
                        {fitting?.image ? (
                            <img src={fitting.image} alt={fitting.name} />
                        ) : (
                            <div className="image-placeholder">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <circle cx="12" cy="12" r="4" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="material-info">
                        <div className="material-type">FITTING</div>
                        <div className="material-name">{fitting?.type} - {fitting?.size}</div>
                        <div className={`scan-status ${fitting?.verified ? 'scan-verified' : 'scan-pending'}`}>
                            {fitting?.verified ? (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 12l2 2 4-4" />
                                        <circle cx="12" cy="12" r="10" />
                                    </svg>
                                    Sudah Discan
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 6v6l4 2" />
                                    </svg>
                                    Belum Discan
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
