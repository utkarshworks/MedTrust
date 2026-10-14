# MedTrust — Patient-Centric Cryptographic Health Record & Consent Protocol

MedTrust is an enterprise-grade medical record integrity and patient-governed consent protocol built on the **Solana blockchain** (Devnet) with client-side **AES-256-GCM encryption** and an access-controlled off-chain storage vault.

> **Zero Plaintext On-Chain**: MedTrust strictly protects sensitive patient data. Only 32-byte cryptographic SHA-256 digests and time-bounded consent state PDAs reside on Solana. Off-chain clinical records are encrypted client-side and accessible only through a cryptographically enforced storage boundary.

---

## Architecture Overview

```
                                      +---------------------------------------------+
                                      |          PATIENT / PROVIDER CLIENT          |
                                      +---------------------------------------------+
                                             |                               |
                   1. Client-Side Encryption |                 2. Solana PDA |
                   (AES-256-GCM + SHA-256)   |                    Anchoring  |
                                             v                               v
                     +-------------------------------+     +--------------------------------+
                     |    MEDTRUST SECURE VAULT      |     |         SOLANA DEVNET          |
                     |   (/api/documents, /backup)   |     |    (Anchor Program Accounts)   |
                     +-------------------------------+     +--------------------------------+
                                     |                                     |
                                     | 3. Access Gating                    | 4. PDA State Verification
                                     |    Validation                       |    (Record & Consent PDAs)
                                     +-------------------------------------+
```

### Core Cryptographic Primitives

1. **Client-Side Encryption (`AES-256-GCM`)**:
   - Every document is encrypted in the user's browser using a 256-bit symmetric key derived via PBKDF2 (100,000 iterations, SHA-256) with a cryptographic 16-byte salt and unique 12-byte initialization vector (IV).
2. **Solana Anchor PDA (`SHA-256`)**:
   - The SHA-256 digest (32 bytes) of the plaintext is recorded on-chain in a Program Derived Address (PDA) deterministically derived from `[b"record", patient_pubkey, record_id.to_le_bytes()]`.
3. **Time-Locked Access Consent PDA**:
   - Consents are derived from `[b"consent", patient_pubkey, provider_pubkey, record_id.to_le_bytes()]` and enforce cryptographic timestamps (`expires_at > Clock::get()?.unix_timestamp`).
4. **Physical Storage Boundary Enforcement**:
   - Off-chain retrieval APIs (`/api/documents/[id]`) physically query the Solana runtime. If consent is revoked, expired, or missing, the API rejects the request with `HTTP 403 Forbidden` and records an unauthorized access event in the persistent audit log.

---

## Key Features & Capabilities

### 1. Patient Sovereignty & Workflow
- **Patient Identity & Demographic Profile**: Establish verified patient identity, blood group, drug/environmental allergies, date of birth, and emergency contacts linked to the Solana wallet address.
- **Medical Record Creation & Upload**: Upload arbitrary clinical files (PDF, DICOM summaries, lab reports, clinical notes). Automatically calculates SHA-256 hashes and commits them to Solana.
- **Record Versioning & Lineage**: Amend records (v1 $\rightarrow$ v2+) with cryptographic backward references (`parentRecordId`, `parentRecordHash`), preserving full historical provenance.
- **Granular Consent Management**: Grant time-to-live permissions (1 hour, 24 hours, 7 days, 30 days) to verified healthcare providers. Revoke permissions on-chain at any moment.
- **Export & Recovery**: Download decrypted records, export self-contained JSON cryptographic proof bundles, and backup/restore entire encrypted vaults with SHA-256 digest validation.

### 2. Clinical Provider Features
- **Provider Registration & Licensing**: Register medical practice, facility type (Clinic, Hospital, Laboratory, Imaging), specialty, and license credentials.
- **Credential Verification**: Platform administrators review and approve/suspend provider licenses before granting clinical access.
- **Authorized Record Retrieval**: Gated document retrieval that decrypts records in real-time only when active on-chain consent is verified.
- **On-Chain Access Verification**: Execute the `verify_access` Anchor instruction to submit an immutable verification proof to Solana Devnet blocks.
- **Clinical Referrals**: Secure inter-provider clinical referral delegation with priority tiers (`Routine`, `Urgent`, `STAT`) and audit logging.

### 3. Governance & Administrative Security
- **Operational Health Metrics**: Live `/api/health` monitoring Devnet RPC slot progression, latency, vault document counts, and provider credential states.
- **Security Audit Trail**: Immutable persistent logging of `DOCUMENT_ACCESSED`, `ACCESS_DENIED`, `CONSENT_GRANTED`, `CONSENT_REVOKED`, `RECORD_AMENDED`, and `PROVIDER_REFERRAL` actions.
- **Abuse Prevention**: Sliding-window rate limiter protecting API endpoints against brute-force and scraping attempts.
- **Role-Based Access Control (RBAC)**: Strict workspace segregation between `Patient`, `Healthcare Provider`, and `Platform Administrator` personas with UI gating, 403 access barriers, and API header enforcement (`x-requester-role`).
- **Emergency Break-Glass Protocol**: HIPAA § 164.312 compliant emergency override for acute trauma care with mandatory high-priority compliance audit logging.
- **HL7 FHIR R4 Export**: Live transformation of decrypted clinical encounters and lab records into international standard FHIR R4 JSON bundles embedding on-chain Solana SHA-256 integrity extensions.
- **Account Recovery & Social Guardian**: 12-word cryptographic recovery phrase hashing and social guardian wallet re-anchoring.
- **Responsive Mobile & Desktop UI/UX**: Senior-crafted, mobile-first design with a persistent sticky header, slide-out navigation drawer, dynamic role switcher, wrap-friendly action buttons, and zero layout shift across all viewport sizes (320px to 4K).

---

## Solana Smart Contract (Anchor)

Program ID: `9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh` (Solana Devnet)

| Instruction | Signer | Seeds | Purpose |
| :--- | :--- | :--- | :--- |
| `create_record` | Patient | `["record", patient, record_id]` | Commits 32-byte SHA-256 integrity hash to on-chain state |
| `grant_consent` | Patient | `["consent", patient, provider, record_id]` | Authorizes a provider with a specific expiration timestamp |
| `revoke_consent` | Patient | `["consent", patient, provider, record_id]` | Permanently revokes provider verification permission |
| `verify_access` | Provider | `["consent", patient, provider, record_id]` | Asserts on-chain active consent and valid time window |

---

## API Layer Specification

All routes are fully typed and implemented in the Next.js App Router (`web/src/app/api/`):

- `GET /api/documents` — Lists encrypted records with sanitization and category/search filtering.
- `POST /api/documents` — Creates or amends an encrypted record, registers parent lineage, and logs creation.
- `GET /api/documents/[id]` — Enforces on-chain consent boundary and emergency break-glass: returns 200 with decrypted record if authorized, or 403 Forbidden with security audit log entry if unauthorized.
- `GET /api/consents` & `POST /api/consents` & `PATCH /api/consents` — Dynamic multi-consent registry, discovery, registration, and revocation.
- `GET /api/providers` & `POST /api/providers` — Provider registration and directory listing.
- `PATCH /api/providers/[id]` — Admin licensing verification (Approve/Suspend) requiring `x-requester-role: Admin`.
- `GET /api/patients` & `POST /api/patients` — Patient demographic and identity management.
- `GET /api/audit` & `POST /api/audit` — Security audit trail query and event recording.
- `GET /api/backup` & `POST /api/backup` — Vault snapshot export with SHA-256 bundle digest and disaster recovery restore requiring `x-requester-role: Admin`.
- `POST /api/recovery` — 12-word recovery phrase or social guardian vault re-anchoring.
- `GET /api/health` — Real-time Devnet slot, RPC latency, and storage observability.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Rust & Cargo (1.75+)
- Solana CLI & Anchor Framework (0.30+)
- Solana Wallet (e.g., Phantom, Solflare) set to **Devnet**

### 1. Environment Setup

Copy `.env.example` to `web/.env.local`:

```bash
cp .env.example web/.env.local
```

Default Devnet Configuration:
```env
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh
```

### 2. Install & Run Web Application

```bash
cd web
npm install
npm run dev
```

Navigate to `http://localhost:3000`.

### 3. Running Automated Tests

Run the comprehensive 14-suite end-to-end integration and security test suite:

```bash
npm test
```

Run Anchor smart contract Rust unit and integration tests:

```bash
cargo test --manifest-path programs/healthcare-records/Cargo.toml
```

Run Rust clippy linting:

```bash
cargo clippy --manifest-path programs/healthcare-records/Cargo.toml -- -D warnings
```

---

## Clean Code & Design Principles
- **React 19 Pure Hooks**: Zero synchronous `setState` in effects; strict component lifecycle separation.
- **Type Safety**: 100% strict TypeScript typing across all frontend components, API handlers, and storage layers.
- **Medical Dashboard Aesthetics**: Built with a clean, high-contrast, accessible design system using Tailwind CSS without distracting or gimmicky animations.
