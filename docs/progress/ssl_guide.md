# 🔒 Enabling SSL for HOSE PRO

## 1. Certificates Generated
Self-signed certificates have been generated in `backend-hose-ai/certs/`:
- `localhost.crt` (Public Certificate)
- `localhost.key` (Private Key)

## 2. Nginx Configuration
The `nginx.conf` has been updated to:
- Redirect HTTP (Port 80) to HTTPS (Port 443).
- Enable SSL/TLS 1.2+
- Add Security Headers (HSTS, X-Frame-Options, etc.)

## 3. How to Run (Docker/Linux)
If you are running Nginx via Docker, map the certificates volume:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./backend-hose-ai/certs:/etc/nginx/certs  <-- IMPORTANT
```

## 4. How to Run (Windows Native)
If you installed Nginx for Windows:
1. Move `certs` folder to `C:\nginx\conf\certs`.
2. Update `nginx.conf` paths from `/etc/nginx/certs` to `C:/nginx/conf/certs`.
3. Restart Nginx: `nginx -s reload`

## 5. Trusting the Certificate
Since it is **Self-Signed**, your browser will show a warning ("Not Secure").
- **Chrome/Edge**: Type `thisisunsafe` anywhere on the warning screen to bypass.
- **Production**: Replace these certs with real ones from Let's Encrypt.
