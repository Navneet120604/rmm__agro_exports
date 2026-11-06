# ADR 0004: Transactional Gap-Free Document Numbering Engine

## Status
Accepted

## Context
In Basmati rice export operations, tax and customs authorities (GST, DGFT, Indian Customs) mandate strict, contiguous, gap-free commercial invoice numbers. Missing numbers trigger tax audits and compliance inquiries. In addition, multiple users create invoices and production orders concurrently during peak dispatch hours.

## Decision
We reject standalone PostgreSQL sequences (`CREATE SEQUENCE`) because sequence values allocated to rolled-back transactions are permanently lost, causing sequence gaps.

Instead, we engineer a **Row-Locked Transactional Document Counter Engine**:

```sql
BEGIN;

-- 1. Lock the counter row for the active company and financial year
SELECT last_number, prefix, suffix
FROM document_counters
WHERE company_id = :companyId
  AND document_type = :docType
  AND financial_year = :financialYear
FOR UPDATE;

-- 2. Compute next number: next_val = last_number + 1
-- Format: <prefix>/<formatted_next_val>/<suffix>

-- 3. Update counter row
UPDATE document_counters
SET last_number = :nextVal, updated_at = NOW()
WHERE company_id = :companyId
  AND document_type = :docType
  AND financial_year = :financialYear;

-- 4. Insert the new document with the computed document_number
INSERT INTO commercial_invoices (..., document_number, ...)
VALUES (..., :formattedDocNumber, ...);

COMMIT;
```

## Concurrency & Integrity Guarantees
1. **Zero Gaps**: If the transaction aborts or fails validation at any stage before commit, the counter update is rolled back automatically. The sequence number is never consumed.
2. **Zero Collisions**: Concurrent requests for the same company and document type serialize on the counter row lock (`FOR UPDATE`).
3. **Manual Number Overrides**: If a user manually specifies a custom number (permitted by business rules), the engine validates uniqueness against existing records without advancing the automatic counter unnecessarily.
