# BeSQL — Security Guidance

This document lists basic security features and best practices relevant to BeSQL: API security, user data protection, and safe use of local storage.

## 1. API Security
- Use HTTPS for all endpoints; enforce HSTS and secure cookies.
- Authenticate requests using short-lived tokens (JWT or opaque tokens) with proper signing and rotation.
- Authorize per-resource and per-action: implement role-based access control (RBAC) or scopes.
- Validate and sanitize all input server-side to prevent injection (SQL/NoSQL/command injection).
- Apply rate limiting and abuse protection on endpoints (login, submit, sync).
- Use parameterized queries or prepared statements on the server; never interpolate user SQL without restriction.
- Log suspicious activity and alert on anomalous patterns.

## 2. User Data Security
- Store only necessary PII; minimize retention and follow the principle of least privilege.
- Hash passwords with a strong algorithm (e.g., Argon2, bcrypt, or scrypt) and a per-user salt.
- For sensitive data at rest, use encryption (e.g., AES-256) and manage keys securely (KMS or vault).
- Ensure access controls protect user records; avoid exposing internal IDs or metadata in public APIs.
- Implement account recovery flows securely (email confirmation, time-limited tokens).
- Use secure session management: mark cookies HttpOnly, Secure, SameSite=strict where appropriate.

## 3. Local Storage / Client-side Storage
- Treat localStorage/sessionStorage as untrusted and accessible to any script running in the page.
- Never store sensitive secrets, long-lived API keys, or plaintext credentials in localStorage.
- Store minimal state (UI preferences, non-sensitive caches). Prefer server-side or encrypted storage for critical data.
- If you must cache tokens client-side, use short expiry and refresh tokens stored in HttpOnly cookies where possible.
- Consider encrypting local values with a key derived from user credentials (complex and often avoided).

## 4. Secure Defaults for BeSQL
- Default to read-only or least-privilege modes when possible (e.g., editors in view-only for unauthenticated users).
- Sanitize rendered problem descriptions and user-submitted content (escape HTML; allow a narrow safe subset if rich text).
- Rate-limit submissions and judge actions to reduce abuse.
- Use Content Security Policy (CSP) to restrict allowed script sources and mitigate XSS.
- Use Subresource Integrity (SRI) for third-party script includes when possible.

## 5. Deployment & Operational Practices
- Keep dependencies up to date and run automated dependency scans.
- Harden servers: disable unnecessary services, run minimal privileges, use firewalls.
- Back up critical data and test restores regularly.
- Protect database credentials; use environment variables and secret managers.
- Monitor and alert on errors, latency spikes, and authentication failures.

## 6. Quick Checklist
- [ ] HTTPS + HSTS enabled
- [ ] Auth tokens short-lived + rotation
- [ ] Parameterized queries on server
- [ ] Passwords hashed (Argon2/bcrypt)
- [ ] No secrets in localStorage
- [ ] CSP configured
- [ ] Rate limiting for critical endpoints

This file provides high-level guidance — adapt to your infrastructure, compliance needs, and threat model.
