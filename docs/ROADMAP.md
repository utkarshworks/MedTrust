# MedTrust — Product Roadmap

## 1. Overview & Progression

This document tracks the phased development of **MedTrust** from initial proof-of-concept to a complete, production-grade MVP and future enterprise horizons.

```
+-----------------------------------------------------------------------------------+
| PHASE 1: Baseline Prototype & Smart Contract Stabilization                [DONE]  |
| PHASE 2: Dynamic PDA Discovery & Smart Contract Authorization             [DONE]  |
| PHASE 3: Client-Side AES-256-GCM Vault & Storage Boundary                 [DONE]  |
| PHASE 4: Healthcare Provider Management & End-to-End Consent Boundary     [DONE]  |
| PHASE 5: RBAC Personas, Security Auditability & Rate Limiting             [DONE]  |
| PHASE 6: Interoperability (FHIR R4), Emergency Protocols & Recovery       [DONE]  |
| PHASE 7: Mobile-First Responsive Senior UI/UX & E2E Verification          [DONE]  |
+-----------------------------------------------------------------------------------+
| PHASE 8: Enterprise EHR Integrations & Decentralized Storage Backends    [FUTURE] |
+-----------------------------------------------------------------------------------+
```

---

## 2. Completed Phases (Working MVP)

### Phase 1: Baseline Prototype & Smart Contract Stabilization — [COMPLETED]
- [x] Implemented Anchor smart contract on Solana Devnet (`9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh`).
- [x] Defined deterministic PDA seeds: `[b"record", patient, record_id]` and `[b"consent", patient, provider, record_id]`.
- [x] Built core instructions: `create_record`, `grant_consent`, `revoke_consent`, `verify_access`.
- [x] Validated 11/11 Rust unit and integration tests with `cargo test`.
- [x] Enforced clean Rust code with `cargo clippy -- -D warnings`.

### Phase 2: Dynamic PDA Discovery & Authorization — [COMPLETED]
- [x] Replaced fixed account addresses with dynamic PDA derivation (`getRecordPda`, `getConsentPda`).
- [x] Implemented dynamic multi-consent registry and discovery (`listConsents`, `saveConsent`, `revokeConsentRecord`).
- [x] Developed comprehensive Access Control dashboard with active countdowns and search filtering.
- [x] Implemented dynamic `RecordInspectorModal` dynamically anchoring unanchored documents to Solana.

### Phase 3: Client-Side AES-256-GCM Vault & Storage Boundary — [COMPLETED]
- [x] Implemented client-side Web Crypto AES-256-GCM encryption with PBKDF2 (100,000 iterations, SHA-256).
- [x] Guaranteed zero medical plaintext on-chain; only 32-byte SHA-256 digests committed to Solana.
- [x] Enforced physical access boundary at `/api/documents/[id]`: queries on-chain consent state and returns `HTTP 403 Forbidden` if consent is revoked or expired.
- [x] Added bit-for-bit tamper simulation proving instant cryptographic mismatch detection.

### Phase 4: Healthcare Provider Portal & End-to-End Consent — [COMPLETED]
- [x] Built provider registration flow supporting medical license numbers, specialties, and facility types.
- [x] Created Admin portal for auditing and approving/suspending provider credentials.
- [x] Implemented authorized provider document retrieval requiring active on-chain consent.
- [x] Connected on-chain `verify_access` instruction execution with direct Solana Explorer links.
- [x] Built provider-to-provider clinical referral workflow with urgency tiers (`Routine`, `Urgent`, `STAT`).

### Phase 5: RBAC, Security Compliance & Rate Limiting — [COMPLETED]
- [x] Implemented 3-Persona Role-Based Access Control (`Patient`, `Provider`, `Admin`) with UI gating and header enforcement (`x-requester-role`).
- [x] Built real-time security audit trail (`/api/audit`) logging access requests, denials, referrals, and consent changes.
- [x] Implemented sliding-window rate limiting middleware (100 requests / 15 minutes) to prevent brute-force attacks.
- [x] Created live operational health monitoring endpoint (`/api/health`) tracking Devnet slot progression, RPC latency, and storage volume.

### Phase 6: Interoperability, Emergency Protocols & Recovery — [COMPLETED]
- [x] **HL7 FHIR R4 Export**: Built diagnostic bundle generator converting clinical records into standard FHIR R4 JSON embedding Solana SHA-256 integrity extensions.
- [x] **Emergency Break-Glass Protocol**: Implemented HIPAA § 164.312(a)(2)(ii) emergency override with elevated audit logging for acute trauma care.
- [x] **Account Recovery**: Built 12-word mnemonic recovery phrase verification and social guardian wallet re-anchoring.
- [x] **Vault Disaster Recovery**: Implemented complete JSON vault snapshot backup and restoration with SHA-256 bundle verification.

### Phase 7: Mobile-First Responsive Senior UI/UX & E2E Verification — [COMPLETED]
- [x] Persistent sticky header with integrated mobile navigation toggle.
- [x] Full slide-out responsive drawer navigation with role switcher and persona status.
- [x] Responsive wrap-friendly action buttons and touch-friendly tap targets across all screens.
- [x] Zero TypeScript and ESLint warnings (`npm run lint`).
- [x] 14/14 automated end-to-end integration and security test suites passing (`npm test`).

---

## 3. Future Roadmap (Post-MVP Horizons)

### Phase 8: Enterprise EHR Connectors & Decentralized Storage
- **SMART on FHIR OAuth2 Gateway**: Connect directly with major hospital EHR systems (Epic Systems, Cerner, AthenaHealth) for seamless bi-directional record import.
- **Decentralized Storage Backends**: Provide patient-selectable storage backends, including encrypted IPFS via Filecoin/Web3.Storage and Arweave permaweb.
- **Zero-Knowledge Selective Disclosure**: Implement Circom zk-SNARK circuits allowing patients to prove specific medical criteria (e.g. immunity, age threshold, insurance coverage) without disclosing identity or underlying health records.
- **Hardware Signer Integration**: Native support for Ledger and YubiKey FIDO2 hardware devices for hospital clinicians and institutional administrators.
- **Automated Revocation Heartbeats**: Background oracles to auto-flag expired consents and emit Solana webhook notifications to hospital systems.
