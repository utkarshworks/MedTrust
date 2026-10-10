# MedTrust — System Architecture

## 1. Purpose

This document describes MedTrust's system architecture, including its frontend, Solana program, on-chain accounts, record integrity verification, consent management, and data boundaries.

It documents the current prototype rather than an assumed production architecture. Planned capabilities are identified separately from implemented functionality.

## 2. Architecture Overview

MedTrust is a healthcare record integrity and consent prototype built on Solana.

The system is designed to demonstrate how a patient can register a reference to a medical record, verify whether the record matches its registered cryptographic hash, and manage consent for a provider to access a record.

The architecture separates the user interface from blockchain program execution.

### Main components

1. **Frontend application:** Provides the patient and provider interfaces.
2. **Wallet integration:** Connects a user's Solana wallet and enables supported wallet-authorized transactions.
3. **Solana program:** Implements on-chain record registration and consent-related instructions.
4. **On-chain accounts:** Store record metadata, cryptographic hashes, and consent state.
5. **Solana RPC:** Enables the frontend and development tools to communicate with the Solana network.
6. **Off-chain record data:** Represents the medical record content that should remain outside public blockchain storage. A complete secure off-chain storage and retrieval system is a future capability.

## 3. Technology Stack

| Component                | Technology            | Responsibility                                             |
| ------------------------ | --------------------- | ---------------------------------------------------------- |
| Frontend framework       | Next.js               | Web application structure and rendering                    |
| UI library               | React                 | Interactive user interface                                 |
| Language                 | TypeScript            | Frontend types and application logic                       |
| Styling                  | Tailwind CSS          | Interface styling                                          |
| Blockchain               | Solana Devnet         | Prototype transaction execution and account storage        |
| Smart contract framework | Anchor                | Solana program development and account validation          |
| Program language         | Rust                  | On-chain instruction implementation                        |
| Cryptographic hashing    | SHA-256               | Record integrity verification                              |
| Network communication    | Solana RPC            | Reading accounts and submitting or confirming transactions |
| Wallet integration       | Solana Wallet Adapter | Connecting supported wallets and authorizing transactions  |

This table describes the documented project stack. Individual responsibilities should be verified against the current source code before major implementation changes.

## 4. System Components

### 4.1 Frontend application

The frontend is the primary interaction layer for patients and providers.

Its current responsibilities include:

* Connecting a Solana wallet.
* Registering a medical record reference.
* Retrieving registered record information.
* Calculating and comparing record hashes.
* Demonstrating record tampering.
* Granting and revoking provider consent.
* Checking provider access conditions.
* Displaying consent activity and transaction references.
* Communicating errors and transaction outcomes.

The frontend coordinates user interactions and blockchain requests. It does not independently establish that a provider is a legitimate healthcare professional or that a medical record is clinically accurate.

### 4.2 Wallet integration

The wallet provides a user-controlled identity represented by a Solana public key and authorizes supported transactions.

The prototype uses wallet-based identities to associate patients and providers with blockchain records and consent state.

A wallet address alone does not establish a person's real-world identity, professional credentials, or relationship with a healthcare institution.

Provider identity verification remains a separate requirement.

### 4.3 Solana program

The Anchor-based Solana program contains the on-chain instructions for record and consent operations.

The documented instruction set includes:

* `create_record`
* `grant_consent`
* `revoke_consent`
* `verify_access`

These instructions support record registration, consent state changes, and verification of configured access conditions.

The program should be treated as a prototype. Its current behavior and account constraints must be checked against the actual Rust implementation when modifying the architecture or making security claims.

### 4.4 Solana RPC

The frontend communicates with Solana through an RPC endpoint.

RPC interactions support operations such as:

* Reading on-chain accounts.
* Submitting transactions.
* Obtaining transaction results.
* Reading record and consent state.
* Displaying links to blockchain activity.

The prototype uses Solana Devnet. Devnet is intended for development and testing, not production healthcare operations.

RPC availability, rate limits, transaction confirmation, and network errors can affect application behavior.

## 5. On-Chain Data Model

The program uses two principal account structures: `Record` and `Consent`.

### 5.1 Record account

The documented record structure contains:

| Field         | Type              | Purpose                                           |
| ------------- | ----------------- | ------------------------------------------------- |
| `patient`     | Public key        | Identifies the patient associated with the record |
| `provider`    | Public key        | Stores the associated provider address            |
| `record_id`   | Record identifier | Identifies the record                             |
| `record_hash` | `[u8; 32]`        | Stores the 32-byte SHA-256 hash                   |
| `created_at`  | Timestamp         | Records the registration time                     |

The record account stores a cryptographic reference to the medical record rather than requiring the complete medical record to be stored on-chain.

The exact identifier type, serialization rules, account constraints, and initialization behavior should be confirmed in the current program source before implementation changes.

### 5.2 Consent account

The documented consent structure contains:

| Field        | Type              | Purpose                                         |
| ------------ | ----------------- | ----------------------------------------------- |
| `patient`    | Public key        | Identifies the patient granting consent         |
| `provider`   | Public key        | Identifies the provider associated with consent |
| `record`     | Public key        | References the record account                   |
| `record_id`  | Record identifier | Associates consent with the record identifier   |
| `granted_at` | Timestamp         | Records when consent was granted                |
| `expires_at` | Timestamp         | Defines the consent expiry time                 |
| `active`     | Boolean           | Represents the current consent state            |

The consent account represents permission-related state. It does not, by itself, ensure that every possible route to medical data is protected by that permission.

## 6. Record Integrity Verification

MedTrust uses SHA-256 hashing to compare a medical record against its registered hash.

### Current conceptual flow

1. A record is prepared for registration.
2. The application calculates its SHA-256 hash.
3. The hash is registered through the Solana program.
4. The program stores the hash in the record account.
5. During verification, the application calculates a hash of the record being checked.
6. The calculated hash is compared with the registered hash.
7. Matching hashes indicate that the checked content matches the registered reference, subject to consistent input and serialization.

If the record content changes, its hash will ordinarily change, causing the comparison to fail.

### Important limitations

* A matching hash does not prove that the medical information is clinically correct.
* A matching hash does not prove that the original record was issued by a legitimate healthcare provider.
* Verification depends on hashing the same content representation that was originally registered.
* The hash does not reveal the medical record itself.
* A hash comparison does not provide confidentiality for data stored elsewhere.

The exact record encoding and hashing implementation should be treated as part of the integrity protocol and kept consistent across registration and verification.

## 7. Consent Lifecycle

The consent lifecycle is represented through on-chain state and frontend interactions.

### 7.1 Grant consent

The patient initiates a consent operation for a specified provider and record, with an expiry time.

The program records the relevant consent information.

### 7.2 Verify access conditions

The provider initiates an access-condition verification operation.

The documented verification logic checks the relevant consent state and configured conditions, including provider association, active status, and expiry.

A successful check demonstrates that the program's defined conditions were satisfied at verification time. It does not prove that a separate off-chain medical record delivery service enforces the same conditions.

### 7.3 Revoke consent

The patient can revoke consent through the supported application flow.

The consent state is updated so that subsequent verification can reject access under the revoked consent.

### 7.4 Expired consent

Consent expiry is represented by an expiry timestamp.

The verification logic should reject consent that has expired according to the program's time comparison.

Boundary behavior, including the exact treatment of a timestamp equal to the expiry time, should be confirmed in the Rust implementation and tests.

### 7.5 Current enforcement limitation

The current prototype demonstrates consent-state management and verification. It does not yet establish end-to-end enforcement across a complete off-chain medical record storage and delivery system.

Provider identity verification and the authorization of all record retrieval paths require further work.

## 8. Data Boundaries

MedTrust separates blockchain metadata from medical record content.

### 8.1 On-chain data

The documented on-chain structures include:

* Patient and provider wallet addresses.
* Record identifiers.
* Cryptographic record hashes.
* Record registration timestamps.
* Consent associations.
* Consent activation and expiry information.

Blockchain data can be publicly observable. Wallet addresses, record identifiers, hashes, and transaction activity may create privacy risks when associated with identifiable people or healthcare events.

### 8.2 Off-chain medical data

The intended design keeps medical record content outside public blockchain storage.

A complete production implementation would require a secure storage and retrieval architecture with appropriate encryption, authorization, key management, retention controls, and access auditing.

Encrypted off-chain storage and end-to-end access enforcement are not established merely by the current on-chain record and consent structures.

### 8.3 Data minimization

The system should store only the on-chain information necessary for its integrity and consent functions.

Before adding a field to an on-chain account, evaluate whether it could expose personal, clinical, or otherwise sensitive information.

## 9. Transaction and Error Handling

Blockchain operations may fail because of invalid account relationships, missing signatures, insufficient funds, expired consent, RPC failures, network conditions, or program-level validation.

The frontend should distinguish between:

* Wallet connection errors.
* User-rejected transactions.
* Transaction submission or confirmation failures.
* Invalid or missing account data.
* Consent verification failures.
* Record hash mismatches.
* RPC rate limits and connectivity problems.

A transaction being submitted is not equivalent to successful confirmation. The interface should report outcomes according to the actual transaction state.

The frontend's error-handling behavior should remain consistent with the responses returned by the program and RPC layer.

## 10. Security Boundaries and Current Limitations

The current prototype has several important limitations:

1. **Provider identity:** A wallet address is not proof of professional identity or credentials.
2. **Provider authorization:** The documented implementation allows provider identity to be supplied as an unchecked account in the record creation and consent-grant instructions. These operations must not be assumed to prove provider authorization.
3. **Off-chain enforcement:** On-chain consent state does not automatically protect medical records stored or served elsewhere.
4. **Public observability:** On-chain metadata and transactions may be visible to network participants.
5. **Clinical validity:** Record integrity does not establish clinical accuracy or authenticity.
6. **Operational readiness:** Devnet deployment and successful prototype tests do not establish production readiness, regulatory compliance, or suitability for real patient data.
7. **Key management:** Production encryption and key-management controls are not established by the current architecture.
8. **Audit completeness:** Transaction history alone should not be described as a complete audit of every off-chain record access.

These limitations must be addressed before the system is considered for real-world healthcare deployment.

## 11. Planned Architectural Improvements

The following are future capabilities, not claims about the current implementation:

* Secure off-chain medical record storage.
* Encryption and appropriate cryptographic key management.
* Verified provider identity and credential management.
* End-to-end enforcement of consent during record retrieval.
* More comprehensive access auditing across on-chain and off-chain operations.
* Defined record formats and canonical hashing rules.
* Stronger account constraints and authorization checks.
* Production RPC and infrastructure configuration.
* Security review, testing, monitoring, and incident response.
* Privacy and regulatory assessment for intended deployment jurisdictions.

Each improvement should be specified and tested before being represented as implemented.

## 12. Architecture Principles

MedTrust's architecture should follow these principles:

1. Keep medical record content off the public blockchain.
2. Use cryptographic hashes to support integrity checks, not to claim clinical truth.
3. Treat consent state and actual data-access enforcement as separate concerns.
4. Do not equate wallet ownership with verified real-world identity.
5. Minimize sensitive information stored on-chain.
6. Make transaction outcomes and verification failures understandable to users.
7. Document implemented functionality separately from planned capabilities.
8. Require appropriate security and privacy review before production use.

## 13. Source of Truth

The Rust program and its account definitions are the source of truth for on-chain behavior.

The frontend source code is the source of truth for user interactions, record hashing, RPC calls, and displayed verification results.

This document provides a high-level architectural description. When code and documentation differ, investigate the implementation, update the documentation, and add or revise tests as necessary.

---

**Document status:** Architecture documentation for the current prototype.

**Production status:** Not production-ready. Security, privacy, identity, off-chain storage, and end-to-end authorization requirements remain to be addressed.
