# ADR 0006: Server-Authoritative PDF Generation & Print Fidelity Strategy

## Status
Accepted

## Context
Commercial export invoices, packing lists, health certificates, and bills of exchange are submitted to Indian Customs, overseas buyers, and international negotiating banks under Letters of Credit. Document layouts must strictly reproduce the clean box-free typography, top-right company logos, margin consistency, and footer declarations of the existing desktop software. Frontend browser print dialogs (`window.print()`) suffer from inconsistent pagination, missing background assets, and varying client browser engines.

## Decision
We implement a **Server-Authoritative Headless PDF Generation Subsystem**:

1. **Architecture**:
   - PDF templates are designed using structured HTML5/CSS print-paged media (`@page { size: A4; margin: 15mm; }`) and rendered server-side via a headless engine (Puppeteer / Chromium or `@react-pdf/renderer`).
   - Official financial totals, tax breakdowns, per-packing metric tonnages, and amount-in-words strings are calculated solely on the backend before PDF rendering.

2. **Visual Regression Testing**:
   - Snapshot testing compares generated PDF pixel hashes against reference sample documents from the legacy desktop application.

3. **Combined PDF Docket Generation (Document Hub)**:
   - For Letter of Credit negotiation, the Document Hub can merge the Commercial Invoice, Packing List, Certificate of Origin, and Shipping Instructions into a single unified PDF docket with contiguous page numbering.
