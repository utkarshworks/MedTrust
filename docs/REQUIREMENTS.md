# MedTrust — Product Requirements

## 1. Document Overview

This document specifies the functional and non-functional requirements for **MedTrust**, categorizing their implementation status and verification criteria within the working MVP.

All requirements marked **[Implemented]** are covered by automated test suites in `scripts/test-mvp-e2e.ts` (14/14 suites) and Rust contract tests in `programs/healthcare-records/tests/` (11/11 tests).

---

## 2. Functional Requirements (FR)

### FR-01: Solana Wallet Integration — [Implemented]
- **Description**: Connect compatible Solana wallets (Phantom, Solflare, etc.) to establish patient and provider cryptographic identities.
- **Acceptance Criteria**: Displays short wallet address, network cluster (Devnet), and maintains persistent connection across tab navigation.

### FR-02: Cryptographic Medical Record Registration — [Implemented]
- **Description**: Anchor 32-byte SHA-256 hash references to Solana Program Derived Addresses (`Record` PDA).
- **Acceptance Criteria**: Commits record identifier, patient pubkey, provider pubkey, and hash to Solana blocks; guarantees zero plaintext on-chain.

### FR-03: Client-Side AES-256-GCM Encryption — [Implemented]
- **Description**: Encrypt all off-chain clinical documents in the user's browser using AES-256-GCM with PBKDF2 key derivation.
- **Acceptance Criteria**: Generates unique 16-byte salt and 12-byte IV per record; ciphertext is decryptable only with the authorized patient key.

### FR-04: Bit-for-Bit Record Integrity Verification — [Implemented]
- **Description**: Recalculate SHA-256 hash upon document inspection and compare byte-for-byte with on-chain reference.
- **Acceptance Criteria**: Emits `Solana Anchor Verified` badge on exact match; flags `Tamper Mismatch` immediately if a single byte differs.

### FR-05: Record Tampering Simulation — [Implemented]
- **Description**: Provide an interactive demonstration toggle that injects simulated byte alterations into client verification.
- **Acceptance Criteria**: Shows immediate hash divergence and clear error banner illustrating cryptographic verification failure.

### FR-06: Granular Time-Locked Consent Granting — [Implemented]
- **Description**: Patient grants designated healthcare provider access to a specific record with a strict expiration window.
- **Acceptance Criteria**: Commits `expires_at` timestamp on Solana `Consent` PDA; supports 1h, 24h, 7d, 30d durations.

### FR-07: Instant Consent Revocation — [Implemented]
- **Description**: Patient revokes previously granted provider access on-chain.
- **Acceptance Criteria**: Executes `revoke_consent` instruction flipping `active = false`; validated by patient signer authority.

### FR-08: On-Chain Access Verification (`verify_access`) — [Implemented]
- **Description**: Provider executes on-chain `verify_access` instruction to submit proof of authorization check to Solana Devnet.
- **Acceptance Criteria**: Succeeds only if `active === true` and `Clock::get()?.unix_timestamp < expires_at`; emits transaction signature and Explorer link.

### FR-09: Storage Access Boundary Enforcement — [Implemented]
- **Description**: Physical enforcement at `/api/documents/[id]` ensuring revoked or expired consent prevents document retrieval.
- **Acceptance Criteria**: Returns `HTTP 403 Forbidden` with detailed error message; logs unauthorized access attempt in `/api/audit`.

### FR-10: Multi-Consent Management & Dynamic Account Discovery — [Implemented]
- **Description**: Patient dashboard discovering and listing all granted permissions across providers and records.
- **Acceptance Criteria**: Live countdowns (`Xd Xh remaining`), category and text search filters, one-click revocation, and one-click re-authorization.

### FR-11: Record Versioning & Parent Amendment Lineage — [Implemented]
- **Description**: Support clinical amendments without overwriting historical records.
- **Acceptance Criteria**: Creates `v2` record linking `parentRecordId` and `parentRecordHash`; lineage traversal resolves full version history.

### FR-12: Healthcare Provider Registration & Licensing Directory — [Implemented]
- **Description**: Healthcare professionals submit clinic name, license number, specialty, and facility type.
- **Acceptance Criteria**: Stores provider profile in directory with initial `Pending` verification status.

### FR-13: Administrator Credential Verification & Suspension — [Implemented]
- **Description**: Platform administrators audit provider credentials and approve or suspend medical licenses.
- **Acceptance Criteria**: Requires `x-requester-role: Admin`; updates status in provider directory; suspends access immediately if revoked.

### FR-14: Inter-Provider Clinical Referrals — [Implemented]
- **Description**: Providers refer patient diagnostic records to certified specialists or imaging labs.
- **Acceptance Criteria**: Selects destination clinic, urgency tier (`Routine`, `Urgent`, `STAT`), and records an auditable clinical transfer memo.

### FR-15: Emergency Break-Glass Protocol (HIPAA § 164.312) — [Implemented]
- **Description**: Override standard consent gate in acute life-threatening trauma emergencies.
- **Acceptance Criteria**: Requires clinical emergency justification; grants emergency decrypted document; logs elevated audit event in compliance log.

### FR-16: HL7 FHIR R4 Diagnostic Export — [Implemented]
- **Description**: Convert decrypted clinical encounters into international standard HL7 FHIR R4 JSON bundles.
- **Acceptance Criteria**: Generates valid `DiagnosticReport` resource embedding Solana SHA-256 integrity extension.

### FR-17: Patient Profile & Demographic Management — [Implemented]
- **Description**: Patients manage emergency contacts, blood type, and drug allergies associated with their Solana wallet identity.
- **Acceptance Criteria**: Persists profile in secure storage; displays quick-glance critical medical badge in navigation.

### FR-18: Account Recovery Phrase & Social Guardian — [Implemented]
- **Description**: Recover access to off-chain documents if primary wallet is lost.
- **Acceptance Criteria**: Verifies 12-word mnemonic phrase hash or social guardian authorization; re-anchors patient records to new wallet address.

### FR-19: Vault Snapshot Export & Disaster Recovery Restore — [Implemented]
- **Description**: Export entire encrypted vault snapshot and restore it on new or recovered instances.
- **Acceptance Criteria**: Computes SHA-256 integrity digest of snapshot; admin-authenticated restore replaces or merges records.

### FR-20: Sliding-Window Rate Limiting — [Implemented]
- **Description**: Protect API endpoints against brute-force and scraping attacks.
- **Acceptance Criteria**: Limits requests to 100 per 15-minute window; returns `HTTP 429 Too Many Requests` when exceeded.

---

## 3. Non-Functional Requirements (NFR)

### NFR-01: Zero Plaintext On-Chain — [Satisfied]
- No protected health information (PHI) or unencrypted medical text is ever committed to Solana transactions or account storage.

### NFR-02: Cryptographic Rigor — [Satisfied]
- Industry-standard primitives only: AES-256-GCM, PBKDF2 (100k iterations, SHA-256), SHA-256 digests.

### NFR-03: Performance & Latency — [Satisfied]
- Devnet RPC query latency under 800ms; client-side hashing and encryption under 50ms for standard clinical files.

### NFR-04: Mobile Responsiveness & Accessibility — [Satisfied]
- Fully responsive across viewports from 320px mobile screens to 4K displays.
- Persistent sticky header with integrated hamburger navigation toggle.
- High-contrast, clean UI/UX without distracting or unapprovable animations.

### NFR-05: Code Quality & Type Safety — [Satisfied]
- Zero TypeScript warnings, zero ESLint errors (`npm run lint`).
- Zero Rust clippy warnings (`cargo clippy`).
- 100% pure React 19 hook patterns with zero synchronous `setState` in effects.
