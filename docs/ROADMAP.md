# MedTrust — Product Roadmap

## 1. Purpose

This document defines the proposed development roadmap for MedTrust, a healthcare record integrity and consent prototype built on Solana.

The roadmap organizes work into phases, starting with validating the current prototype and progressing toward a more complete, secure, and usable system.

**Important:** This is a proposed roadmap, not a statement that the listed work has been completed or scheduled. Existing functionality, planned improvements, and production requirements must remain clearly distinguished.

## 2. Product Direction

MedTrust explores how blockchain-based record integrity and patient-controlled consent can support healthcare information sharing.

The intended direction is to build a system that can:

* Register a cryptographic reference to a medical record.
* Detect whether a record matches its registered reference.
* Represent patient consent for a provider and record.
* Support consent revocation and expiry.
* Verify configured consent conditions.
* Protect medical record content outside public blockchain storage.
* Enforce authorization throughout the record retrieval process.
* Provide an understandable history of relevant activity.

Blockchain is one component of this design. It does not replace provider identity verification, secure medical data storage, clinical validation, or the operational processes required by healthcare organizations.

## 3. Current Prototype Status

The prototype currently demonstrates the following capabilities:

* Solana wallet connection.
* Medical record reference registration.
* Retrieval of registered record information.
* SHA-256 hash-based integrity verification.
* A record-tampering demonstration.
* Consent granting and revocation.
* Provider access-condition verification.
* Consent activity history with transaction references.

The prototype runs on Solana Devnet.

### Known limitations

* Provider identity and professional credentials are not comprehensively verified.
* Provider identity supplied during record creation and consent granting is not, by itself, proof of authorization.
* Complete secure off-chain record storage and retrieval are not established.
* Consent verification does not automatically enforce authorization across every possible data retrieval path.
* Blockchain metadata and transactions may expose privacy-sensitive relationships.
* Prototype tests do not establish production readiness or regulatory compliance.

These limitations inform the priority of the roadmap.

## 4. Roadmap Principles

Development should follow these principles:

1. Validate existing behavior before expanding scope.
2. Address security and authorization gaps before introducing real medical data.
3. Keep medical record content off the public blockchain.
4. Separate record integrity from clinical accuracy and authenticity.
5. Separate on-chain consent state from off-chain access enforcement.
6. Build around patient and provider workflows rather than adding features without a defined user need.
7. Define acceptance criteria before implementation.
8. Test security-sensitive behavior before describing it as complete.
9. Treat production readiness as a set of evidence-backed requirements, not a deployment milestone alone.

## 5. Phase 1 — Stabilize and Validate the Prototype

**Objective:** Establish a reliable baseline for the current demonstration.

### Proposed work

* Review the existing Solana program and frontend implementation.
* Confirm that documented functionality matches actual code.
* Run the existing automated tests.
* Verify record creation and retrieval.
* Test valid record hashes and modified-record detection.
* Test consent granting and revocation.
* Test valid, expired, revoked, and wrong-provider consent scenarios.
* Confirm transaction failure and RPC error handling.
* Review activity history and transaction links.
* Resolve known test failures and document any remaining limitations.
* Keep the README and product documentation aligned with the implementation.

### Acceptance criteria

* Core prototype workflows execute as documented.
* Expected failure scenarios are tested.
* Test results are recorded.
* Known limitations are documented.
* No existing functionality is removed without an explicit product decision.

### Deliverable

A tested and documented prototype baseline.

## 6. Phase 2 — Strengthen Smart Contract Authorization

**Objective:** Address on-chain authorization and validation gaps before introducing more sensitive workflows.

### Proposed work

* Review account ownership and account constraints.
* Review signer requirements for every instruction.
* Validate patient authority for consent changes.
* Review provider association checks.
* Validate relationships between record and consent accounts.
* Confirm expiry and revocation behavior.
* Review duplicate operations and invalid account combinations.
* Add negative tests for unauthorized or malformed requests.
* Review program upgrade authority and deployment controls.
* Obtain an independent security review appropriate to the intended use.

### Acceptance criteria

* Authorization rules are explicitly defined for each instruction.
* Negative tests cover relevant unauthorized operations.
* Account relationships are validated as intended.
* Security-sensitive assumptions are documented.
* Findings from security review are tracked and resolved or explicitly accepted with documented justification.

### Deliverable

A reviewed authorization model and a more thoroughly tested Solana program.

**Dependency:** Phase 1 should establish a reliable testing baseline before major changes to authorization logic.

## 7. Phase 3 — Define and Build Secure Off-Chain Record Storage

**Objective:** Support medical record storage and retrieval without publishing record content to the public blockchain.

### Proposed work

* Define supported record formats and identifiers.
* Choose an appropriate off-chain storage architecture.
* Define the record lifecycle, including upload, retrieval, update, retention, and deletion.
* Introduce encryption for records in transit and at rest.
* Design encryption-key generation, storage, access, rotation, and recovery.
* Define the relationship between off-chain records and on-chain hashes.
* Establish consistent hashing and serialization rules.
* Restrict direct access to storage infrastructure.
* Design backup and recovery procedures.
* Assess storage providers and infrastructure dependencies.

### Acceptance criteria

* Medical record content is not written directly to public blockchain accounts.
* Unauthorized users cannot retrieve protected records through the intended application paths.
* Integrity verification consistently uses the defined record representation.
* Key-management responsibilities are documented.
* Backup, recovery, retention, and deletion behavior are defined and tested.

### Deliverable

A documented and tested off-chain record storage design, followed by an implementation appropriate to the project's security requirements.

**Dependency:** Storage architecture and threat modeling should be agreed upon before implementing sensitive record-handling workflows.

## 8. Phase 4 — Verify Provider Identity and Enforce Consent End to End

**Objective:** Connect provider identity, consent state, and actual record retrieval.

### Proposed work

* Define how healthcare providers will be registered and verified.
* Define how provider credentials and institutional affiliations will be maintained.
* Associate verified providers with appropriate application identities.
* Require appropriate authorization before consent can be granted or used.
* Check active consent and expiry before releasing protected records.
* Enforce revocation at the data-delivery layer.
* Define how existing download links, cached data, and previously downloaded copies are handled.
* Prevent frontend-only authorization from being treated as sufficient protection.
* Design an understandable consent history for patients.
* Test unauthorized access attempts across the complete retrieval workflow.

### Acceptance criteria

* Provider identity has a defined verification process.
* Consent is associated with the intended patient, provider, and record.
* Expired and revoked consent cannot authorize new retrieval through the controlled application.
* The data-delivery layer enforces authorization independently of the frontend.
* Known limitations involving previously copied data are communicated clearly.
* End-to-end tests cover allowed and denied retrieval scenarios.

### Deliverable

A tested consent-enforcement workflow integrated with verified provider identities and off-chain record access.

**Dependency:** This phase depends on the authorization model and off-chain storage design.

## 9. Phase 5 — Privacy, Auditability, and Operational Controls

**Objective:** Improve the system's ability to protect sensitive information and explain relevant events.

### Proposed work

* Review all on-chain fields for necessity and privacy risks.
* Assess linkability between wallet addresses, record identifiers, and transaction history.
* Minimize unnecessary metadata.
* Define the scope and retention of off-chain access logs.
* Distinguish blockchain transactions from actual record access.
* Protect audit logs against unauthorized access and modification.
* Establish error monitoring and operational alerts.
* Define incident response and security reporting procedures.
* Review third-party dependencies and infrastructure access.
* Define recovery procedures for compromised credentials or keys.

### Acceptance criteria

* Sensitive on-chain data is minimized.
* The privacy implications of public transaction history are documented.
* Relevant off-chain access events are logged according to the agreed requirements.
* Audit limitations are explicit.
* Operational and incident-response procedures are documented and tested.

### Deliverable

A documented privacy and operational control model with tested audit and monitoring mechanisms.

## 10. Phase 6 — Pilot Readiness Assessment

**Objective:** Determine whether the system is sufficiently mature for a controlled evaluation with appropriate stakeholders.

### Proposed work

* Identify the intended users and pilot workflow.
* Define what data, if any, the pilot will handle.
* Complete security and privacy assessments.
* Obtain appropriate legal and regulatory advice.
* Review the responsibilities of participating healthcare providers and technology vendors.
* Establish consent, support, incident response, and data-handling procedures.
* Test the system under realistic operational conditions.
* Define pilot success metrics and failure criteria.
* Prepare user documentation and support procedures.
* Document unresolved risks and obtain appropriate stakeholder approval.

### Acceptance criteria

* Security and privacy risks have been assessed.
* Required safeguards are implemented and tested.
* Responsibilities and escalation procedures are documented.
* Pilot scope and data-handling rules are approved by the appropriate stakeholders.
* Unresolved risks are documented and explicitly addressed in the pilot decision.

### Deliverable

A pilot-readiness assessment and a documented decision on whether a limited pilot is appropriate.

**Important:** A successful prototype demonstration alone is not sufficient to authorize the use of real patient data.

## 11. Phase 7 — Production Readiness

**Objective:** Establish whether MedTrust can operate reliably and securely in its intended deployment environment.

### Proposed work

* Complete independent security testing appropriate to the risk.
* Establish production deployment and program-upgrade procedures.
* Define infrastructure monitoring and availability requirements.
* Implement backup, disaster recovery, and incident response.
* Establish access controls for operational systems.
* Review data retention and deletion processes.
* Complete applicable privacy and regulatory assessments.
* Establish support, maintenance, and vulnerability-management procedures.
* Validate system behavior under failure and recovery conditions.
* Define ownership of ongoing security and operational responsibilities.

### Acceptance criteria

Production readiness must be supported by documented evidence, including:

* Completed security assessments and tracked remediation.
* Tested authorization and data-access controls.
* Defined operational responsibilities.
* Tested recovery and incident-response procedures.
* Appropriate legal and regulatory assessments.
* Documented deployment and maintenance processes.

### Deliverable

A production-readiness decision supported by security, privacy, operational, and legal evidence.

This phase is not a commitment to launch. The decision should depend on the system's actual risk profile and intended use.

## 12. Cross-Phase Workstreams

Some activities apply throughout the roadmap.

### Documentation

* Keep product scope aligned with implementation.
* Maintain architecture and security documentation.
* Record important design decisions.
* Update user flows when behavior changes.
* Maintain a list of known limitations.

### Testing

* Maintain unit and integration tests.
* Add regression tests when defects are fixed.
* Test invalid inputs and unauthorized operations.
* Record known failures and their resolution status.

### Product validation

* Validate the problem and target users before expanding functionality.
* Test whether patient and provider workflows address real needs.
* Avoid introducing complex features without a defined use case.
* Separate technical feasibility from evidence of user demand.

### Security and privacy

* Reassess risks when new data fields or integrations are introduced.
* Review third-party dependencies.
* Minimize sensitive data collection and storage.
* Revisit authorization assumptions when architecture changes.

## 13. Prioritization Framework

Work should be prioritized using the following order of consideration:

1. **Security-critical:** Could the issue enable unauthorized access, unauthorized state changes, or exposure of sensitive data?
2. **Correctness-critical:** Could the issue cause records or consent states to be misrepresented?
3. **Reliability-critical:** Could the issue prevent core workflows from operating predictably?
4. **Privacy-critical:** Could the issue reveal sensitive information unnecessarily?
5. **User-critical:** Does the issue prevent patients or providers from completing an essential workflow?
6. **Enhancement:** Does the work improve usability or add optional capabilities without addressing a more urgent risk?

Security, correctness, and privacy issues should not be deprioritized merely because a new feature is more visible.

## 14. Scope Exclusions Until Requirements Are Established

The following should not be treated as committed features without separate requirements and assessment:

* Production deployment with real patient data.
* Claims of regulatory compliance.
* Complete electronic health record functionality.
* Automatic verification of medical professionals without a defined identity system.
* Guaranteed deletion or recall of previously downloaded medical records.
* Universal interoperability with hospital systems.
* Complete auditability of every off-chain data access.
* Production-grade encryption and key management before implementation and review.
* Guaranteed availability or performance without defined service requirements.

These capabilities may be considered later if supported by user needs, feasibility, and appropriate safeguards.

## 15. Roadmap Status Management

Each roadmap item should be assigned one of the following statuses:

* **Proposed:** Identified as a potential future requirement.
* **Planned:** Accepted for future work, with scope and acceptance criteria defined.
* **In progress:** Implementation has started.
* **Implemented:** The required functionality exists in code.
* **Tested:** Relevant acceptance tests have passed.
* **Reviewed:** Appropriate security, privacy, or product review has been completed.
* **Deferred:** Intentionally postponed.
* **Blocked:** Cannot progress until a dependency or decision is resolved.

A feature should not be marked complete solely because code exists. Completion depends on its acceptance criteria and relevant testing.

## 16. Immediate Next Priorities

Based on the current prototype's documented limitations, the recommended next areas of work are:

1. Confirm the current test baseline and document known failures.
2. Review Solana instruction authorization and account constraints.
3. Define the trusted provider identity model.
4. Specify the off-chain record storage and encryption architecture.
5. Define end-to-end consent enforcement for record retrieval.
6. Expand negative tests for unauthorized access and invalid consent.
7. Assess privacy risks from on-chain metadata.
8. Reassess pilot readiness only after the relevant controls have been implemented and tested.

These are proposed priorities, not completed work or fixed delivery dates.

---

**Document status:** Proposed roadmap for MedTrust.

**Current product status:** Prototype on Solana Devnet.

**Production status:** Not production-ready. Progression toward real-world healthcare use depends on implementation, testing, security review, privacy assessment, and appropriate legal and regulatory evaluation.
