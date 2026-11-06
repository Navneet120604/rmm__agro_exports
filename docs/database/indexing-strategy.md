# ExportFly Web — Database Indexing Strategy & Query Optimization

## 1. Indexing Principles

1. **Every Index Must Have a Documented Justification**: Speculative indexes increase write latency and bloat table storage.
2. **Tenant Scoping First**: Because all queries are filtered by `company_id` and non-deleted records (`deleted_at IS NULL`), composite indexes lead with `(company_id, deleted_at, ...)`.
3. **Partial Indexes for Active Data**: By indexing only rows where `deleted_at IS NULL`, the index excludes tombstoned rows, drastically shrinking index size and speeding up lookups.
4. **Covering Indexes (`INCLUDE`)**: Used on high-frequency list and register queries to enable index-only scans without table heap fetches.

---

## 2. Table-by-Table Index Specifications

### 2.1 `commercial_invoices`

| Index Name | Columns / Expression | Type | Purpose / Query Access Pattern |
| :--- | :--- | :--- | :--- |
| `idx_invoices_company_status_date` | `(company_id, document_date DESC) WHERE deleted_at IS NULL` | B-tree (Partial) | Invoice Register, default sorted list by recency |
| `idx_invoices_company_customer` | `(company_id, customer_id) WHERE deleted_at IS NULL` | B-tree (Partial) | Sales by Customer report, Customer ledger |
| `idx_invoices_company_pi` | `(company_id, proforma_invoice_id) WHERE deleted_at IS NULL` | B-tree (Partial) | Proforma fulfillment traceability, remaining quantity aggregation |
| `idx_invoices_company_po` | `(company_id, production_order_id) WHERE deleted_at IS NULL` | B-tree (Partial) | Mill production fulfillment and invoice linking |
| `idx_invoices_number_fy` | `(company_id, financial_year, document_number)` | Unique B-tree | Enforces unique invoice numbers per financial year per company |

### 2.2 `production_orders`

| Index Name | Columns / Expression | Type | Purpose / Query Access Pattern |
| :--- | :--- | :--- | :--- |
| `idx_po_company_date` | `(company_id, document_date DESC) WHERE deleted_at IS NULL` | B-tree (Partial) | Sales Order Register report |
| `idx_po_company_pi` | `(company_id, proforma_invoice_id) WHERE deleted_at IS NULL` | B-tree (Partial) | Remaining quantity calculations on Proforma Invoices |
| `idx_po_company_mill` | `(company_id, supplier_mill_id) WHERE deleted_at IS NULL` | B-tree (Partial) | Mill work orders breakdown |

### 2.3 `proforma_invoices`

| Index Name | Columns / Expression | Type | Purpose / Query Access Pattern |
| :--- | :--- | :--- | :--- |
| `idx_pi_company_date` | `(company_id, document_date DESC) WHERE deleted_at IS NULL` | B-tree (Partial) | Proforma list screen, date range filters |
| `idx_pi_company_customer` | `(company_id, customer_id) WHERE deleted_at IS NULL` | B-tree (Partial) | Filter PIs by consignee/customer |
| `idx_pi_company_status` | `(company_id, status) WHERE deleted_at IS NULL` | B-tree (Partial) | Dashboard pending PI aggregations |

### 2.4 `receipts`

| Index Name | Columns / Expression | Type | Purpose / Query Access Pattern |
| :--- | :--- | :--- | :--- |
| `idx_receipts_company_invoice` | `(company_id, commercial_invoice_id) WHERE deleted_at IS NULL` | B-tree (Partial) | Pending Payments (Due) report: `SUM(amount_received)` per invoice |
| `idx_receipts_company_date` | `(company_id, receipt_date DESC) WHERE deleted_at IS NULL` | B-tree (Partial) | Receipts Register report |

### 2.5 `activity_logs`

| Index Name | Columns / Expression | Type | Purpose / Query Access Pattern |
| :--- | :--- | :--- | :--- |
| `idx_activity_company_created` | `(company_id, created_at DESC)` | B-tree | Admin Activity Log viewer paginated stream |
| `idx_activity_entity` | `(entity_table, entity_id)` | B-tree | Audit history inspection for a specific document |
| `idx_activity_user` | `(user_id, created_at DESC)` | B-tree | User activity analysis and security audits |

---

## 3. Query Verification & EXPLAIN Plan Directives

Before deploying new query patterns:
1. Run `EXPLAIN (ANALYZE, BUFFERS)` on representative datasets (e.g. 50,000 invoices).
2. Verify **Index Scan** or **Index Only Scan** instead of **Seq Scan**.
3. Confirm heap buffer reads remain minimal.
