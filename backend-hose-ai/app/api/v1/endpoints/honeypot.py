"""
Honeypot Endpoints — Fortress Mode 3.0 🍯
Fake endpoints that only hackers/scanners would hit.

Purpose:
- Detect automated scanning tools (Nmap, Nikto, DirBuster, etc.)
- Log attacker IPs, User-Agents, and payloads
- Build a "suspicious IP" watchlist for AuditLog
- Zero false positives (real users never hit these paths)
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

logger = logging.getLogger("security.honeypot")

router = APIRouter(tags=["Honeypot — DO NOT DOCUMENT"])


# ============ Trap Paths ============
# These mimic common targets that attackers/scanners look for.

TRAP_PATHS = [
    "/admin",
    "/wp-admin",
    "/wp-login.php",
    "/phpmyadmin",
    "/.env",
    "/.git/config",
    "/api/v1/debug",
    "/api/v1/config",
    "/server-status",
    "/actuator",
    "/elmah.axd",
    "/console",
]


def _log_honeypot_hit(request: Request, trap_path: str):
    """Log all details of a honeypot trigger."""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    logger.warning(
        f"🍯 HONEYPOT TRIGGERED | "
        f"Path={trap_path} | "
        f"IP={client_ip} | "
        f"UA={user_agent[:200]} | "
        f"Method={request.method} | "
        f"Time={datetime.now(timezone.utc).isoformat()}"
    )


# ============ Trap Endpoints ============

@router.get("/admin")
@router.post("/admin")
async def trap_admin(request: Request):
    _log_honeypot_hit(request, "/admin")
    # Return a fake "login page" to keep attacker engaged
    return JSONResponse(
        status_code=200,
        content={"error": "Authentication required", "login_url": "/admin/login"},
    )


@router.get("/wp-admin")
@router.get("/wp-login.php")
async def trap_wordpress(request: Request):
    _log_honeypot_hit(request, request.url.path)
    return JSONResponse(
        status_code=200,
        content={"error": "WordPress not found on this server"},
    )


@router.get("/phpmyadmin")
@router.get("/pma")
async def trap_phpmyadmin(request: Request):
    _log_honeypot_hit(request, request.url.path)
    return JSONResponse(
        status_code=200,
        content={"error": "phpMyAdmin access restricted"},
    )


@router.get("/.env")
@router.get("/.git/config")
async def trap_dotfiles(request: Request):
    _log_honeypot_hit(request, request.url.path)
    # Return fake .env to waste attacker's time
    return JSONResponse(
        status_code=200,
        content={
            "DATABASE_URL": "postgresql://fake:fake@honeypot:5432/fake_db",
            "SECRET_KEY": "this-is-a-honeypot-you-are-being-tracked",
            "AWS_KEY": "AKIA-HONEYPOT-TRACKED",
        },
    )


@router.get("/api/v1/debug")
@router.get("/api/v1/config")
async def trap_debug(request: Request):
    _log_honeypot_hit(request, request.url.path)
    return JSONResponse(
        status_code=200,
        content={"debug": False, "version": "0.0.0", "note": "Honeypot"},
    )


@router.get("/server-status")
@router.get("/actuator")
@router.get("/actuator/health")
async def trap_server_info(request: Request):
    _log_honeypot_hit(request, request.url.path)
    return JSONResponse(
        status_code=200,
        content={"status": "running", "uptime": "0d", "server": "Apache/2.4.41"},
    )


@router.get("/console")
@router.get("/elmah.axd")
async def trap_console(request: Request):
    _log_honeypot_hit(request, request.url.path)
    return JSONResponse(
        status_code=200,
        content={"error": "Console access restricted"},
    )
