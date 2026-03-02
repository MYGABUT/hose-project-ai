"""
Security Middleware Stack 🛡️
Fortress Mode 2.0 - OWASP API Security 2024 Compliant

Includes:
1. Security Headers (Anti-XSS, Anti-Clickjacking, HSTS)
2. Request ID Tracking (Forensics)
3. IP Logging (Audit Trail)
"""
import uuid
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("security.middleware")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to every response.
    Based on OWASP Secure Headers Project (2024).
    """

    async def dispatch(self, request: Request, call_next):
        # Generate unique Request ID for tracing
        request_id = str(uuid.uuid4())[:8]
        
        start_time = time.time()
        response: Response = await call_next(request)
        process_time = time.time() - start_time

        # ===== SECURITY HEADERS =====
        
        # Prevent MIME-type sniffing (Anti-XSS via file upload)
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent Clickjacking (iframe embedding)
        response.headers["X-Frame-Options"] = "DENY"
        
        # XSS Protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer Policy (prevent leaking internal URLs)
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy (disable unused browser features)
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), magnetometer=()"
        )
        
        # Content Security Policy (Anti-XSS injection)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "connect-src 'self'"
        )
        
        # HSTS (Force HTTPS) - SSL is now active
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # ===== TRACKING HEADERS =====
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.3f}s"
        
        # Remove server identification (don't reveal tech stack)
        if "server" in response.headers:
            del response.headers["server"]
        
        return response


class AuditLogMiddleware(BaseHTTPMiddleware):
    """
    Logs every request for security auditing.
    Captures: IP, Method, Path, Status, Duration.
    """

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        path = request.url.path
        
        start = time.time()
        response = await call_next(request)
        duration = time.time() - start
        
        # Log suspicious patterns
        status = response.status_code
        if status in (401, 403, 422):
            logger.warning(
                f"🚨 SECURITY EVENT | IP={client_ip} | {method} {path} | "
                f"Status={status} | Duration={duration:.3f}s"
            )
        elif status >= 500:
            logger.error(
                f"💥 SERVER ERROR | IP={client_ip} | {method} {path} | "
                f"Status={status} | Duration={duration:.3f}s"
            )
        else:
            logger.info(
                f"✅ {method} {path} | IP={client_ip} | "
                f"Status={status} | {duration:.3f}s"
            )
        
        return response


import collections
from datetime import datetime, timedelta
from fastapi.responses import JSONResponse

# In-memory brute-force tracker: {ip: [(timestamp, endpoint), ...]}
_failed_attempts: dict = collections.defaultdict(list)

FAILED_LOGIN_THRESHOLD = 10  # block after 10 failures
BLOCK_WINDOW_MINUTES = 15    # within 15 minutes
BLOCK_DURATION_MINUTES = 30  # blocked for 30 minutes

# Store blocked IPs: {ip: blocked_until_datetime}
_blocked_ips: dict = {}


class BruteForceProtectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to detect and block brute-force login attacks.
    Tracks failed auth attempts per IP and temporarily blocks repeat offenders.
    """
    AUTH_PATHS = ["/api/v1/auth/login", "/api/v1/token"]

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"

        # ✅ Check if IP is currently blocked
        if client_ip in _blocked_ips:
            if datetime.utcnow() < _blocked_ips[client_ip]:
                retry_after = int((_blocked_ips[client_ip] - datetime.utcnow()).total_seconds())
                logger.warning(f"Blocked IP attempt: {client_ip} - Retry-After: {retry_after}s")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many failed attempts. Try again later."},
                    headers={"Retry-After": str(retry_after)}
                )
            else:
                # Block expired, clean up
                del _blocked_ips[client_ip]
                _failed_attempts[client_ip] = []

        response = await call_next(request)

        # Track failures only on auth endpoints
        is_auth_path = any(request.url.path.startswith(p) for p in self.AUTH_PATHS)
        if is_auth_path and response.status_code in (401, 403):
            now = datetime.utcnow()
            window_start = now - timedelta(minutes=BLOCK_WINDOW_MINUTES)

            # Prune old attempts
            _failed_attempts[client_ip] = [
                t for t in _failed_attempts[client_ip] if t > window_start
            ]
            _failed_attempts[client_ip].append(now)

            attempts = len(_failed_attempts[client_ip])
            logger.warning(f"Failed login from {client_ip}: {attempts}/{FAILED_LOGIN_THRESHOLD} attempts")

            if attempts >= FAILED_LOGIN_THRESHOLD:
                _blocked_ips[client_ip] = now + timedelta(minutes=BLOCK_DURATION_MINUTES)
                logger.critical(f"IP BLOCKED: {client_ip} - {BLOCK_DURATION_MINUTES}min")

        return response
