# ExportFly Web — Deployment Options & Infrastructure Analysis

## 1. Conflict Analysis: Cloud (Vercel) vs. On-Premises Office Server

The project requirements feature a fundamental deployment conflict:
- **Requirement A**: Previously selected frontend hosting on Vercel (Cloud).
- **Requirement B**: Business brief non-functional requirement: *"Runs on the office server PC; staff open it in a browser over the office LAN. No per-device setup, no copying files to each machine."*

---

## 2. Option Comparison Matrix

| Evaluation Dimension | Option A: Cloud Frontend (Vercel) + Cloud/Exposed Backend | Option B: Self-Hosted On-Premise Office Server (LAN) | Option C: Hybrid Edge (Tailscale / Cloudflare Tunnel) |
| :--- | :--- | :--- | :--- |
| **LAN Accessibility** | Requires continuous internet access for all office desktop PCs. Fails if office ISP drops. | Fully accessible over LAN (`http://exports.local` or `http://192.168.x.x`) even during internet outages. | Accessible locally via LAN and remotely via encrypted tunnel when internet is up. |
| **Database Data Sovereignty & Security** | Live export financial data and customer documents must reside on cloud DB or be exposed via public IP/port forwarding. | Database never leaves physical premises; zero public attack surface. Isolated behind office firewall. | Database stays on office server; access gated through zero-trust tunnel. |
| **Operational Maintenance** | Zero frontend server maintenance (Vercel handles CDN/Next.js). Backend still requires independent cloud hosting. | Single office server PC to manage. Systemd or Docker Compose handles automatic start-on-boot and crash recovery. | Server managed via systemd/Docker; remote administration enabled without port forwarding. |
| **Print & PDF Latency** | PDF generation incurs round-trip cloud upload/download latency. | Instant generation and print spooling directly to local office network printers. | Fast local printing for office users. |
| **Monthly Operating Cost** | Vercel Pro team plan ($20/seat/mo) + Cloud PostgreSQL + Cloud Node.js hosting (~$100–$250/mo). | $0 recurring cloud infrastructure fees. Uses existing office server PC. | $0 to minimal (Tailscale free tier covers small team). |

---

## 3. Recommended Architecture: Option B (On-Premise LAN) with Portable Containerization

To honor both requirements:
1. **Application Portability**: The codebase is kept 100% cloud-portable. Next.js can build for standalone Node.js or Vercel; NestJS is a standard Node.js service.
2. **Primary Production Target**: Self-hosted on the office server PC running Linux or Windows Server, orchestrated via Docker Compose or native Systemd services with an Nginx reverse proxy.
3. **LAN Access Configuration**:
   - Nginx binds to port `80`/`443`.
   - Routes `/` to Next.js (`localhost:3000`).
   - Routes `/api` and `/api/docs` to NestJS (`localhost:4000`).
   - Staff navigate to `http://exportfly.local` or `http://192.168.20.137` on any office PC.
