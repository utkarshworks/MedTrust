# MedTrust — Product Requirements

## 1. Purpose

This document defines the functional and non-functional requirements for MedTrust.

It translates the product scope and user flows into requirements that can guide development, testing, and future product decisions.

Requirements are classified as:
- **Implemented:** Available in the current prototype.
- **Planned:** Intended for future development.
- **Out of scope:** Not supported by the current prototype.

## 2. Product Overview

MedTrust is a prototype exploring blockchain-based medical-record integrity verification and patient-controlled consent management.

The system uses Solana to record integrity references and consent information without placing complete medical records directly on the public blockchain.

The prototype demonstrates how a blockchain can support verification and consent records. It does not constitute a complete electronic health record system or production-ready healthcare infrastructure.

## 3. User Roles

### 3.1 Patient
The patient creates or manages a record entry and grants or revokes consent for a designated provider.

### 3.2 Healthcare Provider
The provider uses a wallet identity to participate in consent verification.

Production-grade healthcare-provider identity verification is not currently implemented.

### 3.3 Demonstrator
A demonstrator evaluates record creation, integrity verification, consent operations, and tampering simulation.

## 4. Functional Requirements

### FR-01: Wallet Connection

**Requirement:** The application must allow users to connect a compatible Solana wallet.

**Status:** Implemented.

**Acceptance criteria:**
- A user can connect a supported wallet.
- The application identifies the connected wallet address.
- Operations requiring wallet authorization cannot proceed without the required wallet connection.
- Connection failures are communicated to the user.

### FR-02: Medical-Record Registration

**Requirement:** The system must register a record entry and associate it with a cryptographic integrity reference.

**Status:** Implemented.

**Acceptance criteria:**
- The application calculates a SHA-256 hash from the record data used by the current implementation.
- The application submits the required record information to the Solana program.
- The program stores the record's integrity reference.
- The application reports transaction success or failure.
- The complete medical record is not stored directly on the public blockchain by this design.

### FR-03: Record Retrieval

**Requirement:** The application must retrieve and display available on-chain record information.

**Status:** Implemented.

**Acceptance criteria:**
- The application can retrieve available registered records.
- The displayed information corresponds to the retrieved on-chain data.
- Retrieval failures are distinguishable from successful retrieval.
- The application does not claim that on-chain metadata represents a complete medical history.

### FR-04: Record Integrity Verification

**Requirement:** The application must compare the calculated SHA-256 hash of available record data with the registered integrity reference.

**Status:** Implemented.

**Acceptance criteria:**
- The application calculates the hash of the data being verified.
- The calculated hash is compared with the registered hash.
- Matching hashes produce a successful integrity result.
- Different hashes produce a mismatch result.
- Technical failures are not reported as successful verification.

**Important limitation:** A matching hash establishes consistency with the registered reference. It does not prove clinical accuracy, authenticity of the original entry, or the identity and qualifications of its author.

### FR-05: Tampering Demonstration

**Requirement:** The prototype must demonstrate how modified record data affects integrity verification.

**Status:** Implemented.

**Acceptance criteria:**
- The demonstrator can activate the available tampering simulation.
- The modified data produces a different hash when its contents change.
- Verification detects the mismatch against the original reference.
- The demonstration does not falsely imply that every type of record alteration is prevented.

### FR-06: Grant Consent

**Requirement:** The patient must be able to record consent for a designated provider and record.

**Status:** Implemented.

**Acceptance criteria:**
- The consent entry identifies the patient.
- The consent entry identifies the designated provider.
- The consent entry references the relevant record.
- The consent entry contains the applicable validity information.
- The application reports transaction success or failure.

### FR-07: Revoke Consent

**Requirement:** The patient must be able to revoke an existing consent entry.

**Status:** Implemented.

**Acceptance criteria:**
- The patient can initiate revocation through the available interface.
- The program updates the consent status.
- A revoked consent fails the relevant active-consent check.
- The application displays the updated status.
- Transaction failures are communicated clearly.

**Important limitation:** Revocation does not automatically delete information previously copied or downloaded by a provider.

### FR-08: Verify Provider Access Conditions

**Requirement:** The program must verify the relevant consent conditions before approving an access-verification request.

**Status:** Implemented.

**Acceptance criteria:**
- The provider identity used in the request is checked against the designated provider.
- The consent must be active.
- The consent must satisfy its validity conditions.
- A wrong provider must fail verification.
- A revoked or expired consent must fail verification.
- The application communicates the verification result.

**Important limitation:** This requirement covers the prototype's on-chain consent checks. It does not establish complete access enforcement for medical data stored outside the program.

### FR-09: Consent Activity History

**Requirement:** The application must display available consent-related activity.

**Status:** Implemented.

**Acceptance criteria:**
- Available activity entries can be retrieved and displayed.
- Supported entries provide links to their associated blockchain transactions.
- Retrieval failures are handled without falsely presenting incomplete results as complete.
- The interface does not describe this history as a comprehensive record of all medical-data access.

### FR-10: Network and Transaction Error Handling

**Requirement:** The application must communicate when an operation fails because of network, RPC, wallet, or transaction errors.

**Status:** Partially implemented; requires continued testing.

**Acceptance criteria:**
- Failed operations do not appear successful.
- The user receives an understandable error message.
- A failed retrieval is distinguishable from an empty result.
- The interface avoids unnecessary duplicate RPC requests where practical.
- Retry behavior does not accidentally duplicate sensitive or consequential operations.

## 5. Non-Functional Requirements

### NFR-01: Data Minimization

The system should place only the blockchain data necessary for its intended integrity and consent functions on-chain.

Complete medical records should not be written directly to the public blockchain.

**Status:** Architectural principle; production implementation requires further review.

### NFR-02: Privacy

The system must not assume that a public blockchain is a private storage environment.

Future development must assess whether record identifiers, wallet addresses, consent relationships, timestamps, and transaction history could reveal sensitive information.

**Status:** Further design and validation required.

### NFR-03: Security

Future production versions must assess:
- Wallet authorization.
- Patient and provider identity verification.
- Consent validation.
- Off-chain storage security.
- Encryption and key management.
- Unauthorized data retrieval.
- Input validation.
- Replay and transaction-handling risks.

**Status:** Production security has not been established.

### NFR-04: Integrity

The application must use consistent hash calculation and comparison procedures for the record data being verified.

**Status:** Hash-based integrity verification is implemented; the full record lifecycle requires further testing.

### NFR-05: Reliability

The application should distinguish successful operations from failed or incomplete operations.

RPC failures, wallet errors, and transaction failures must not produce misleading success states.

**Status:** Implemented in part; further testing required.

### NFR-06: Usability

The interface should explain:
- Whether a wallet is connected.
- Whether a transaction succeeded.
- Whether a record matches its registered hash.
- Whether consent is active, revoked, or invalid.
- Whether a failure is caused by verification logic or a technical problem.

**Status:** Prototype interface implemented; usability evaluation remains future work.

### NFR-07: Maintainability

The project should maintain a clear separation between:
- Blockchain program logic.
- Frontend presentation.
- Wallet interactions.
- Record-integrity functions.
- Consent operations.
- Activity-history retrieval.

**Status:** Existing project structure provides these areas; ongoing development should preserve clear responsibilities.

## 6. Security and Product Boundaries

The current prototype must not be represented as providing capabilities that have not been implemented and validated.

The following are not established:
- Production-grade healthcare-provider identity verification.
- Complete enforcement of consent across external storage systems.
- Secure end-to-end medical-record delivery.
- Automatic deletion of previously shared information.
- A comprehensive medical-record access audit.
- Clinical validation of medical information.
- Regulatory compliance or certification.
- Production readiness for handling real patient data.

## 7. Acceptance Testing Priorities

The following behaviors should remain covered by automated or repeatable tests:

1. Record creation succeeds with valid inputs.
2. A created record can be retrieved.
3. An unchanged record passes integrity verification.
4. Modified record data fails integrity verification.
5. A patient can grant consent.
6. A patient can revoke consent.
7. Valid active consent passes the applicable verification checks.
8. Revoked consent fails verification.
9. Expired consent fails verification.
10. A request from the wrong provider fails verification.
11. Transaction and RPC failures are handled without false success results.

Existing automated tests should be retained when new features are introduced.

## 8. Planned Requirements

The following capabilities require further design before implementation.

### PR-01: Secure Off-Chain Record Storage
Define how medical records are stored, encrypted, retrieved, and protected.

### PR-02: Verified Provider Identity
Define how a healthcare provider's identity and organizational affiliation are established.

### PR-03: End-to-End Access Enforcement
Connect consent verification to the actual retrieval and delivery of protected medical information.

### PR-04: Consent Lifecycle
Define how expiry, revocation, renewed consent, and changes to provider access affect future retrieval requests.

### PR-05: Comprehensive Auditability
Define which events must be recorded to support a reliable account of access attempts and medical-data sharing.

### PR-06: Production Readiness
Conduct appropriate security, privacy, legal, regulatory, and clinical reviews before any real-world deployment involving patient data.

## 9. Requirement Management

Requirements should be updated when:
- Product scope changes.
- A planned capability becomes implemented.
- Testing identifies a missing requirement.
- A security or privacy review identifies a new risk.
- User feedback changes the intended workflow.

Every requirement should have a clear status and acceptance criteria wherever practical.

## 10. Document Status

This document describes the current prototype requirements and future design considerations.

It is intended to guide product development and testing, not to certify the system's security, clinical suitability, or regulatory compliance.
