# MedTrust — System Architecture

## 1. System Overview

MedTrust is an enterprise-grade medical record integrity and patient-governed consent protocol built on the **Solana blockchain** (Devnet) with client-side **AES-256-GCM encryption**, Role-Based Access Control (RBAC), and an access-controlled off-chain storage vault.

```
+----------------------------------------------------------------------------------------------------+
|                                    PATIENT / PROVIDER / ADMIN CLIENT                               |
|                               (Next.js 16 + React 19 + Tailwind CSS)                               |
+----------------------------------------------------------------------------------------------------+
       |                                           |                                  |
       | 1. Client-Side AES-256-GCM Encrypt/Decrypt | 2. On-Chain PDA Operations      | 3. Authenticated
       |    & SHA-256 Digest Calculation           |    (Anchor Program Instructions) |    API Boundary
       v                                           v                                  v
+-------------------------+             +-------------------------------+   +------------------------+
|   CLIENT CRYPTO ENGINE  |             |         SOLANA DEVNET         |   | MEDTRUST API GATEWAY   |
| (Web Crypto API, PBKDF2)|             |  Program ID: 9yeMT9py...Xv9Sh |   | (/api/documents,       |
+-------------------------+             +-------------------------------+   |  /api/consents,        |
       |                                           |                        |  /api/providers,       |
       |                                           |                        |  /api/audit, etc.)     |
       |                                           |                        +------------------------+
       |                                           |                                  |
       |                                           |                                  | 4. Strict Consent
       |                                           |                                  |    State Query
       v                                           v                                  v
+----------------------------------------------------------------------------------------------------+
|                              ENCRYPTED OFF-CHAIN VAULT STORAGE                                     |
|               (Physical Boundary Gate: 403 Forbidden on Expired / Revoked Consent)                  |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Cryptographic Architecture

### 2.1 Zero Plaintext On-Chain
Under no circumstances is protected health information (PHI) or unencrypted medical data committed to the Solana blockchain.
- Only **32-byte SHA-256 digests** are anchored to Solana Program Derived Addresses (PDAs).
- Only **time-bounded consent metadata** (patient pubkey, provider pubkey, record ID, expiration timestamp, active flag) is stored on-chain.

### 2.2 Client-Side Encryption (`AES-256-GCM`)
All medical documents are encrypted in the user's browser before transmission to storage:
- **Algorithm**: `AES-256-GCM` (Galois/Counter Mode) providing authenticated encryption with tamper resistance.
- **Key Derivation**: PBKDF2 using SHA-256, 100,000 iterations, with a cryptographically secure 16-byte random salt.
- **Initialization Vector**: A fresh, cryptographically random 12-byte IV generated per document.
- **Integrity Tag**: GCM provides an authentication tag ensuring that ciphertext cannot be altered in transit or at rest.

### 2.3 Record Amendment & Version Lineage
MedTrust supports immutable document versioning without silently overwriting past records:
- Each amendment is assigned an incremented version number (`v2`, `v3`, etc.).
- The amendment envelope explicitly stores `parentRecordId` and `parentRecordHash`.
- Lineage traversal verifies that every version in the chain links backward to the original cryptographic anchor.

---

## 3. Solana Program Architecture (Anchor)

**Program ID**: `9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh` (Solana Devnet)

### 3.1 Account Structures

#### Record Account PDA
Derived from: `[b"record", patient_pubkey.as_ref(), record_id.to_le_bytes().as_ref()]`
```rust
#[account]
pub struct Record {
    pub patient: Pubkey,       // 32 bytes
    pub provider: Pubkey,      // 32 bytes
    pub record_id: u64,        // 8 bytes
    pub record_hash: [u8; 32], // 32 bytes (SHA-256 digest)
    pub created_at: i64,       // 8 bytes (Unix timestamp)
}
```

#### Consent Account PDA
Derived from: `[b"consent", patient_pubkey.as_ref(), provider_pubkey.as_ref(), record_id.to_le_bytes().as_ref()]`
```rust
#[account]
pub struct Consent {
    pub patient: Pubkey,       // 32 bytes
    pub provider: Pubkey,      // 32 bytes
    pub record: Pubkey,        // 32 bytes (Record PDA)
    pub record_id: u64,        // 8 bytes
    pub granted_at: i64,       // 8 bytes (Unix timestamp)
    pub expires_at: i64,       // 8 bytes (Unix timestamp)
    pub active: bool,          // 1 byte
}
```

### 3.2 Program Instructions

| Instruction | Required Signers | Account Validation & Pre-Conditions | Outcome |
| :--- | :--- | :--- | :--- |
| `create_record` | `patient` | Validates PDA derivation and seeds | Initializes `Record` account with 32-byte SHA-256 digest |
| `grant_consent` | `patient` | Requires `expires_at > Clock::get()?.unix_timestamp` | Initializes/updates `Consent` PDA with `active = true` |
| `revoke_consent` | `patient` | Validates `consent.patient == patient.key()` | Sets `consent.active = false` |
| `verify_access` | `provider` | Checks `active == true`, `provider == signer`, and `expires_at > Clock::get()?.unix_timestamp` | Emits verification event and confirms validity |

---

## 4. Application Gateway & API Boundary

The MedTrust backend API layer enforces authorization independently of the frontend UI:

### 4.1 Physical Boundary Enforcement (`/api/documents/[id]`)
When any client or provider requests a document:
1. The gateway checks requester headers (`x-requester-pubkey`, `x-requester-role`).
2. If requester is the record's patient owner, access is granted.
3. If requester is a provider:
   - The gateway checks if emergency break-glass is invoked (`x-emergency-break-glass: true`). If so, checks reason, grants emergency access, and logs a high-priority audit entry.
   - Otherwise, the gateway queries the on-chain `Consent` PDA for `(patient, provider, record_id)`.
   - If consent is not found, `active === false`, or `expiresAt <= currentTimestamp`, the request is **rejected immediately with `HTTP 403 Forbidden`**.
   - An unauthorized access violation is recorded in `/api/audit`.

### 4.2 Rate Limiting Middleware (`rateLimit.ts`)
- Sliding-window algorithm tracking requests per IP or requester pubkey.
- Threshold: 100 requests per 15-minute sliding window.
- Returns `HTTP 429 Too Many Requests` with `Retry-After` header when exceeded.

### 4.3 Security Compliance Audit Trail (`/api/audit`)
Maintains an immutable in-memory and persistent log of:
- `DOCUMENT_ACCESSED`
- `ACCESS_DENIED` (Unauthorized boundary violation)
- `CONSENT_GRANTED`
- `CONSENT_REVOKED`
- `RECORD_AMENDED`
- `PROVIDER_REFERRAL`
- `EMERGENCY_BREAK_GLASS` (HIPAA compliance)

---

## 5. Role-Based Access Control (RBAC)

The application implements three segregated workspaces:

| Capability | Patient | Provider | Admin |
| :--- | :---: | :---: | :---: |
| View own medical records | Yes | No | No |
| Upload / Amend medical records | Yes | Yes (Clinical) | No |
| Grant / Revoke on-chain consent | Yes | No | No |
| View multi-consent dashboard | Yes | No | No |
| Account recovery phrase & guardian | Yes | No | No |
| Retrieve patient records | Own records | Authorized Only | No |
| Execute on-chain `verify_access` | No | Yes | No |
| Inter-provider clinical referrals | No | Yes | No |
| Emergency break-glass protocol | No | Yes | No |
| Approve / Suspend provider licenses | No | No | Yes |
| System health metrics & slot monitor | No | No | Yes |
| Full vault snapshot restore | No | No | Yes |

---

## 6. Interoperability & Disaster Recovery

### 6.1 HL7 FHIR R4 Standard Export
- Transforms decrypted patient records into valid HL7 FHIR R4 `Bundle` resources (`DocumentReference` / `DiagnosticReport`).
- Embeds standard `Identifier`, `Subject`, `Performer`, and custom extension embedding the Solana on-chain `record_hash` for cryptographic provenance.

### 6.2 Disaster Recovery & Vault Backup
- Full snapshot export generating a JSON bundle of all encrypted documents and providers.
- Computes SHA-256 integrity signature of the bundle.
- Admin-controlled restoration replaces or merges vault data after verifying signature integrity.
