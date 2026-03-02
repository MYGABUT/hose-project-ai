"""
Rate Limiter Configuration 🚦
Fortress Mode 2.0 - Anti-DoS / Anti-Scraping

Uses slowapi (production-ready, based on limits library).
In-memory backend by default. For multi-instance deployment, switch to Redis.

Rate Limits:
- Global: 100 requests/minute per IP
- Auth:   5 login attempts/minute per IP
- Write:  30 create/update/delete per minute per IP
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Create the limiter instance
# key_func: Identifies the client (by IP address)
# default_limits: Applied to ALL endpoints unless overridden
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri="memory://",  # Switch to "redis://localhost:6379" for distributed
)

# Rate limit strings for reuse
RATE_AUTH = "5/minute"       # Login: max 5 per minute per IP
RATE_WRITE = "30/minute"     # Create/Update: max 30 per minute
RATE_UPLOAD = "10/minute"    # File uploads: max 10 per minute
RATE_EXPORT = "5/minute"     # Data exports: max 5 per minute
