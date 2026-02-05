import './Button.css';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    icon,
    onClick,
    type = 'button',
    className = ''
}) {
    return (
        <button
            type={type}
            className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`}
            disabled={disabled || loading}
            onClick={onClick}
        >
            {loading && (
                <span className="btn-loader">
                    <svg className="spinner" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
                    </svg>
                </span>
            )}
            {icon && !loading && <span className="btn-icon">{icon}</span>}
            <span className="btn-text">{children}</span>
        </button>
    );
}
