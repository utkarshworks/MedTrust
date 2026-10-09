# MedTrust — User Flows

## 1. Purpose

This document describes how patients and healthcare providers interact with MedTrust.

It separates currently implemented prototype workflows from planned workflows so that product, engineering, and business decisions remain aligned.

## 2. User Roles

### 2.1 Patient

The patient is the owner of a medical record in the prototype. The patient can create a record, inspect its integrity information, and manage consent associated with sharing it.

### 2.2 Healthcare Provider

The healthcare provider is a party that may need to verify a medical record and check whether consent has been granted.

The prototype uses wallet addresses to represent participants. Production-grade provider identity verification is not currently implemented.

### 2.3 Demonstrator or Evaluator

A demonstrator can use the prototype to observe record creation, integrity verification, consent changes, and simulated tampering.

This role is useful for demonstrations and testing; it is not a separate production user role.

## 3. Patient Flow: Create a Medical Record

**Goal:** Register a record and establish an on-chain integrity reference.

### Steps

1. The patient opens the MedTrust application.
2. The patient connects a compatible Solana wallet.
3. The patient creates a medical-record entry through the available interface.
4. The application calculates a SHA-256 hash of the record data.
5. The application submits the record metadata and hash to the Solana program.
6. The program stores the record's integrity reference on-chain.
7. The application displays the record and its available integrity information.

### Expected Outcome

The patient can inspect the record and its associated on-chain integrity reference.

### Current Prototype Status

Record creation and on-chain record retrieval are implemented.

### Limitations

The complete medical record is not intended to be stored directly on a public blockchain. The prototype does not provide a complete production medical-record storage or exchange system.

---

## 4. Patient Flow: Verify Record Integrity

**Goal:** Determine whether the available record data matches its registered integrity reference.

### Steps

1. The patient selects or opens a record.
2. The application retrieves the record's stored integrity reference.
3. The application calculates the SHA-256 hash of the available record data.
4. The application compares the calculated hash with the stored hash.
5. The application displays the verification result.

### Possible Outcomes

**Record matches**

The calculated hash matches the stored hash. The available data matches the registered integrity reference.

**Record does not match**

The calculated hash differs from the stored hash. The available data does not match the registered integrity reference.

### Current Prototype Status

Hash-based integrity verification is implemented.

### Limitations

A matching hash does not independently establish that the original medical information was clinically accurate, entered by a qualified clinician, or obtained from a trusted source.

---

## 5. Demonstration Flow: Simulate Record Tampering

**Goal:** Demonstrate how changes to record data affect integrity verification.

### Steps

1. The demonstrator opens a record.
2. The demonstrator activates the available tampering simulation.
3. The application changes the data used in the demonstration.
4. The application recalculates the record's hash.
5. The application compares the new hash with the original stored integrity reference.
6. The application displays the verification result.

### Expected Outcome

The modified data should produce a different hash, causing integrity verification to fail.

### Current Prototype Status

A tampering demonstration is implemented.

### Important Distinction

The demonstration illustrates hash-based integrity checking. It should not be interpreted as evidence that MedTrust can prevent every form of medical-record alteration in a production environment.

---

## 6. Patient Flow: Grant Consent

**Goal:** Record permission for a designated provider to access a particular record.

### Steps

1. The patient connects their wallet.
2. The patient selects a medical record.
3. The patient identifies the provider wallet address.
4. The patient specifies the consent duration, where supported.
5. The application submits the consent transaction.
6. The Solana program records the consent information.
7. The application displays the resulting consent status.

### Expected Outcome

An on-chain consent entry records the patient, provider, record, and consent validity information.

### Current Prototype Status

Granting consent is implemented.

### Limitations

Recording consent on-chain does not, by itself, enforce access restrictions on medical data stored outside the program. A production system would require additional authorization and data-access controls.

---

## 7. Patient Flow: Revoke Consent

**Goal:** Mark an existing consent as inactive.

### Steps

1. The patient opens the relevant consent entry.
2. The patient initiates revocation.
3. The application submits the revocation transaction.
4. The program updates the consent status.
5. The application displays the updated status.

### Expected Outcome

The consent entry is marked inactive on-chain.

### Current Prototype Status

Consent revocation is implemented.

### Limitations

Revoking an on-chain consent entry does not automatically delete information that a provider may have previously downloaded or copied. Enforcing revocation across external storage and provider systems requires additional architecture.

---

## 8. Provider Flow: Verify Access

**Goal:** Check whether a provider is authorized under a recorded consent entry.

### Steps

1. The provider connects a compatible Solana wallet.
2. The provider identifies the relevant patient record and consent entry.
3. The application submits an access-verification request.
4. The program checks the relevant consent details, including provider identity, active status, and expiration.
5. The application displays the verification result.

### Possible Outcomes

**Access verification succeeds**

The program's current checks indicate that the provider satisfies the consent conditions being evaluated.

**Access verification fails**

The provider does not satisfy one or more required conditions, such as provider matching, active consent, or consent validity.

### Current Prototype Status

On-chain access verification is implemented.

### Limitations

This workflow verifies consent conditions. It does not establish a complete production-grade system for authenticating healthcare organizations, delivering medical records securely, or enforcing authorization across external systems.

---

## 9. Provider Flow: Retrieve and Inspect a Medical Record

**Goal:** Allow a provider to inspect medical information when an appropriate record-delivery mechanism is available.

### Intended Steps

1. The provider connects a wallet.
2. The provider identifies the required record.
3. The system checks the provider's authorization.
4. The system retrieves the medical record from its designated storage location.
5. The system verifies the record's integrity.
6. The provider inspects the information if access is permitted.

### Current Prototype Status

The prototype supports record metadata retrieval and consent verification.

### Planned Capabilities

A complete workflow for retrieving protected medical records from secure off-chain storage, enforcing authorization, and delivering records to verified providers remains future work.

The prototype should not be described as already providing this complete workflow.

---

## 10. Consent and Activity History Flow

**Goal:** Display available activity associated with record and consent operations.

### Steps

1. The user opens the activity-history interface.
2. The application retrieves available consent-related activity.
3. The application displays the available entries.
4. Where supported, the user follows an Explorer link to inspect the corresponding blockchain transaction.

### Current Prototype Status

Consent activity history and transaction Explorer links are implemented.

### Limitations

The displayed history represents available recorded transactions. It is not a complete audit of every attempt to access, view, copy, or share medical information outside the blockchain program.

---

## 11. Error and Exception Scenarios

The interface and future workflows should account for the following scenarios.

### Wallet Not Connected

The user must connect a compatible wallet before performing an operation that requires wallet authorization.

### Transaction Failure

If a transaction fails, the application should communicate that the operation did not complete successfully.

### Record Integrity Mismatch

If the calculated hash differs from the stored hash, the application should report that the available data does not match the registered integrity reference.

### Consent Revoked

An inactive consent should not pass the program's active-consent check.

### Consent Expired

An expired consent should not pass the program's validity check.

### Wrong Provider

A provider wallet that does not match the designated provider should fail the relevant access-verification check.

### RPC or Network Failure

If the application cannot retrieve data or communicate with Solana, it should distinguish a technical failure from a successful verification result.

---

## 12. Current Versus Planned Capabilities

| Workflow | Status |
|---|---|
| Connect a Solana wallet | Implemented |
| Create a medical-record entry | Implemented |
| Retrieve on-chain record information | Implemented |
| Verify record integrity using SHA-256 | Implemented |
| Demonstrate tampering detection | Implemented |
| Grant consent | Implemented |
| Revoke consent | Implemented |
| Verify consent conditions on-chain | Implemented |
| Display consent activity history | Implemented |
| Link activity to blockchain Explorer transactions | Implemented |
| Production-grade provider identity verification | Not implemented |
| Complete secure off-chain medical-record storage | Future work |
| End-to-end protected record delivery | Future work |
| Complete access enforcement across external systems | Future work |
| Comprehensive audit of off-chain access | Future work |
| Production regulatory and clinical compliance | Not established |

## 13. Product Principles

MedTrust's user flows should follow these principles:

1. **Integrity is not the same as clinical accuracy.** Hash verification checks whether data matches a registered reference; it does not establish medical correctness.
2. **Consent is not complete access control.** Recording a permission on-chain is only one component of an end-to-end authorization system.
3. **Medical data should not be exposed unnecessarily.** The architecture should avoid placing complete medical records on a public blockchain.
4. **Users should receive understandable feedback.** Successful, failed, expired, revoked, and technically incomplete operations should be distinguishable.
5. **Prototype capabilities must be described accurately.** Demonstrations should not be presented as production-ready healthcare infrastructure.

## 14. Open Questions for Future Product Decisions

The following decisions require further product and technical work:

- How should patient and provider identities be verified?
- Where will medical records be stored?
- How will records be encrypted and securely delivered?
- How will authorization be enforced when records are stored off-chain?
- How should consent expiry and revocation affect future record retrieval?
- What audit events should be captured beyond on-chain transactions?
- How should patients recover access if they lose their wallet?
- What privacy, security, clinical, and regulatory requirements must be met before a real-world deployment?

## 15. Document Status

This document describes the current prototype and its intended user journeys. It should be updated whenever implemented capabilities or product boundaries change.
