/**
 * Security Utilities - Free Anti-Phishing Protection
 * No third-party services required
 */

// ================================================
// 1. ALLOWED DOMAINS - Whitelist of valid domains
// ================================================
const ALLOWED_DOMAINS = [
    'localhost',
    '127.0.0.1',
    'hosepro.id',
    'www.hosepro.id',
    'app.hosepro.id',
    // Add your production domains here
];

const ALLOWED_PORTS = ['5173', '5174', '3000', '80', '443', ''];

// ================================================
// 2. DOMAIN VERIFICATION
// ================================================
export function verifyDomain() {
    const currentDomain = window.location.hostname;
    const currentPort = window.location.port;
    const protocol = window.location.protocol;

    const isDomainValid = ALLOWED_DOMAINS.some(domain =>
        currentDomain === domain || currentDomain.endsWith('.' + domain)
    );

    const isPortValid = ALLOWED_PORTS.includes(currentPort);
    const isSecure = protocol === 'https:' || currentDomain === 'localhost' || currentDomain === '127.0.0.1';

    return {
        isValid: isDomainValid && isPortValid,
        isSecure,
        domain: currentDomain,
        port: currentPort,
        protocol,
        message: !isDomainValid
            ? `Domain "${currentDomain}" tidak dikenali!`
            : !isSecure
                ? 'Koneksi tidak aman (HTTP)'
                : 'Aman'
    };
}

// ================================================
// 3. SESSION TOKEN GENERATION & VERIFICATION
// ================================================
const SESSION_KEY = 'hosepro_session_token';
const SESSION_TIMESTAMP_KEY = 'hosepro_session_timestamp';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getFingerprint() {
    // Create a simple device fingerprint
    const data = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.platform
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

export function createSession() {
    const token = generateToken();
    const fingerprint = getFingerprint();
    const timestamp = Date.now();

    const sessionData = {
        token,
        fingerprint,
        created: timestamp,
        domain: window.location.hostname
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, timestamp.toString());

    return sessionData;
}

export function verifySession() {
    try {
        const sessionStr = sessionStorage.getItem(SESSION_KEY);
        const timestampStr = sessionStorage.getItem(SESSION_TIMESTAMP_KEY);

        if (!sessionStr || !timestampStr) {
            return { valid: false, reason: 'No session found' };
        }

        const session = JSON.parse(sessionStr);
        const timestamp = parseInt(timestampStr);
        const now = Date.now();

        // Check expiry
        if (now - timestamp > SESSION_EXPIRY_MS) {
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
            return { valid: false, reason: 'Session expired' };
        }

        // Verify fingerprint
        const currentFingerprint = getFingerprint();
        if (session.fingerprint !== currentFingerprint) {
            return { valid: false, reason: 'Device mismatch' };
        }

        // Verify domain
        if (session.domain !== window.location.hostname) {
            return { valid: false, reason: 'Domain mismatch' };
        }

        return { valid: true, session };
    } catch (e) {
        return { valid: false, reason: 'Session error' };
    }
}

// ================================================
// 4. SECURITY STATUS CHECKER
// ================================================
export function getSecurityStatus() {
    const domain = verifyDomain();
    const session = verifySession();

    const checks = {
        domain: domain.isValid,
        secure: domain.isSecure,
        session: session.valid,
        javascript: true, // If this runs, JS is enabled
        cookies: navigator.cookieEnabled,
        localStorage: (() => {
            try {
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                return true;
            } catch (e) {
                return false;
            }
        })()
    };

    const score = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    const percentage = Math.round((score / total) * 100);

    let level = 'danger';
    if (percentage >= 100) level = 'secure';
    else if (percentage >= 80) level = 'good';
    else if (percentage >= 60) level = 'warning';

    return {
        checks,
        score,
        total,
        percentage,
        level,
        isSecure: percentage >= 80
    };
}

// ================================================
// 5. PHISHING DETECTION
// ================================================
export function detectPhishing() {
    const warnings = [];
    const domain = window.location.hostname;
    const protocol = window.location.protocol;

    // Check for suspicious domain patterns
    const suspiciousPatterns = [
        /hosepro.*\d{2,}/i,  // hosepro123, hosepro-secure99
        /secure.*hosepro/i,   // secure-hosepro
        /hosepro.*login/i,    // hosepro-login
        /hosepro.*verify/i,   // hosepro-verify
        /h0sepro/i,           // Letter substitution (0 for o)
        /hosepro.*\.tk$/i,    // Free TLD
        /hosepro.*\.ml$/i,
        /hosepro.*\.ga$/i,
        /hosepro.*\.cf$/i,
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(domain)) {
            warnings.push({
                type: 'suspicious_domain',
                message: 'Domain mencurigakan terdeteksi'
            });
            break;
        }
    }

    // Check for non-HTTPS in production
    if (protocol !== 'https:' && domain !== 'localhost' && domain !== '127.0.0.1') {
        warnings.push({
            type: 'insecure_connection',
            message: 'Koneksi tidak terenkripsi (HTTP)'
        });
    }

    // Check if in iframe (potential clickjacking)
    if (window.self !== window.top) {
        warnings.push({
            type: 'iframe_embed',
            message: 'Halaman dimuat dalam iframe'
        });
    }

    // Check for data: or javascript: URLs
    if (protocol === 'data:' || protocol === 'javascript:') {
        warnings.push({
            type: 'dangerous_protocol',
            message: 'Protokol berbahaya terdeteksi'
        });
    }

    return {
        isPhishing: warnings.length > 0,
        warnings,
        riskLevel: warnings.length >= 2 ? 'high' : warnings.length === 1 ? 'medium' : 'low'
    };
}

// ================================================
// 6. CONTENT SECURITY POLICY (Meta Tag)
// ================================================
export function applySecurityHeaders() {
    // Add meta CSP tag
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for React
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self' ws: wss: http://localhost:8000 http://127.0.0.1:8000", // For dev server + AI backend
        "frame-ancestors 'self'", // Prevent iframe embedding
    ].join('; ');
    document.head.appendChild(cspMeta);

    // Add X-Content-Type-Options
    const xContentType = document.createElement('meta');
    xContentType.httpEquiv = 'X-Content-Type-Options';
    xContentType.content = 'nosniff';
    document.head.appendChild(xContentType);

    // Add Referrer-Policy
    const referrer = document.createElement('meta');
    referrer.name = 'referrer';
    referrer.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrer);
}

// ================================================
// 7. INITIALIZE ALL SECURITY
// ================================================
export function initializeSecurity() {
    // Apply security headers
    applySecurityHeaders();

    // Verify domain
    const domainCheck = verifyDomain();
    if (!domainCheck.isValid) {
        console.error('[SECURITY] Invalid domain detected:', domainCheck.domain);
    }

    // Create or verify session
    const sessionCheck = verifySession();
    if (!sessionCheck.valid) {
        createSession();
    }

    // Check for phishing
    const phishingCheck = detectPhishing();
    if (phishingCheck.isPhishing) {
        console.warn('[SECURITY] Phishing indicators detected:', phishingCheck.warnings);
    }

    // Return overall status
    return getSecurityStatus();
}
