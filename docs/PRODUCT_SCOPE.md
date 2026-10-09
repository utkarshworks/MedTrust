# MedTrust — Product Scope

## 1. Purpose

This document defines the current scope, boundaries, and intended direction of MedTrust.

MedTrust is a prototype exploring blockchain-based medical record integrity verification and patient-controlled consent management.

This document distinguishes implemented capabilities from proposed future capabilities.

## 2. Product Vision

Explore how patients and authorized healthcare providers can verify medical record integrity and manage information-sharing permissions through a transparent, verifiable system.

The longer-term vision is to support trustworthy medical information exchange across healthcare providers without placing complete medical records on a public blockchain.

## 3. Target Users

### Primary User: Patient

A patient who wants to:
- Inspect a medical record.
- Verify whether a record matches its stored integrity reference.
- Grant access permissions to a designated provider.
- Revoke a previously granted permission.
- Inspect recorded consent activity.

### Secondary User: Healthcare Provider

A healthcare provider who may need to:
- Verify the integrity of a shared medical record.
- Confirm whether an applicable permission is active.
- Inspect relevant authorization evidence.

The current prototype demonstrates only a limited version of these workflows. It is not yet integrated with real healthcare providers or their record systems.

### Future Stakeholders

Potential future stakeholders include:
- Hospitals and clinics.
- Diagnostic laboratories.
- Electronic health record vendors.
- Healthcare networks.
- Authorized researchers.
- Insurers and other organizations with legitimate reasons to verify healthcare documentation.

These stakeholders are not necessarily supported users of the current prototype.

## 4. Current Product Scope

The current prototype includes the following capabilities.

### 4.1 Wallet Connection

The user can connect a compatible Solana wallet to interact with the application.

### 4.2 Medical Record Integrity

The application calculates a SHA-256 hash of a demonstration medical document and compares it with the stored record hash.

### 4.3 Tampering Demonstration

The application demonstrates a failed integrity check when the document's contents no longer match the stored reference.

### 4.4 Consent Grant

The user can initiate a blockchain transaction to grant a designated provider access permission.

### 4.5 Consent Revocation

The user can initiate a transaction to revoke a previously granted permission.

### 4.6 Consent Activity History

The application retrieves and displays relevant on-chain grant and revoke events.

### 4.7 Dashboard

The interface presents record status, integrity results, access-permission status, and consent activity.

## 5. Out of Scope for the Current Prototype

The following capabilities are not currently established as implemented features.

### 5.1 Healthcare System Integration

The prototype does not currently integrate with hospital, clinic, or laboratory electronic health record systems.

### 5.2 Unified Medical History

The prototype does not aggregate medical records from multiple healthcare providers into a single patient history.

### 5.3 Production Identity Verification

Connecting a wallet does not independently verify a person's real-world identity or establish that a wallet belongs to a particular patient or healthcare provider.

### 5.4 Production Access Enforcement

Recording a consent grant or revocation does not automatically enforce permissions in external applications or prevent recipients from retaining previously obtained copies.

### 5.5 Secure Production Record Storage

The prototype is not a complete production system for storing, encrypting, retrieving, or sharing sensitive medical records.

### 5.6 Comprehensive Access Auditing

The activity history shows relevant recorded consent transactions. It does not establish a complete history of every off-chain record access.

### 5.7 Regulatory Compliance

The prototype has not been established as compliant with healthcare privacy, security, or data-protection requirements.

### 5.8 Research and Insurance Workflows

Research data exchange, insurance verification, healthcare analytics, and related integrations are future possibilities rather than current capabilities.

## 6. Product Boundaries

MedTrust separates responsibilities between the blockchain and conventional application infrastructure.

### Blockchain Responsibilities

The blockchain is used to:
- Store medical record integrity references.
- Record consent grant and revocation transactions.
- Provide a verifiable transaction history.
- Support permission checks implemented by the program.

### Application Responsibilities

The application is responsible for:
- Connecting the user's wallet.
- Accessing the demonstration medical document.
- Calculating and comparing record hashes.
- Presenting record and consent status.
- Retrieving and displaying relevant transactions.

### Future Infrastructure Responsibilities

A production-oriented implementation would also require appropriate solutions for:
- Secure off-chain record storage.
- Patient and provider identity verification.
- Authentication and authorization enforcement.
- Healthcare interoperability.
- Privacy, security, and regulatory obligations.

## 7. Product Principles

### Principle 1: Keep Medical Documents Off-Chain

Complete medical documents should not be stored on a public blockchain.

### Principle 2: Verify, Do Not Assume

A record should be treated as matching its reference only when the integrity check succeeds.

### Principle 3: Make Consent Changes Traceable

Grant and revoke actions should have identifiable transaction references.

### Principle 4: Distinguish Permission Records From Actual Access

An on-chain permission change is not proof that an external system enforced the change correctly.

### Principle 5: Separate Demonstrations From Production Capabilities

The interface and documentation must clearly distinguish simulated workflows from real integrations and verified security controls.

## 8. Potential Future Scope

Future development may explore:

1. Secure off-chain medical document storage and retrieval.
2. Stronger patient and provider identity verification.
3. More granular, time-limited consent permissions.
4. Integration with healthcare record systems.
5. Enforcement of permissions by connected applications.
6. Auditing actual record-access events.
7. Healthcare data interoperability.
8. Privacy-preserving research and analytics workflows.

These capabilities require additional product, technical, privacy, and security decisions before implementation.

## 9. Scope Decision Rule

Before adding a feature, evaluate whether it:

1. Addresses record integrity, consent management, or trustworthy healthcare information exchange.
2. Fits the product's patient-centric direction.
3. Can be implemented without exposing sensitive medical information.
4. Has clearly defined behavior and acceptance criteria.
5. Can be tested independently.
6. Avoids claiming capabilities that the implementation does not provide.

## 10. Current Status

MedTrust is an experimental prototype demonstrating medical record integrity verification, consent grant and revocation, and consent transaction history on Solana Devnet.

Its immediate goal is to validate these core mechanisms before expanding into interoperability, secure storage, identity verification, and broader healthcare workflows.
