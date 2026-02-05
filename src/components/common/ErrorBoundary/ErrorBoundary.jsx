import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#dc3545' }}>
                    <h2>⚠️ Terjadi Kesalahan (Something went wrong)</h2>
                    <p>Silakan refresh halaman atau hubungi support.</p>
                    <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', textAlign: 'left', background: '#f8f9fa', padding: '1rem' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Refresh Halaman
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
