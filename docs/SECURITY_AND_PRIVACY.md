# MedTrust — Security and Privacy

## 1. Purpose

This document describes the security and privacy considerations for MedTrust, a healthcare record integrity and consent prototype built on Solana.

It documents the current implementation's security boundaries, identifies risks, and defines requirements that must be addressed before considering production deployment.

MedTrust is currently a prototype. Its existing functionality must not be interpreted as proof of production-grade security, privacy, regulatory compliance, or end-to-end protection of medical records.

## 2. Security Objectives

MedTrust aims to explore the following objectives:

1. **Record integrity:** Detect whether a record differs from its registered cryptographic reference.
2. **Patient-controlled consent:** Allow patients to grant and revoke consent represented in on-chain state.
3. **Access-condition verification:** Check whether configured consent conditions are satisfied.
4. **Data minimization:** Avoid storing complete medical records on a public blockchain.
5. **Transparency:** Make relevant blockchain transactions and consent-state changes inspectable.
6. **Explicit security boundaries:** Distinguish on-chain verification from identity verification, confidentiality, and off-chain access enforcement.

These are design objectives. Their implementation and completeness must be assessed individually.

## 3. Data Classification

MedTrust handles several categories of information with different security implications.

| Data category                  | Examples                                        | Security and privacy consideration                                                                       |
| ------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Wallet identifiers             | Patient and provider public keys                | Public keys do not establish real-world identity, but may be linkable to individuals                     |
| Record metadata                | Record identifiers and timestamps               | May reveal relationships or patterns associated with healthcare activity                                 |
| Cryptographic hashes           | SHA-256 record hashes                           | Do not reveal the original content directly, but may enable correlation or confirmation of known content |
| Consent information            | Provider association, active state, expiry time | May reveal healthcare relationships and access patterns                                                  |
| Transaction history            | Program instructions and transaction signatures | May be publicly observable on Solana                                                                     |
| Medical record content         | Reports, prescriptions, laboratory results      | Sensitive information that should not be stored directly on the public blockchain                        |
| Off-chain credentials and keys | Encryption keys and authentication credentials  | Require appropriate protection, access controls, and lifecycle management                                |

**Important:** Information can remain sensitive even when names and direct identifiers are absent. Combinations of public keys, timestamps, identifiers, and transaction history may expose relationships.

## 4. On-Chain Privacy

Solana is a public blockchain. Information written to public accounts or exposed through transactions should be treated as potentially accessible to network participants.

The current architecture stores record and consent metadata, including wallet addresses, record identifiers, hashes, and timestamps.

### Privacy risks

* Public keys may be linked to identifiable people through external information.
* Record identifiers may reveal information if they contain meaningful or predictable values.
* Transaction timing may reveal patterns of healthcare-related activity.
* Consent relationships may reveal associations between patients and providers.
* Hashes of predictable or known content may be vulnerable to guessing and comparison.
* Previously published blockchain data should not be assumed to become private after consent is revoked.

### Requirements

* Do not store names, addresses, diagnoses, prescriptions, laboratory results, or complete medical records directly on-chain.
* Avoid putting sensitive information into transaction logs, account identifiers, or public metadata.
* Use opaque identifiers that do not encode personal or clinical information.
* Assess whether a proposed on-chain field is necessary before adding it.
* Consider correlation and inference risks when designing record and consent accounts.
* Do not describe hashes or wallet addresses as anonymization guarantees.

## 5. Record Integrity and Hashing

MedTrust uses SHA-256 to generate a cryptographic reference for a medical record.

### Security property

If the record content changes, its SHA-256 hash will ordinarily change. Comparing the hash of a record with its registered reference can therefore help detect changes.

### Limitations

A matching hash does not prove:

* That the original record was accurate.
* That the record was created by a legitimate healthcare professional.
* That the record was issued by the institution it claims to represent.
* That the person registering the hash had authority to register the record.
* That the record was obtained from a trusted source.

Integrity verification depends on consistent record representation. Changes in encoding, whitespace, metadata, file format, or serialization can produce different hashes even when the underlying clinical meaning is unchanged.

### Requirements

* Define and document the exact bytes used for hashing.
* Apply consistent hashing rules during registration and verification.
* Test matching records and modified records.
* Treat a hash mismatch as a failed integrity check, not automatically as evidence of malicious activity.
* Establish a trusted record-origin and provider-verification process separately.

## 6. Wallet Security and Identity

A Solana wallet provides a cryptographic identity represented by a public key and can authorize transactions through the corresponding private key.

A wallet address is not equivalent to a verified patient identity, a provider credential, or institutional authorization.

### Current implementation limitation

The documented program uses an unchecked account for the provider in the `create_record` and `grant_consent` instructions. The provider address supplied to those instructions must not be treated as proof of provider authorization.

The `verify_access` instruction requires the provider to sign the verification transaction. This does not, by itself, establish the provider's real-world identity or professional credentials.

### Requirements

* Verify account constraints and signer requirements in every relevant instruction.
* Require appropriate authorization for sensitive state changes.
* Establish a trusted method of verifying healthcare providers.
* Define how patient identity and authority are established for the intended use case.
* Never request users to share their wallet seed phrase or private keys.
* Avoid logging secrets or exposing sensitive wallet-related data.
* Provide clear handling for rejected transactions and unavailable wallets.

## 7. Consent Security

MedTrust represents consent using an on-chain account containing patient and provider associations, a record reference, grant and expiry timestamps, and an active-state flag.

The prototype supports granting consent, revoking consent, and checking configured consent conditions.

### Security limitations

On-chain consent state does not automatically control access to medical data stored outside the blockchain.

A separate storage or delivery service could expose a record unless it independently enforces the relevant authorization rules.

Consent verification also does not prove that a provider is a verified healthcare professional.

### Requirements

* Validate patient authority before consent state can be changed.
* Validate the association between consent, provider, and record.
* Check that consent is active and has not expired.
* Define expiry-boundary behavior precisely.
* Ensure revocation is reflected in subsequent authorization decisions.
* Protect every medical record retrieval path with server-side or storage-layer authorization.
* Do not rely exclusively on frontend checks to enforce access control.
* Define how already-issued download links, cached copies, and previously downloaded records are handled.
* Explain to users that revocation cannot guarantee deletion of copies already obtained by another party.

## 8. Off-Chain Data Protection

The current prototype does not establish a complete secure off-chain medical record storage and delivery system.

Any future off-chain implementation must be designed separately and integrated with the consent mechanism.

### Required controls

**Encryption**

* Encrypt medical records during transmission.
* Encrypt stored medical records.
* Define how encryption keys are generated, distributed, stored, rotated, and revoked.

**Authorization**

* Authenticate the requesting user.
* Verify that the requester is authorized for the specific record.
* Check current consent and expiry conditions before releasing a record.
* Enforce authorization on the server or storage layer rather than trusting the browser.

**Storage**

* Restrict access to storage infrastructure.
* Avoid public access to sensitive medical records.
* Define backup, retention, deletion, and recovery procedures.
* Assess third-party storage providers and their security responsibilities.

**Key management**

* Avoid embedding secrets in source code or frontend bundles.
* Do not store private encryption keys on the public blockchain.
* Define what happens when a key is lost, compromised, or rotated.
* Test recovery procedures without exposing patient data.

These are future requirements, not capabilities established by the current prototype.

## 9. Smart Contract Security

The Solana program is a critical security boundary because it controls on-chain record and consent state.

### Areas requiring review

* Account ownership and account type validation.
* Signer requirements for each instruction.
* Patient authorization for consent changes.
* Record and consent account relationships.
* Provider association checks.
* Expiry and active-state validation.
* Replay, duplicate-operation, and account-substitution risks where applicable.
* Error handling and invalid account inputs.
* Integer and timestamp handling.
* Program upgrade authority and deployment controls.

### Current implementation considerations

The current prototype distinguishes between provider identity supplied as an unchecked account during record creation or consent granting and provider signing during access verification.

This distinction must remain explicit in documentation and testing. It must not be described as complete provider authorization.

The program should undergo a focused security review before handling real patient records or supporting production healthcare workflows.

## 10. Frontend and RPC Security

The frontend communicates with the Solana network through an RPC endpoint and displays record, consent, and transaction information.

### Risks

* RPC rate limits or service outages may interrupt operations.
* Users may misinterpret a submitted transaction as a confirmed transaction.
* Incorrect account data or stale state may affect displayed results.
* Client-side checks can be bypassed and cannot replace program or server-side authorization.
* Sensitive information may be unintentionally exposed through browser logs or application telemetry.

### Requirements

* Distinguish transaction submission from successful confirmation.
* Handle RPC errors and rate limits without falsely reporting success.
* Avoid logging medical record content, private keys, or encryption secrets.
* Validate external and user-provided data.
* Treat client-visible data and client-side decisions as untrusted for security enforcement.
* Review dependencies and configuration before production deployment.

## 11. Activity History and Auditability

The prototype displays consent-related activity and transaction references.

Public blockchain transactions provide evidence that particular on-chain operations occurred. They do not automatically constitute a complete audit of all medical record access.

For example, a record may be viewed, downloaded, copied, or shared outside the blockchain without generating a corresponding on-chain event.

### Requirements

* Clearly distinguish blockchain transaction history from off-chain access logs.
* Define which actions must be audited.
* Protect any off-chain audit logs against unauthorized modification and disclosure.
* Avoid placing unnecessary patient information in logs.
* Define retention, access, and investigation procedures.
* Do not claim complete access auditing until all relevant access paths are covered.

## 12. Threat Model

The following table identifies key risks to assess.

| Threat                           | Potential impact                                    | Required mitigation direction                                |
| -------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| Unauthorized consent change      | Incorrect permissions                               | Validate patient authority and account constraints           |
| Forged provider association      | Misleading provider attribution                     | Verify provider identity and authorization                   |
| Unauthorized off-chain retrieval | Medical data disclosure                             | Enforce access controls at the data-delivery layer           |
| Record modification              | Incorrect or altered data                           | Recalculate and compare the registered hash                  |
| False confidence in a valid hash | Acceptance of inaccurate or unauthenticated records | Verify provenance and issuer separately                      |
| Public metadata correlation      | Privacy exposure                                    | Minimize metadata and assess linkability                     |
| Compromised wallet               | Unauthorized signed operations                      | Wallet security guidance and appropriate recovery procedures |
| RPC failure or stale state       | Incorrect user expectations or failed operations    | Clear transaction states, retries, and error handling        |
| Incomplete audit trail           | Inability to reconstruct access                     | Integrate and protect off-chain access logging               |
| Insecure key management          | Unauthorized decryption or permanent data loss      | Establish a reviewed key-management lifecycle                |

This is an initial threat model, not an exhaustive security assessment.

## 13. Development and Testing Requirements

Before any production-oriented release, the project should include:

* Automated tests for all program instructions.
* Tests for unauthorized signers and invalid account relationships.
* Tests for consent grant, revocation, expiry, and wrong-provider scenarios.
* Tests for valid and modified record hashes.
* Negative tests for malformed and unexpected inputs.
* Frontend tests for failed transactions and RPC errors.
* Security review of account constraints and authorization logic.
* Dependency and deployment configuration review.
* Tests for off-chain authorization if record storage is introduced.
* Documented procedures for responding to security incidents.

Passing prototype tests does not prove the absence of vulnerabilities.

## 14. Production Readiness Requirements

Before handling real patient data, MedTrust would need, at minimum:

1. A reviewed smart contract with appropriate authorization and account constraints.
2. Verified provider identity and a defined patient identity model.
3. Secure off-chain record storage and retrieval.
4. Encryption and reviewed key-management procedures.
5. End-to-end consent enforcement, including revocation behavior.
6. A privacy assessment covering public blockchain metadata.
7. A defined audit and incident-response model.
8. Infrastructure monitoring, backup, recovery, and operational controls.
9. Independent security testing appropriate to the system's risk.
10. A legal and regulatory assessment for the intended jurisdictions and deployment model.

No claim of regulatory compliance or production readiness should be made until supported by the relevant assessment and evidence.

## 15. Security Principles

MedTrust should follow these principles:

1. Minimize sensitive data written to a public blockchain.
2. Treat wallet ownership and real-world identity as separate concepts.
3. Treat integrity verification and clinical validity as separate concepts.
4. Treat consent state and actual data-access enforcement as separate controls.
5. Enforce authorization beyond the frontend.
6. Design for revocation while acknowledging that previously copied data cannot reliably be recalled.
7. Make security limitations explicit to users and developers.
8. Validate security claims against the implementation and tests.
9. Avoid using real patient data in development unless appropriate safeguards and approvals are in place.
10. Do not represent the prototype as production-ready.

---

**Document status:** Security and privacy requirements for the current prototype.

**Production status:** Not production-ready. The security controls described as requirements must be implemented, tested, and reviewed before production healthcare use.
