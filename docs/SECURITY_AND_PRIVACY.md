# MedTrust — Security and Privacy Architecture

## 1. Security Overview

MedTrust is architected with a **defense-in-depth** model where cryptographic mechanisms and physical API storage boundaries prevent unauthorized access, even in the presence of compromised network communication or untrusted infrastructure.

---

## 2. Cryptographic Security Controls

### 2.1 Zero Protected Health Information (PHI) On-Chain
- Public blockchains are permanently accessible to all participants. Storing sensitive health data on-chain creates irreversible privacy violations.
- MedTrust enforces that **zero plaintext medical information is committed to Solana**.
- The on-chain `Record` PDA holds exclusively:
  - Patient Solana public key (32 bytes)
  - Provider Solana public key (32 bytes)
  - Numeric record ID (8 bytes)
  - Cryptographic SHA-256 digest (32 bytes)
  - Registration timestamp (8 bytes)

### 2.2 Client-Side Encryption (`AES-256-GCM`)
- **Key Generation & Derivation**: Utilizes PBKDF2 with HMAC-SHA256 across 100,000 iterations and a 16-byte cryptographically secure random salt.
- **Cipher**: AES-256 in Galois/Counter Mode (GCM).
- **Initialization Vector**: A unique 96-bit (12-byte) cryptographically random IV generated for every individual record using `crypto.getRandomValues`.
- **Integrity Tag**: GCM generates an authentication tag that detects any bit alteration or tampering with the ciphertext prior to decryption.

### 2.3 One-Way SHA-256 Integrity Verification
- Plaintext documents are hashed using standard SHA-256 to create a 32-byte digest before encryption.
- During client-side integrity verification, the decrypted document's SHA-256 digest is calculated and compared byte-for-byte against the Solana on-chain `Record` PDA hash.
- Modifying a single character or byte in the document changes the resulting SHA-256 digest entirely (avalanche effect), causing instant detection and verification failure.

---

## 3. Storage Boundary & Access Control

### 3.1 Physical Boundary Enforcement (`HTTP 403 Forbidden`)
On-chain consent accounts alone cannot prevent unauthorized parties from fetching documents from off-chain storage servers. MedTrust closes this gap:
- Every document request to `/api/documents/[id]` evaluates the requester's public key and role against the live Solana `Consent` PDA.
- If consent is missing, inactive, or expired (`expiresAt <= currentTimestamp`), the server returns **`HTTP 403 Forbidden`** and refuses to release the ciphertext.
- All failed access attempts generate a security violation entry in `/api/audit`.

### 3.2 Role-Based Access Control (RBAC)
MedTrust enforces strict role separation across three personas:
1. **Patient**: Full access to own records, consent management, amendments, profile demographics, and recovery keys.
2. **Healthcare Provider**: Access limited strictly to records with active, non-expired patient consent; ability to execute `verify_access`, issue clinical referrals, and invoke break-glass protocols.
3. **Platform Administrator**: Access limited to provider licensing review/suspension, operational system health metrics, and disaster recovery backup restoration.

### 3.3 Emergency Break-Glass Protocol (HIPAA § 164.312)
- HIPAA § 164.312(a)(2)(ii) requires emergency access procedures to obtain necessary electronic protected health information during acute trauma or life-threatening situations.
- MedTrust allows verified healthcare providers to initiate an emergency break-glass override by supplying a mandatory clinical justification.
- The system immediately logs an elevated, permanent audit record with actor public key, emergency reason, timestamp, and accessed document ID.

### 3.4 API Abuse Prevention & Sliding-Window Rate Limiting
- The `/api/` gateway includes sliding-window rate limiting middleware (`rateLimit.ts`).
- Enforces a threshold of 100 requests per 15-minute window per IP or requester public key.
- Throttles abusive or automated scraping attempts with `HTTP 429 Too Many Requests`.

---

## 4. Threat Model & Mitigations

| Threat | Attack Vector | MedTrust Mitigation |
| :--- | :--- | :--- |
| **Public Blockchain Surveillance** | Adversary monitors Solana ledger for health conditions or patient identities. | Zero medical plaintext on-chain. Only 32-byte SHA-256 hashes and pseudonymous public keys are stored. |
| **Unauthorized Record Retrieval** | Malicious actor attempts to fetch patient documents without consent. | Server-side API boundary verifies on-chain `Consent` PDA state; returns `HTTP 403 Forbidden`. |
| **Document Tampering in Storage** | Attacker modifies an off-chain record on storage disks. | Client recalculates SHA-256 hash and compares with immutable Solana `Record` PDA; flags tamper mismatch immediately. |
| **Expired Consent Exploitation** | Provider attempts to retrieve records after consent window has elapsed. | Both on-chain smart contract and off-chain API gateway reject access when `Clock::get()?.unix_timestamp >= expires_at`. |
| **Unauthorized Revocation Bypass** | Provider attempts to read document after patient revokes consent. | Revocation transaction flips `active = false` on Solana; API gateway immediately blocks further retrieval. |
| **Credential Spoofing** | Unverified entity claims to be a licensed healthcare practitioner. | Platform administrator must review and approve provider medical license and pubkey in the Admin portal. |
| **Brute-Force / API Scraping** | Bot queries document endpoints rapidly. | Sliding-window rate limiter throttles traffic exceeding 100 requests / 15 minutes. |
| **Device or Wallet Loss** | Patient loses access to primary Solana wallet. | 12-word mnemonic recovery phrase and social guardian re-anchoring protocol transfers vault ownership. |

---

## 5. Security Best Practices for Users
- **Devnet Disclaimer**: The current deployment runs on Solana Devnet for demonstration and evaluation. Private keys must never be shared or committed to repositories.
- **Key Custody**: Store the 12-word recovery phrase offline in a secure, non-digital location.
- **Periodic Consent Auditing**: Patients should review the Access Control dashboard regularly and revoke permissions for completed consultations.
