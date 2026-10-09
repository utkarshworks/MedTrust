# MedTrust

**Patient-centric medical record integrity and consent management using Solana.**

MedTrust is a prototype exploring how blockchain can help verify medical record integrity, manage patient consent, and provide a traceable history of authorization changes.

The project uses cryptographic hashing to verify medical records and Solana transactions to record consent grants and revocations.

> **Project status:** Prototype running on Solana Devnet. Not intended for production healthcare use.

## 1. Problem Statement

Medical records are often distributed across hospitals, clinics, diagnostic laboratories, and separate electronic health record systems.

This fragmentation can make it difficult for patients and healthcare providers to access a consistent medical history, share information efficiently, and verify whether medical documents have been altered.

Three challenges motivate MedTrust:

- **Fragmented records:** Medical information is spread across different healthcare systems.
- **Limited consent transparency:** Patients need clearer visibility into how information-sharing permissions are granted and revoked.
- **Record integrity:** Recipients need a way to verify that a medical document matches a previously established reference.

Digitizing medical records alone does not solve interoperability, consent management, or integrity verification across organizations.

## 2. Proposed Solution

MedTrust explores a blockchain-based trust layer for medical records.

It combines three capabilities:

1. **Integrity verification:** Uses SHA-256 hashing to compare a medical document against a stored reference.
2. **Consent management:** Demonstrates granting and revoking access permissions through Solana transactions.
3. **Activity history:** Displays recorded consent transactions for traceability.

The design keeps medical documents separate from the blockchain. The blockchain stores verification references and transaction records rather than complete medical records.

## 3. How It Works

### Medical Record Verification

1. A digital medical document is available to the application.
2. MedTrust calculates its SHA-256 hash.
3. The calculated hash is compared with the stored reference.
4. A matching hash indicates that the document matches the stored reference. A mismatch indicates that its contents differ.

A matching hash does not independently prove that a medical record is clinically accurate or establish who authored it.

### Patient Consent

1. The patient connects a compatible Solana wallet.
2. The patient initiates a consent grant for a designated provider.
3. The grant is recorded through a blockchain transaction.
4. The patient can initiate revocation.
5. The application displays the recorded consent activity.

Recording a revocation does not erase copies of medical information previously obtained by a provider. Effective enforcement requires connected systems to check current permissions.

### Activity History

MedTrust retrieves relevant blockchain transactions and displays consent grant and revoke events.

This history represents recorded consent transactions, not a complete audit of every time a medical document is accessed.

## 4. Current Features

- Solana wallet connection.
- Medical record reference retrieval.
- SHA-256 integrity verification.
- Demonstration of tampering detection.
- Consent grant and revocation workflows.
- Consent activity history with transaction references.
- Dashboard and medical-record interface.

## 5. Technology Stack

**Blockchain**

- Solana
- Anchor framework
- Rust

**Frontend**

- Next.js
- React
- TypeScript
- Tailwind CSS

**Wallet and cryptography**

- Solana Wallet Adapter
- Solana Web3.js
- SHA-256 hashing

## 6. Repository Structure

<img width="1536" height="1024" alt="MedTrust Root Structure Diagram" src="https://github.com/user-attachments/assets/1f2ad199-f334-49ab-a8ca-82d52977b1f1" />

## 7. Prerequisites

Install and configure:

Node.js and npm
Rust and Cargo
Solana CLI
Anchor CLI
A compatible Solana wallet, such as Phantom

## 8. Run the Frontend

From the repository root:

```
cd web
npm install
npm run dev

```

Open http://localhost:3000 in your browser.

The application is configured to connect to Solana Devnet. A compatible wallet configured for Devnet is needed to exercise wallet-dependent workflows.

## 9. Build and Test the Program

From the repository root:

```anchor build```

Run the program tests using the configured Anchor test environment:

```anchor test```

These commands require the appropriate Solana and Anchor tooling.

## 10. Limitations

MedTrust is an experimental prototype. It does not currently provide:

Integration with hospital or laboratory EHR systems.
A unified medical history across healthcare providers.
Production-grade identity verification.
Comprehensive access enforcement across external systems.
A complete audit trail of off-chain record access.
Deletion of information already copied by a recipient.
Established compliance with healthcare privacy or security regulations.

Do not use real patient data, private medical documents, wallet secrets, or production credentials in this prototype.

## 11. Future Direction

Potential areas for future development include:

Integration with existing electronic health record systems.
More granular and time-limited consent permissions.
Stronger patient and provider identity verification.
Secure off-chain record storage and retrieval.
Auditing actual access events.
Healthcare interoperability standards.
Privacy-preserving research and analytics workflows.

These are future possibilities, not capabilities currently delivered by the prototype.

## 12. Project Goal

MedTrust aims to explore how blockchain-based record-integrity verification and transparent consent records can contribute to more trustworthy, patient-centric healthcare information sharing.
