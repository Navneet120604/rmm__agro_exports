# ExportFly Web — Security Model & Defense-in-Depth Specification

## 1. Threat Matrix & Mitigations

| Threat Category | Potential Attack Vector | ExportFly Web Security Defense |
| :--- | :--- | :--- |
| **Cross-Tenant Data Leak** | User tampering with `company_id` in request body/params | Company context is determined strictly by the validated server-side session. Query filters always include `AND company_id = session.activeCompanyId`. PostgreSQL RLS provides defense-in-depth. |
| **Insecure Direct Object Reference (IDOR)** | Requesting `/api/v1/invoices/:id` belonging to sister company | Service queries verify both `id = :id` AND `company_id = session.activeCompanyId`. Returns `404 Not Found` if company mismatches. |
| **Broken Authentication & Session Hijacking** | XSS stealing authentication token from `localStorage` | Authentication tokens stored exclusively in `HttpOnly`, `SameSite=Lax`, `Secure` cookies. JavaScript cannot access the session token. |
| **SQL Injection** | Malicious payloads in search inputs or filter criteria | 100% Parameterized queries via Drizzle ORM. Raw string concatenation is strictly prohibited by CI linter rules. |
| **Mass Assignment** | Client submitting `role="admin"` or `version=999` in body | Strict NestJS `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`. Only explicitly decorated DTO fields are accepted. |
| **Race Conditions in Numbering & Quantities** | Simultaneous saves overselling rice stocks or duplicating invoice numbers | Row-level locking (`SELECT ... FOR UPDATE`) within explicit ACID database transactions. |
| **Cross-Site Scripting (XSS)** | Injected scripts in customer addresses or goods descriptions | React 19 automatic JSX encoding. Helmet security headers enforcing Content-Security-Policy (CSP) and `X-Content-Type-Options: nosniff`. |
| **Credential Storage Compromise** | Database dump leak exposing plaintext or weak passwords | Argon2id password hashing with unique per-user cryptographic salts. Compatibility layer for legacy hashes with seamless upgrade on login. |

---

## 2. Role-Based Access Control (RBAC) & Screen Permissions

ExportFly distinguishes three primary roles:
1. **Super Admin**: Complete platform access, all companies, system settings, global administration.
2. **Admin**: Complete access within authorized companies, user management, activity log inspection.
3. **Ordinary User**: Access strictly scoped to allowed business screens (e.g., Invoices + Reports, but blocked from Users and Activity Logs).

```mermaid
flowchart TD
    Req["Incoming API Request"] --> JWT["Verify Session & Company Membership"]
    JWT --> RoleCheck{"Check User Role"}
    RoleCheck -->|Super Admin| Allowed["Permit Execution"]
    RoleCheck -->|Admin| CheckAdminOnly{"Is Screen Admin-Only?"}
    CheckAdminOnly -->|Yes (Users, Activity Log)| Allowed
    CheckAdminOnly -->|No| Allowed
    RoleCheck -->|Ordinary User| CheckScreenPerm{"Is Screen Key in user.allowed_screens?"}
    CheckScreenPerm -->|Yes| Allowed
    CheckScreenPerm -->|No| Forbidden["403 Forbidden Response"]
```
