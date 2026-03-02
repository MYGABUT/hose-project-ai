"""
Request Shield — Fortress Mode 3.0 🛡️
Application-Level WAF (Web Application Firewall)

Inspects ALL incoming requests for:
- SQL Injection patterns
- XSS (Cross-Site Scripting) payloads
- Path Traversal attacks
- Command Injection attempts
- Null Byte / CRLF injection
- Oversized request bodies

WARNING: This is a DEFENSE-IN-DEPTH layer, NOT a replacement for
parameterized queries and input validation!
"""
import re
import logging
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("security.shield")

# ============ Malicious Patterns ============

SQLI_PATTERNS = [
    r"(?i)\b(union\s+(all\s+)?select)\b",
    r"(?i)\b(drop\s+table)\b",
    r"(?i)\b(insert\s+into)\b",
    r"(?i)\b(delete\s+from)\b",
    r"(?i)\b(update\s+\w+\s+set)\b",
    r"(?i)(--\s|/\*|\*/|;--)",
    r"(?i)\b(or\s+1\s*=\s*1)\b",
    r"(?i)\b(and\s+1\s*=\s*1)\b",
    r"(?i)('\s*(or|and)\s+')",
    r"(?i)(sleep\s*\(\s*\d+\s*\))",
    r"(?i)(benchmark\s*\()",
    r"(?i)(waitfor\s+delay)",
]

XSS_PATTERNS = [
    r"<script[^>]*>",
    r"(?i)(javascript\s*:)",
    r"(?i)(on(error|load|click|mouseover|focus|blur)\s*=)",
    r"(?i)(<\s*img[^>]+src\s*=\s*[\"']?\s*javascript)",
    r"(?i)(<\s*iframe)",
    r"(?i)(<\s*object)",
    r"(?i)(<\s*embed)",
    r"(?i)(document\.(cookie|write|domain))",
    r"(?i)(window\.(location|open))",
]

TRAVERSAL_PATTERNS = [
    r"\.\./\.\./",
    r"(?i)(/etc/passwd)",
    r"(?i)(/etc/shadow)",
    r"(?i)(\.\.\\\\)",
    r"%2e%2e%2f",
    r"%252e%252e%252f",
]

INJECTION_PATTERNS = [
    r"(?i)(exec\s*\()",
    r"(?i)(eval\s*\()",
    r"(?i)(system\s*\()",
    r"(?i)(__import__\s*\()",
    r"(?i)(subprocess\s*\.)",
    r"(?i)(os\s*\.\s*(system|popen|exec))",
]

SPECIAL_CHAR_PATTERNS = [
    r"\x00",           # Null byte
    r"\r\n.*\r\n",     # CRLF injection
]

# Combine all patterns
ALL_PATTERNS = (
    [(p, "SQL_INJECTION") for p in SQLI_PATTERNS] +
    [(p, "XSS") for p in XSS_PATTERNS] +
    [(p, "PATH_TRAVERSAL") for p in TRAVERSAL_PATTERNS] +
    [(p, "COMMAND_INJECTION") for p in INJECTION_PATTERNS] +
    [(p, "SPECIAL_CHAR") for p in SPECIAL_CHAR_PATTERNS]
)

# Compile for performance
COMPILED_PATTERNS = [(re.compile(p), label) for p, label in ALL_PATTERNS]

# Safe paths that skip WAF (e.g., docs which contain code examples)
SAFE_PATHS = {"/docs", "/redoc", "/openapi.json", "/health"}

# Max limits
MAX_BODY_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_URL_LENGTH = 4096
MAX_QUERY_PARAM_LENGTH = 2048


def _scan_string(value: str) -> tuple[bool, str]:
    """Scan a string against all malicious patterns."""
    for pattern, label in COMPILED_PATTERNS:
        if pattern.search(value):
            return True, label
    return False, ""


class RequestShieldMiddleware(BaseHTTPMiddleware):
    """
    Application-level WAF.
    Scans URLs, query params, headers, and request bodies.
    """

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        
        # Skip safe paths
        if path in SAFE_PATHS:
            return await call_next(request)
        
        # 1. Check URL length
        full_url = str(request.url)
        if len(full_url) > MAX_URL_LENGTH:
            logger.warning(f"🛡️ SHIELD BLOCK | URL_TOO_LONG | IP={client_ip} | Len={len(full_url)}")
            return JSONResponse(
                status_code=413,
                content={"detail": "Request URL too long"},
            )
        
        # 2. Scan URL path
        is_malicious, attack_type = _scan_string(path)
        if is_malicious:
            logger.warning(
                f"🛡️ SHIELD BLOCK | {attack_type} in URL | IP={client_ip} | Path={path}"
            )
            return JSONResponse(
                status_code=403,
                content={"detail": "Malicious request blocked"},
            )
        
        # 3. Scan query parameters
        for key, value in request.query_params.items():
            if len(value) > MAX_QUERY_PARAM_LENGTH:
                logger.warning(
                    f"🛡️ SHIELD BLOCK | PARAM_TOO_LONG | IP={client_ip} | Key={key}"
                )
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Query parameter '{key}' too long"},
                )
            
            for check_val in [key, value]:
                is_malicious, attack_type = _scan_string(check_val)
                if is_malicious:
                    logger.warning(
                        f"🛡️ SHIELD BLOCK | {attack_type} in QueryParam | "
                        f"IP={client_ip} | Key={key}"
                    )
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Malicious request blocked"},
                    )
        
        # 4. Scan request body (for POST/PUT/PATCH)
        if request.method in ("POST", "PUT", "PATCH"):
            # Check content-length
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > MAX_BODY_SIZE:
                logger.warning(
                    f"🛡️ SHIELD BLOCK | BODY_TOO_LARGE | IP={client_ip} | "
                    f"Size={content_length}"
                )
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Request body too large (max 10MB)"},
                )
            
            # Read and scan body
            try:
                body = await request.body()
                body_str = body.decode("utf-8", errors="ignore")
                
                if body_str:
                    is_malicious, attack_type = _scan_string(body_str)
                    if is_malicious:
                        logger.warning(
                            f"🛡️ SHIELD BLOCK | {attack_type} in Body | "
                            f"IP={client_ip} | Path={path}"
                        )
                        return JSONResponse(
                            status_code=403,
                            content={"detail": "Malicious request blocked"},
                        )
            except Exception:
                pass  # Binary uploads, etc.
        
        # 5. Scan suspicious headers
        for header_name in ["referer", "x-forwarded-for", "x-custom-header"]:
            header_val = request.headers.get(header_name, "")
            if header_val:
                is_malicious, attack_type = _scan_string(header_val)
                if is_malicious:
                    logger.warning(
                        f"🛡️ SHIELD BLOCK | {attack_type} in Header({header_name}) | "
                        f"IP={client_ip}"
                    )
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Malicious request blocked"},
                    )
        
        return await call_next(request)
