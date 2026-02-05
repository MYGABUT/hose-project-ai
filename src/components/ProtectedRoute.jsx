import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, permission }) {
    const { isAuthenticated, isLoading, hasPermission } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Memuat...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to login with return URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check permission if specified
    if (permission && !hasPermission(permission)) {
        return (
            <div className="access-denied">
                <div className="denied-content">
                    <span className="denied-icon">🚫</span>
                    <h2>Akses Ditolak</h2>
                    <p>Anda tidak memiliki izin untuk mengakses halaman ini.</p>
                    <button onClick={() => window.history.back()}>
                        ← Kembali
                    </button>
                </div>
            </div>
        );
    }

    return children;
}
