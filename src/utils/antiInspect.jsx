import { useEffect, useRef } from 'react';

/**
 * Advanced Anti-Inspect Protection
 * Multiple layers of protection against DevTools and code inspection
 */
export function useAntiInspect(enabled = true) {
    const devToolsOpen = useRef(false);
    const checkCount = useRef(0);

    useEffect(() => {
        if (!enabled) return;

        // ==========================================
        // LAYER 1: Disable all keyboard shortcuts
        // ==========================================
        const handleKeyDown = (e) => {
            // Block F12
            if (e.keyCode === 123) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }

            // Block Ctrl+Shift+I/J/C
            if (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }

            // Block Ctrl+U (View Source)
            if (e.ctrlKey && e.keyCode === 85) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }

            // Block Ctrl+S (Save)
            if (e.ctrlKey && e.keyCode === 83) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }

            // Block Ctrl+A (Select All)
            if (e.ctrlKey && e.keyCode === 65) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }

            // Block Ctrl+C (Copy) outside inputs
            if (e.ctrlKey && e.keyCode === 67) {
                const target = e.target;
                if (!['INPUT', 'TEXTAREA'].includes(target.tagName)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        };

        // ==========================================
        // LAYER 2: Disable right-click everywhere
        // ==========================================
        const handleContextMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        // ==========================================
        // LAYER 3: DevTools detection via debugger timing
        // ==========================================
        const detectWithDebugger = () => {
            const start = performance.now();
            // eslint-disable-next-line no-debugger
            debugger;
            const end = performance.now();

            if (end - start > 100) {
                handleDevToolsDetected('debugger');
            }
        };

        // ==========================================
        // LAYER 4: DevTools detection via window size
        // ==========================================
        const detectWithSize = () => {
            const widthThreshold = window.outerWidth - window.innerWidth > 160;
            const heightThreshold = window.outerHeight - window.innerHeight > 160;

            if (widthThreshold || heightThreshold) {
                handleDevToolsDetected('size');
            }
        };

        // ==========================================
        // LAYER 5: DevTools detection via console.log override
        // ==========================================
        const detectWithConsole = () => {
            const element = new Image();
            Object.defineProperty(element, 'id', {
                get: function () {
                    handleDevToolsDetected('console');
                    return 'devtools-detected';
                }
            });
            console.log('%c', element);
        };

        // ==========================================
        // LAYER 6: DevTools detection via toString
        // ==========================================
        const detectWithToString = () => {
            const div = document.createElement('div');
            Object.defineProperty(div, 'id', {
                get: function () {
                    handleDevToolsDetected('toString');
                    return 'probe';
                }
            });
            console.log(div);
        };

        // ==========================================
        // ACTION: When DevTools is detected
        // ==========================================
        const handleDevToolsDetected = (method) => {
            checkCount.current++;

            if (!devToolsOpen.current) {
                devToolsOpen.current = true;

                // Clear console
                console.clear();

                // Show warning
                console.log('%c⛔ AKSES DITOLAK', 'color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px 0 black;');
                console.log('%cDeveloper Tools tidak diizinkan pada aplikasi ini.', 'color: orange; font-size: 18px;');
                console.log('%cTindakan ini telah dicatat.', 'color: gray; font-size: 14px;');

                // Log attempt (in real app, send to server)
                const timestamp = new Date().toISOString();
                console.warn(`[SECURITY] DevTools detected via ${method} at ${timestamp}`);

                // AGGRESSIVE ACTION: Destroy page content
                setTimeout(() => {
                    if (devToolsOpen.current) {
                        // Replace entire page
                        document.documentElement.innerHTML = `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Akses Ditolak</title>
                                <style>
                                    * { margin: 0; padding: 0; box-sizing: border-box; }
                                    body {
                                        min-height: 100vh;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                                        font-family: system-ui, -apple-system, sans-serif;
                                    }
                                    .container {
                                        text-align: center;
                                        color: white;
                                        padding: 40px;
                                    }
                                    .icon { font-size: 80px; margin-bottom: 20px; }
                                    h1 { font-size: 36px; margin-bottom: 10px; color: #ff4444; }
                                    p { color: #888; margin-bottom: 20px; }
                                    .warning { 
                                        background: rgba(255,68,68,0.1); 
                                        border: 1px solid #ff4444;
                                        padding: 15px 25px;
                                        border-radius: 8px;
                                        color: #ff6666;
                                        display: inline-block;
                                    }
                                    a { color: #4da6ff; text-decoration: none; display: block; margin-top: 30px; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="icon">🚫</div>
                                    <h1>AKSES DITOLAK</h1>
                                    <p>Developer Tools tidak diizinkan pada aplikasi ini.</p>
                                    <div class="warning">
                                        ⚠️ Percobaan inspeksi telah dicatat untuk keamanan.
                                    </div>
                                    <a href="${window.location.origin}">← Kembali ke Halaman Utama</a>
                                </div>
                            </body>
                            </html>
                        `;

                        // Prevent further interaction
                        document.addEventListener('keydown', (e) => e.preventDefault(), true);
                        document.addEventListener('contextmenu', (e) => e.preventDefault(), true);
                    }
                }, 500);
            }
        };

        // ==========================================
        // LAYER 7: Disable text selection CSS
        // ==========================================
        const style = document.createElement('style');
        style.id = 'anti-inspect-style';
        style.textContent = `
            * {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
            }
            input, textarea, [contenteditable="true"] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
            ::selection { background: transparent !important; }
            ::-moz-selection { background: transparent !important; }
        `;
        document.head.appendChild(style);

        // ==========================================
        // LAYER 8: Disable drag
        // ==========================================
        const handleDragStart = (e) => {
            e.preventDefault();
            return false;
        };

        // ==========================================
        // LAYER 9: Continuous monitoring
        // ==========================================
        const monitorInterval = setInterval(() => {
            detectWithSize();
            detectWithConsole();
        }, 1000);

        // Initial debugger detection with interval
        const debuggerInterval = setInterval(() => {
            if (!devToolsOpen.current) {
                detectWithDebugger();
            }
        }, 3000);

        // ==========================================
        // LAYER 10: Disable print
        // ==========================================
        const handleBeforePrint = () => {
            document.body.style.display = 'none';
        };

        // Add all event listeners
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('contextmenu', handleContextMenu, true);
        document.addEventListener('dragstart', handleDragStart, true);
        window.addEventListener('beforeprint', handleBeforePrint);

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('contextmenu', handleContextMenu, true);
            document.removeEventListener('dragstart', handleDragStart, true);
            window.removeEventListener('beforeprint', handleBeforePrint);
            clearInterval(monitorInterval);
            clearInterval(debuggerInterval);
            const existingStyle = document.getElementById('anti-inspect-style');
            if (existingStyle) existingStyle.remove();
        };
    }, [enabled]);
}

/**
 * Anti-Inspect Component Wrapper
 * Wrap your entire app with this component
 */
export default function AntiInspect({ children, enabled = true }) {
    useAntiInspect(enabled);

    // Add self-destruct on iframe embed attempt
    useEffect(() => {
        if (!enabled) return;

        // Prevent embedding in iframe (clickjacking protection)
        if (window.self !== window.top) {
            window.top.location = window.self.location;
        }
    }, [enabled]);

    return children;
}
