# ADR 0005: Multi-Company Data Isolation Architecture

## Status
Accepted

## Context
RMM Agro Exports operates multiple sister entities (e.g. RMM, Pragati, Dudani). An accountant or sales manager working on Pragati must never view, query, or edit invoices belonging to RMM.

## Decision
We enforce a **Multi-Layered Defense-in-Depth Isolation Model**:

1. **Schema Design Level**:
   - Every tenant-scoped table includes `company_id UUID NOT NULL REFERENCES companies(id)`.
   - Unique constraints are always composite with `company_id` (e.g., `UNIQUE(company_id, document_number)`).

2. **Application & Service Level (Primary Enforcement)**:
   - All backend repositories and query builders automatically append `WHERE company_id = :activeCompanyId`.
   - The `activeCompanyId` is supplied by the verified session token and cannot be overridden by client HTTP headers or query parameters without re-authorizing against `user_companies`.

3. **Database Level (Defense in Depth with PostgreSQL RLS)**:
   - For environments utilizing session-bound connection pooling, PostgreSQL Row Level Security (RLS) policies can be activated using `current_setting('app.current_company_id')`.
   - Any query attempting cross-tenant access at the SQL layer is blocked by PostgreSQL itself.

4. **Audit Verification**:
   - Company switching is an auditable event recorded in `activity_logs`.
   - All export, PDF generation, and report aggregation endpoints explicitly log the target company ID.
