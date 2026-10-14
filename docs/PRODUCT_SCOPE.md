# MedTrust — Product Scope

## 1. Purpose

This document defines the functional scope, architecture boundaries, and user capabilities of **MedTrust**.

MedTrust is an enterprise-grade medical record integrity verification and patient-governed consent protocol built on the **Solana blockchain** (Devnet) with client-side **AES-256-GCM encryption**, dynamic PDA discovery, Role-Based Access Control (RBAC), and an access-controlled off-chain storage vault.

---

## 2. Product Vision & Problem Statement

### The Problem
- **Fragmented Medical Records**: Patient health records are scattered across hospitals, private clinics, and diagnostic labs without a unified, patient-controlled provenance layer.
- **Vulnerability to Unauthorized Tampering**: Off-chain electronic health records (EHRs) can be silently modified, falsified, or corrupted without cryptographic audit trails.
- **Coarse, Unrevocable Access**: Patients lack fine-grained, time-bounded control over which clinics or specialists can view their diagnostic files. Once shared, permissions are rarely revocable in real time.
- **Privacy Gaps in Public Blockchains**: Storing sensitive personal health information (PHI) directly on a public blockchain violates privacy laws (HIPAA, GDPR) and creates permanent surveillance risks.

### The Solution: MedTrust
MedTrust bridges high-performance blockchain verification with absolute patient privacy:
- **Zero Plaintext On-Chain**: Medical records remain client-side encrypted and stored off-chain. Only immutable 32-byte SHA-256 cryptographic digests and time-bounded consent state PDAs reside on Solana Devnet.
- **Cryptographic Access Boundary**: Off-chain storage APIs strictly enforce on-chain consent states in real time. If consent is revoked or expired, access is physically blocked (`HTTP 403 Forbidden`).
- **Patient Data Sovereignty**: Patients grant time-to-live permissions, revoke them with a single click, amend records with parent-child version lineage, and retain custody of their cryptographic keys.

---

## 3. User Personas & Workspaces

MedTrust supports three distinct operational personas segregated through Role-Based Access Control (RBAC):

### 3.1 Patient Persona (`Patient`)
- Connects Solana wallet (e.g., Phantom, Solflare) to establish cryptographic identity.
- Manages patient demographic profile, blood group, drug/environmental allergies, and emergency contacts.
- Uploads and encrypts medical records (prescriptions, diagnostic labs, cardiology imaging summaries, discharge records).
- Generates 32-byte SHA-256 hashes anchored to Solana Program Derived Addresses (PDAs).
- Inspects and verifies record integrity with one-click bit-for-bit cryptographic validation.
- Grants granular, time-locked access permissions (1 hour, 24 hours, 7 days, 30 days) to verified healthcare providers.
- Discovers and monitors all active and past permissions in a multi-consent dashboard.
- Revokes consent at any time, immediately cutting off provider access at the API storage boundary.
- Amends medical records (v1 $\rightarrow$ v2+) with backward-referencing parent hashes.
- Exports records as international standard HL7 FHIR R4 diagnostic JSON bundles.
- Manages account recovery via 12-word mnemonic recovery phrases and social guardian wallet re-anchoring.
- Backs up encrypted vault data and restores it after disaster recovery validation.

### 3.2 Healthcare Provider Persona (`Provider`)
- Registers clinic, hospital, or diagnostic laboratory credentials, license number, specialty, and facility type.
- Views active patient authorizations and discovers records for which active consent is held.
- Requests access to encrypted clinical documents through the authenticated API boundary.
- Decrypts and views authorized clinical records in real-time when valid on-chain consent is verified.
- Executes on-chain `verify_access` Anchor transactions to commit immutable proof of clinical verification to Solana blocks.
- Dispatches provider-to-provider clinical referrals with priority tiers (`Routine`, `Urgent`, `STAT`) and clinical consult memos.
- Invokes HIPAA § 164.312 Emergency Break-Glass protocols in acute life-threatening emergencies with mandatory compliance auditing.
- Issues new verifiable clinical records on behalf of patients.

### 3.3 Platform Administrator Persona (`Admin`)
- Audits healthcare provider credential applications and verifies or suspends medical board licenses.
- Monitors live system health metrics, including Solana Devnet RPC slot progression, latency, and vault storage volume.
- Inspects real-time security compliance audit logs covering access events, consent changes, and unauthorized violations.
- Executes full vault disaster recovery restoration with SHA-256 bundle verification.

---

## 4. Implemented MVP Capabilities

The following capabilities are fully built, tested, and operational:

### 4.1 Solana Devnet Anchor Smart Contract
- **Program ID**: `9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh`
- **Instructions**:
  - `create_record`: Derives PDA `[b"record", patient, record_id.to_le_bytes()]` and records 32-byte SHA-256 hash.
  - `grant_consent`: Derives PDA `[b"consent", patient, provider, record_id.to_le_bytes()]` with `expires_at` timestamp.
  - `revoke_consent`: Marks consent inactive on-chain; validates patient signer authority.
  - `verify_access`: Checks provider signer, active state, and non-expired time window against `Clock::get()?.unix_timestamp`.

### 4.2 Cryptographic Client-Side Vault & Storage Boundary
- **AES-256-GCM Encryption**: PBKDF2 key derivation (100,000 iterations, SHA-256) with 16-byte salt and unique 12-byte IV per record.
- **Physical Boundary Enforcement**: `/api/documents/[id]` queries Solana consent state and returns `HTTP 403 Forbidden` if revoked or expired.
- **Record Versioning & Lineage**: Full parent-child amendment hierarchy (`parentRecordId`, `parentRecordHash`).
- **Sliding-Window Rate Limiter**: 100 requests / 15-minute window per IP/requester to block scraping and brute-force attacks.

### 4.3 Multi-Consent Management & Dynamic Account Discovery
- Dynamic discovery of patient consents across providers.
- Real-time countdowns (`Xd Xh remaining`).
- Search by provider name, license, or record title.
- One-click instant revocation and one-click re-authorization.

### 4.4 Healthcare Interoperability & Emergency Protocols
- **HL7 FHIR R4 Export**: Direct export to FHIR R4 Diagnostic Report bundles embedding Solana SHA-256 integrity extensions.
- **Emergency Break-Glass Protocol**: HIPAA § 164.312(a)(2)(ii) compliance for emergency access with elevated audit logging.
- **Provider Referrals**: Inter-provider transfer of records with urgency grading.

### 4.5 Account Recovery & Disaster Recovery
- 12-word cryptographic recovery phrase hashing.
- Social guardian wallet re-anchoring.
- Encrypted JSON vault snapshot backup and restoration with integrity digest validation.

### 4.6 Mobile-First Responsive Design & Senior UI/UX
- Persistent sticky header with integrated mobile navigation toggle.
- Full slide-out responsive navigation drawer with role switcher and persona status.
- Responsive action button wrapping, touch-friendly tap targets, and horizontal scroll containment on all data tables.
- Accessible, high-contrast Tailwind CSS design system with zero layout shifting.

---

## 5. Architectural Boundaries

| Responsibility | Handled By |
| :--- | :--- |
| **Record Integrity Reference** | Solana Devnet Program (`Record` PDA) |
| **Consent Authorization State** | Solana Devnet Program (`Consent` PDA) |
| **Access Verification Proofs** | Solana Devnet Transactions (`verify_access`) |
| **Document Content Encryption** | Client-Side Web Crypto API (`AES-256-GCM`) |
| **Physical Document Storage** | MedTrust Vault (`/api/documents/`) |
| **Access Boundary Enforcement** | MedTrust API Gateway (verifies Solana PDA state) |
| **Audit Logging & Rate Limiting** | MedTrust Server Middleware (`/api/audit`, `rateLimit.ts`) |
| **Interoperability Transformation**| MedTrust Client Library (`fhir.ts`) |

---

## 6. Future Roadmap Beyond MVP

The following areas represent potential post-MVP expansions:
1. **Direct EHR Vendor Connectors**: Direct integration with Epic Systems and Cerner via SMART on FHIR OAuth2 launch protocols.
2. **Zero-Knowledge Credential Proofs**: Utilizing Circom / Groth16 zero-knowledge proofs for selective attribute disclosure (e.g., proving vaccination or adult age without disclosing identity).
3. **Decentralized Storage Backends**: Option for encrypted IPFS/Arweave persistence alongside enterprise encrypted cloud vaults.
4. **Hardware Security Module (HSM) Integration**: Support for YubiKey and Ledger hardware signers for institutional provider keys.
