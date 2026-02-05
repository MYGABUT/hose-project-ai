import './Card.css';

export default function Card({
    children,
    title,
    subtitle,
    headerAction,
    padding = 'md',
    variant = 'default',
    className = ''
}) {
    return (
        <div className={`card card-${variant} card-padding-${padding} ${className}`}>
            {(title || headerAction) && (
                <div className="card-header">
                    <div className="card-header-text">
                        {title && <h3 className="card-title">{title}</h3>}
                        {subtitle && <p className="card-subtitle">{subtitle}</p>}
                    </div>
                    {headerAction && (
                        <div className="card-header-action">{headerAction}</div>
                    )}
                </div>
            )}
            <div className="card-body">
                {children}
            </div>
        </div>
    );
}
