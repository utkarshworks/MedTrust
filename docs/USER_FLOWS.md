# MedTrust — User Flows

## 1. Overview

This document provides step-by-step user journey specifications for all three MedTrust personas: **Patient**, **Healthcare Provider**, and **Platform Administrator**.

---

## 2. Patient User Flows

### Flow 1: Wallet Connection & Profile Setup
1. **Connect Wallet**: Patient navigates to MedTrust, clicks **Connect Wallet**, and approves connection via Phantom, Solflare, or standard Solana wallet.
2. **Access Profile**: Patient clicks on their initials in the header to open the **Patient Demographic Profile**.
3. **Save Demographics**: Patient configures full name, date of birth, blood group (e.g. `O-Negative`), known drug allergies (e.g. `Penicillin`, `Sulfa`), and primary emergency contact.
4. **Outcome**: Profile is securely stored; critical medical information is instantly visible to authorized clinicians during emergencies.

### Flow 2: Medical Record Creation & Solana Anchoring
1. **Open Modal**: Patient clicks **Upload / Anchor Record** in the Overview or Medical Records tab.
2. **Input Details**: Patient enters document title (e.g., `Cardiology Echo Doppler Report`), category (e.g., `Cardiology`), and uploads or types clinical findings.
3. **Client-Side Encryption**: Client generates a 16-byte PBKDF2 salt, 12-byte IV, encrypts the document with AES-256-GCM, and computes the 32-byte SHA-256 digest.
4. **Anchor Transaction**: Application prompts the wallet to sign the Solana `create_record` instruction.
5. **Outcome**: Record PDA `[b"record", patient, record_id]` is committed on Solana Devnet; encrypted ciphertext is saved to the MedTrust Vault.

### Flow 3: Record Integrity Inspection & Tampering Demonstration
1. **Inspect Proof**: Patient clicks **Inspect Proof** on any record in the Medical Records Vault.
2. **Cryptographic Validation**: The inspector fetches the Solana PDA state, recalculates the decrypted plaintext hash, and performs a byte-for-byte comparison.
3. **Verified Badge**: The modal displays the matching 64-hex-character digest and green **Solana Anchor Verified** badge.
4. **Simulate Tampering**: Demonstrator enables **Test Tamper Simulation**. A single byte in the decrypted content is altered.
5. **Immediate Mismatch**: The badge flips to red **Tamper Mismatch** with an alert detailing the cryptographic divergence.

### Flow 4: Record Amendment & Version History
1. **Initiate Amendment**: In the Medical Records tab, patient clicks **Amend** on an existing record (e.g., record `#1001`, `v1`).
2. **Enter Updated Findings**: Patient enters updated medical information (e.g., corrected dosage or revised lab measurements).
3. **Anchor Child Version**: The system anchors `v2` on Solana, explicitly referencing `parentRecordId = 1001` and `parentRecordHash`.
4. **Outcome**: Historical lineage is preserved; the UI displays the `Amend of #1001` pill and provides a version lineage audit tree.

### Flow 5: Granting Time-Bounded Provider Consent
1. **Open Access Modal**: In the Access Control tab, patient clicks **Grant Provider Access**.
2. **Select Parameters**: Patient selects destination clinic from registered providers, target record ID, and duration (1 Hour, 24 Hours, 7 Days, or 30 Days).
3. **Sign Transaction**: Wallet prompts patient to sign the `grant_consent` instruction on Solana.
4. **Multi-Consent Registry**: Permission appears in the live Access Control dashboard with an active countdown (`23h 59m remaining`).

### Flow 6: Instant Consent Revocation
1. **Revoke Permission**: Patient clicks **Revoke Access** on any active permission card.
2. **Execute on Solana**: Wallet submits the `revoke_consent` instruction to Devnet, flipping `active = false`.
3. **Physical Access Cutoff**: The status updates to **Revoked by Patient**; any subsequent attempt by that provider to fetch the document from `/api/documents/` returns `HTTP 403 Forbidden`.

### Flow 7: Account Recovery Phrase & Social Guardian
1. **Generate Recovery Phrase**: Patient views their 12-word mnemonic phrase in the Profile modal.
2. **Social Guardian Setup**: Patient designates a trusted family member or physician's public key as an authorized social guardian.
3. **Wallet Recovery**: If primary wallet is lost, patient enters the 12-word phrase or guardian signature to re-anchor all existing vault records to a new Solana wallet address.

---

## 3. Healthcare Provider User Flows

### Flow 8: Provider Registration & Onboarding
1. **Switch Persona**: Provider selects the **Clinic** persona in the role selector.
2. **Register Facility**: Clicks **Register New Provider**; enters facility name, medical board license #, specialty, and facility type (Hospital, Clinic, Lab).
3. **Submit Application**: Submits registration; status begins in **Pending Approval** until audited by the Platform Administrator.

### Flow 9: Authorized Document Retrieval & `verify_access`
1. **Browse Patient Directory**: Provider views the Patient Medical Records Directory. Records with active consent display **Patient Consent Active**.
2. **Request Access**: Provider clicks **Request Document Access**.
3. **Decryption & Preview**: The API gateway validates the on-chain `Consent` PDA and returns the decrypted clinical document into the encrypted viewer.
4. **On-Chain Proof**: Provider clicks **Execute on-chain verify_access**. Wallet signs the instruction, confirming proof of clinical review on Solana Devnet blocks.

### Flow 10: Provider-to-Provider Clinical Referral
1. **Initiate Referral**: In the decrypted viewer or records directory, provider clicks **Refer to Specialist**.
2. **Select Destination**: Selects destination specialist/laboratory and clinical priority (`Routine`, `Urgent`, `STAT`).
3. **Clinical Memo**: Enters diagnostic notes (e.g., "Requesting stress echocardiogram for patient evaluation").
4. **Dispatch**: Dispatches referral; an auditable inter-provider transfer memorandum is logged in the compliance trail.

### Flow 11: Emergency Break-Glass Protocol (HIPAA § 164.312)
1. **Trigger Break-Glass**: In an acute trauma emergency where patient is unresponsive and has no prior consent granted, clinician clicks **Break-Glass**.
2. **Clinical Justification**: Clinician enters emergency explanation (e.g. "Acute unresponsive trauma patient, checking blood type and drug allergies").
3. **Emergency Override**: The system grants decrypted access and immediately records an elevated, immutable audit event in the compliance log.

---

## 4. Platform Administrator User Flows

### Flow 12: Provider Licensing Credential Audit
1. **Open Admin Portal**: Administrator switches to the **Admin** persona.
2. **Review Credentials**: Audits pending healthcare facility registrations, verifying medical board license numbers.
3. **Approve or Suspend**: Clicks **Approve & Verify** to grant certified status, or **Suspend License** to immediately revoke clinical access privileges.

### Flow 13: System Observability & Compliance Audit
1. **Health Metrics**: Admin monitors Devnet RPC slot progression, latency, and registered document volume in real time.
2. **Compliance Log**: Filters audit trail by action type (`DOCUMENT_ACCESSED`, `ACCESS_DENIED`, `EMERGENCY_BREAK_GLASS`).

### Flow 14: Disaster Recovery Vault Restoration
1. **Trigger Restore**: Admin clicks **Restore Vault Backup**.
2. **Load Snapshot**: Uploads or pastes a previously exported JSON vault snapshot.
3. **Integrity Validation**: Verifies the snapshot's SHA-256 integrity signature and restores vault documents and providers.
