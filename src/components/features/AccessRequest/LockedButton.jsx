import { useAccessRequest } from '../../../contexts/AccessRequestContext';
import './LockedButton.css';

/**
 * LockedButton - A button that appears locked (🔒) if user doesn't have access
 * Clicking on a locked button opens the access request modal
 */
export default function LockedButton({
    featureId,
    children,
    onClick,
    variant = 'primary',
    className = '',
    ...props
}) {
    const { hasFeatureAccess, openRequestModal, getGrantRemainingTime } = useAccessRequest();

    const hasAccess = hasFeatureAccess(featureId);
    const remainingTime = getGrantRemainingTime(featureId);
    const isTemporary = remainingTime !== null;

    const handleClick = (e) => {
        if (hasAccess) {
            onClick?.(e);
        } else {
            e.preventDefault();
            openRequestModal(featureId);
        }
    };

    const formatTime = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    return (
        <button
            className={`locked-button ${variant} ${!hasAccess ? 'locked' : ''} ${isTemporary ? 'temporary' : ''} ${className}`}
            onClick={handleClick}
            {...props}
        >
            {!hasAccess && <span className="lock-icon">🔒</span>}
            {isTemporary && <span className="temp-indicator">⏱️</span>}
            <span className="button-content">{children}</span>
            {!hasAccess && <span className="unlock-hint">Minta Akses</span>}
            {isTemporary && remainingTime && (
                <span className="temp-timer">{formatTime(remainingTime)}</span>
            )}
        </button>
    );
}
