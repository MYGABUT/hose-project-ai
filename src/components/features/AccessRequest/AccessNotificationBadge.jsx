import { useAccessRequest } from '../../../contexts/AccessRequestContext';
import './AccessNotificationBadge.css';

export default function AccessNotificationBadge() {
    const { getPendingRequestsForApprover, openApprovalModal } = useAccessRequest();

    const pendingRequests = getPendingRequestsForApprover();

    if (pendingRequests.length === 0) return null;

    return (
        <div className="access-notification-wrapper">
            <button
                className="access-notification-badge"
                onClick={() => openApprovalModal(pendingRequests[0])}
            >
                <span className="badge-icon">🔔</span>
                <span className="badge-count">{pendingRequests.length}</span>
                <span className="badge-text">Permintaan Akses</span>
            </button>
        </div>
    );
}
