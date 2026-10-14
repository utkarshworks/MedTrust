# MedTrust Web Application

The frontend and API gateway for the **MedTrust** healthcare record integrity and patient-governed consent protocol. Built with **Next.js 16 (Turbopack)**, **React 19**, **Tailwind CSS**, and **Solana Wallet Adapter**.

---

## Architecture & Technology Stack

- **Framework**: Next.js 16.4.0 with Turbopack and React 19.
- **Styling**: Tailwind CSS with custom medical-grade high-contrast color palette.
- **Blockchain Integration**: `@solana/web3.js` and `@solana/wallet-adapter-react`.
- **Client-Side Cryptography**: Web Crypto API (`AES-256-GCM`, `PBKDF2`, `SHA-256`).
- **Interoperability**: Built-in HL7 FHIR R4 JSON bundle transformer (`src/lib/fhir.ts`).
- **Security & Rate Limiting**: In-memory sliding-window request limiter (`src/lib/rateLimit.ts`).

---

## Features & Workspaces

The application implements a 3-Persona Role-Based Access Control (RBAC) architecture selectable via the role switcher pill:

1. **Patient Workspace** (`Patient`):
   - **Overview Tab**: Key provenance statistics, recent records, active consent status, and security architecture summaries.
   - **Medical Records Tab**: Complete encrypted vault with category filtering, search, SHA-256 integrity inspection, record amendments (v1 $\rightarrow$ v2+), tamper simulation, and disaster recovery exports.
   - **Access Control Tab**: Multi-consent management dashboard with dynamic PDA discovery, live remaining-time countdowns, one-click revocation, and one-click re-authorization.
   - **Audit Trail Tab**: Live streaming Solana Devnet transaction history of all grant and revoke events.
   - **Patient Demographic Profile**: Emergency contacts, blood type, known allergies, 12-word mnemonic recovery phrase, and social guardian setup.

2. **Healthcare Provider Workspace** (`Provider`):
   - **Provider Portal Tab**: View authorized patient records, request gated document retrieval (enforcing 403 barriers), preview decrypted records, execute on-chain `verify_access`, issue provider-to-provider referrals (`Routine`, `Urgent`, `STAT`), and invoke HIPAA § 164.312 Emergency Break-Glass protocols.
   - **Provider Registration**: Self-service registration of clinic credentials and medical license numbers.

3. **Platform Administrator Workspace** (`Admin`):
   - **Platform Admin Tab**: Live system health metrics (Devnet RPC latency, current slot, vault statistics), provider license verification/suspension, compliance audit log filtering, and vault disaster recovery snapshot restoration.

---

## API Layer (`src/app/api/`)

The application features 12 server routes with strict server-side access enforcement:

| Endpoint | Methods | Description |
| :--- | :--- | :--- |
| `/api/documents` | `GET`, `POST` | List and create/amend encrypted records |
| `/api/documents/[id]` | `GET` | Gated document retrieval; checks on-chain consent and returns 403 Forbidden if invalid |
| `/api/consents` | `GET`, `POST`, `PATCH` | Dynamic multi-consent registry, discovery, and revocation |
| `/api/providers` | `GET`, `POST` | Healthcare provider directory and registration |
| `/api/providers/[id]` | `PATCH` | Admin credential licensing review (Approve / Suspend) |
| `/api/patients` | `GET`, `POST` | Patient demographic profiles and emergency contacts |
| `/api/audit` | `GET`, `POST` | Security compliance and audit logging |
| `/api/backup` | `GET`, `POST` | Vault snapshot export and admin disaster recovery restore |
| `/api/recovery` | `POST` | 12-word recovery phrase or social guardian wallet re-anchoring |
| `/api/health` | `GET` | Live Solana Devnet RPC latency, slot progression, and vault counts |

---

## Mobile Responsiveness & UI/UX

- Fully responsive across screen sizes from 320px mobile viewports to desktop displays.
- Persistent sticky header with integrated mobile navigation toggle.
- Slide-out mobile navigation drawer with role switcher pill and persona status.
- Touch-friendly tap targets, wrap-friendly action buttons, and horizontal table containment.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Solana wallet (e.g. Phantom, Solflare) configured to **Devnet**

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create `.env.local` in this directory:
```env
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build & Lint
```bash
npm run lint
npm run build
```
Both commands must complete with zero errors or warnings.
