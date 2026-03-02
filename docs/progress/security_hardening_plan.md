# Security Hardening Plan

This plan details a comprehensive security upgrade for the High-Security Warehouse Management System, covering Network, Web Server, Application, and Database layers.

## 🛡️ Layer 1: Network & OS Hardening

### 1.1 Firewall (UFW)
**Objective:** Least privilege network access.
*   **Deny all incoming** by default.
*   **Allow outgoing**.
*   **Allow SSH (Port 22)** - Rate limited.
*   **Allow HTTP (Port 80)** - For Let's Encrypt validation & redirection.
*   **Allow HTTPS (Port 443)** - Main encrypted traffic.

### 1.2 Fail2Ban
**Objective:** Prevent Brute Force & DoS.
*   **Jail: SSHD** - Ban after 3 failed login attempts.
*   **Jail: Nginx-Botsearch** - Ban bots scanning for vulnerability endpoints (e.g., `.php`, `wp-admin`).
*   **Jail: Nginx-Req-Limit** - Ban IPs exceeding Nginx rate limits (429/503 errors).

## 🔒 Layer 2: Web Server (Nginx + SSL)

### 2.1 SSL/HTTPS
*   **Provider:** Let's Encrypt (Certbot).
*   **Configuration:**
    *   Disable TLS 1.0/1.1. Enable **TLS 1.2/1.3 only**.
    *   Strong Cipher Suites (ECDHE-ECDSA-AES128-GCM-SHA256, etc.).
    *   **HSTS (Strict-Transport-Security):** Force browsers to use HTTPS for 1 year.
    *   **OCSP Stapling:** Improve performance and privacy.

### 2.2 Hardened Nginx Config
*   **Hide Server Tokens:** `server_tokens off;` (Don't reveal "nginx/1.18.0").
*   **Rate Limiting:**
    *   `limit_req_zone`: 10 requests/second per IP for API.
    *   `limit_conn_zone`: 10 connections per IP.
*   **Block Common Explos:**
    *   Block executable file uploads in static dirs.
    *   Block requests with invalid host headers.

## 🔐 Layer 3: Application Security (FastAPI)

### 3.1 Existing Protections (Verify & Tune)
*   **`RequestShieldMiddleware`:** Existing "WAF-Lite". Keep enabled.
    *   *Action:* Verify it doesn't block legitimate complex strings (e.g., regex in search).
*   **`SecurityHeadersMiddleware`:**
    *   *Action:* Ensure `Content-Security-Policy` matches frontend needs (e.g., Google Fonts, Images).

### 3.2 TrustedHost
*   **Objective:** Prevent Host Header attacks.
*   *Action:* Add `TrustedHostMiddleware` allowing only `hosepro.id` and `localhost`.

### 3.3 Cookie Security
*   *Action:* Ensure all cookies (Auth tokens if in cookie) are `Secure`, `HttpOnly`, and `SameSite=Strict`.

## 👮 Layer 4: Database (Postgres Least Privilege & RLS)

### 4.1 Least Privilege User
**Current:** Uses `postgres` (Superuser) ❌
**New:** Create `hose_app` user.
*   `CONNECT` on database.
*   `USAGE` on schemas.
*   `SELECT, INSERT, UPDATE, DELETE` on tables.
*   **NO** `DROP`, `ALTER`, `TRUNCATE` permissions.

### 4.2 Row Level Security (RLS)
**Objective:** Multi-tenant data isolation at DB level.
**Implementation:**
1.  **Enable RLS** on tables: `inventory_batches`, `job_orders`, `sales_orders`.
2.  **Policy:** `USING (company_id = current_setting('app.current_company_id')::integer)`.
3.  **Middleware Hook:**
    In `app/core/database.py`, before yielding individual sessions:
    ```python
    session.execute(text(f"SET app.current_company_id = '{user.company_id}'"))
    ```

## 🖥️ Layer 5: Frontend (XSS & Client Security)

### 5.1 Sanitize Dangerous Inputs
*   **Audit generic usage:** `dangerouslySetInnerHTML`.
*   **Found Risk:** `Settings.jsx` uses `backupDiv.innerHTML` for constructing download links.
    *   *Fix:* Use standard React DOM creation or `Blob` URL generation instead of string injection.
*   **`antiInspect.jsx`:** Uses `document.documentElement.innerHTML` to wipe DOM on tamper detection.
    *   *Note:* Safe (intentional self-destruction), but aggressive.

### 5.2 CSP (Content Security Policy)
*   Refine `meta` tag or Header CSP to restrict script sources to `'self'` and trusted domains (e.g., Analytics).

---

## 🔐 Layer 6: Encryption Strategy (Data Protection)

### 6.1 Data at Rest (Application Level)
**Critical Finding:** Currently, sensitive settings (SMTP Password, WA API Key) are stored in `localStorage` in plain text.
**Action:**
1.  **Move Settings to Backend:** Create `system_settings` table.
2.  **Field Encryption:** Use **Fernet (Symmetric Encryption)** to encrypt sensitive columns:
    *   `system_settings.smtp_password`
    *   `system_settings.wa_api_key`
    *   `companies.api_key`
3.  **Key Management:** Store the encryption key (`ENCRYPTION_KEY`) in `.env`, strictly separate from the database.

### 6.2 Data at Rest (Database Level)
*   **PostgreSQL Transparent Data Encryption (TDE):** (Enterprise feature, usually).
*   **Alternative:** Ensure the underlying disk (EBS/VM Volume) is encrypted (LUKS/BitLocker).

### 6.3 Backup Encryption
*   **Action:** Encrypt daily database backups using GPG (Asymmetric) before uploading to S3/Cloud.
*   **Action:** Frontend "Backup Image" features must NOT include visible passwords/keys.

---

## 📅 Implementation Roadmap

1.  **Phase 1: Database Hardening (RLS & User)** - *Highest Risk Reduction*
2.  **Phase 2: Encryption (Settings Migration)** - *Critical Data Protection*
3.  **Phase 3: Nginx SSL & Firewall** - *Public Face Hardening*
4.  **Phase 4: Application Middleware Tuning** - *Logic Protection*
5.  **Phase 5: Frontend Cleanup** - *XSS Prevention*
