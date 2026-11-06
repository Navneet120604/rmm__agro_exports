# ADR 0001: Deployment Target — On-Premises Office Server vs. Vercel Cloud

## Status
Proposed / Pending Stakeholder Sign-off

## Context
There is an explicit conflict between the initial technology setup (Next.js configured for Vercel deployment) and the business requirements brief: *"It runs on the office server PC; staff open it in a browser over the office LAN. No per-device setup, no copying files to each machine."*

## Decision
We recommend **Option B: Self-Hosted Deployment on the Office Server PC** as the primary production target, while preserving full architectural portability for Vercel cloud deployment if the business later shifts to remote operations.

## Detailed Trade-offs

1. **Connectivity & Availability**:
   - Rice export operations require continuous availability during office hours. If internet connectivity is interrupted, cloud-hosted systems halt dispatch, whereas an on-premise LAN setup functions uninterrupted.

2. **Security & Financial Privacy**:
   - The office server hosts sensitive pricing, buyer lists, Letter of Credit records, and bank accounts. An on-premise deployment avoids exposing PostgreSQL ports or data to the public internet.

3. **Performance & Printing**:
   - Staff print dozens of export packing lists and invoices daily to local office network printers. Local LAN latency (<5ms) delivers instant PDF rendering and printing compared to cloud round trips.

## Portability Safeguards
- Next.js is configured with `output: "standalone"` capability.
- Environment variables adhere strictly to standard 12-factor principles (`NEXT_PUBLIC_API_URL`, `DATABASE_URL`).
- No vendor-proprietary cloud services (such as Vercel Edge functions or AWS-only SDKs) are introduced.
