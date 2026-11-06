# ADR 0003: Authentication & Multi-Company Session Architecture

## Status
Accepted

## Context
ExportFly Web serves multiple sister companies (RMM Agro Exports, Pragati, Dudani). Users log in once, select their active company, and switch companies seamlessly without re-authenticating, provided they have authorized access.

## Decision
We implement a **Dual-Token State-Verified Session System with Secure HttpOnly Cookies**:

1. **Storage Mechanism**:
   - Access and refresh tokens are stored exclusively in `HttpOnly`, `SameSite=Lax`, `Secure` (in HTTPS/LAN) cookies.
   - Client-side JavaScript has zero access to raw session secrets, neutralizing XSS credential theft.

2. **Active Company Scoping**:
   - The active company is tracked in a signed server cookie / token claims payload (`activeCompanyId`).
   - Every protected API endpoint extracts `activeCompanyId` from the verified session context, not from unauthenticated client request bodies.
   - Company switching is performed via `POST /api/v1/auth/switch-company`, which validates the user's membership in `user_companies`, records an audit log entry, and issues an updated signed session cookie.

3. **Password Security & Legacy Compatibility**:
   - Primary hashing algorithm: **Argon2id**.
   - If the legacy database uses bcrypt, PBKDF2, or SHA-512 hashes, a legacy verification wrapper verifies the old hash on initial login and transparently re-hashes the password to Argon2id upon successful authentication.
