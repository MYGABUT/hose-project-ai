import { useNotification } from '../../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import './NotificationPanel.css';

export default function NotificationPanel() {
    const {
        notifications,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
        setIsOpen
    } = useNotification();
    const navigate = useNavigate();

    const handleItemClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'approval': return '📝';
            default: return 'ℹ️';
        }
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Baru saja';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
        return date.toLocaleDateString('id-ID');
    };

    return (
        <div className="notification-panel">
            <div className="notification-header">
                <h3>Notifikasi</h3>
                <div className="header-actions">
                    <button onClick={markAllAsRead} className="text-btn">Tandai dibaca</button>
                    <button onClick={clearAll} className="text-btn">Hapus semua</button>
                </div>
            </div>

            <div className="notification-list">
                {notifications.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🔕</span>
                        <p>Tidak ada notifikasi baru</p>
                    </div>
                ) : (
                    notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`notification-item ${!notification.read ? 'unread' : ''}`}
                            onClick={() => handleItemClick(notification)}
                        >
                            <div className="notification-icon">
                                {getIcon(notification.type)}
                            </div>
                            <div className="notification-content">
                                <div className="notification-title">
                                    {notification.title}
                                    {!notification.read && <span className="unread-dot" />}
                                </div>
                                <p className="notification-message">{notification.message}</p>
                                <span className="notification-time">{formatTime(notification.createdAt)}</span>
                            </div>
                            <button
                                className="delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notification.id);
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
