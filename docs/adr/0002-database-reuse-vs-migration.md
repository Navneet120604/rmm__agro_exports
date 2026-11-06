# ADR 0002: Live Database Strategy — Direct Reuse vs. Migration

## Status
Accepted

## Context
A live database containing real customers, rice products, bank details, and historical export documents already powers the Windows desktop application. Business operations cannot tolerate downtime, data loss, or disruption to running document sequence counters.

## Decision
We adopt a **Non-Destructive Inspection & Controlled Migration Strategy**:

1. **Strict Non-Destructive Rule**:
   - Never run automated ORM table sync (`db push` / `synchronize: true`) against live databases.
   - Never drop or alter existing production tables without an explicit, tested SQL migration script and a verified physical backup.

2. **Database Discovery Protocol (Phase 2)**:
   - Request authorized access / read-only credentials or an anonymized staging dump.
   - Inspect table schemas, constraints, foreign keys, password hashes, and document counter mechanisms.
   - If the live database is PostgreSQL with relational integrity, evaluate direct schema compatibility.
   - If the database is MS SQL Server, Access, MySQL, or legacy PostgreSQL with schema drift, develop an ETL migration script mapping old records to the Drizzle schema.

3. **Parallel Operation Support**:
   - The data model preserves legacy field semantics (e.g. Proforma Consignee/Buyer mapping) so that the legacy desktop app and ExportFly Web can run side-by-side during the phased rollout.
