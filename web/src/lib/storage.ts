import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { EncryptedEnvelope } from "./crypto";

export interface MedicalDocumentRecord {
  id: string;
  recordId: number;
  parentRecordId?: number;
  parentHash?: string;
  amendmentReason?: string;
  patientPubkey: string;
  providerPubkey: string;
  title: string;
  category: "Prescription" | "Lab Report" | "Diagnostic Imaging" | "Discharge Summary" | "Clinical Note";
  date: string;
  mimeType: string;
  sizeBytes: number;
  envelope: EncryptedEnvelope;
  plaintextPreview: string; // Stored securely off-chain in vault
  pda: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  signatureTx?: string;
}

export interface HealthcareProvider {
  id: string;
  name: string;
  facilityType: "Hospital" | "Clinic" | "Laboratory" | "Specialist";
  licenseNumber: string;
  specialty: string;
  pubkey: string;
  verificationStatus: "Verified" | "Pending" | "Suspended";
  verifiedAt?: string;
  contactEmail: string;
  address: string;
}

export interface PatientProfile {
  pubkey: string;
  name: string;
  dob: string;
  bloodGroup: string;
  allergies: string[];
  emergencyContact: string;
  guardianPubkey?: string;
  recoveryHash?: string;
  createdAt: number;
}

export interface AuditLogEntry {
  id: string;
  action:
    | "DOCUMENT_CREATED"
    | "DOCUMENT_ACCESSED"
    | "ACCESS_DENIED"
    | "CONSENT_GRANTED"
    | "CONSENT_REVOKED"
    | "INTEGRITY_VERIFIED"
    | "PROVIDER_VERIFIED"
    | "PROVIDER_SUSPENDED"
    | "RECORD_AMENDED"
    | "BACKUP_EXPORTED"
    | "BACKUP_RESTORED"
    | "PROVIDER_REFERRAL"
    | "EMERGENCY_BREAK_GLASS"
    | "ACCOUNT_RECOVERY_KEY_GENERATED"
    | "ACCOUNT_RECOVERED";
  actorPubkey: string;
  actorRole: "Patient" | "Provider" | "Admin";
  targetId?: string;
  details: string;
  timestamp: number;
  success: boolean;
  txHash?: string;
}

export interface ConsentRecord {
  pda: string;
  patientPubkey: string;
  providerPubkey: string;
  recordId: number;
  recordTitle?: string;
  grantedAt: number;
  expiresAt: number;
  active: boolean;
  revokedAt?: number;
  txHash?: string;
}

interface VaultData {
  documents: MedicalDocumentRecord[];
  providers: HealthcareProvider[];
  patients: Record<string, PatientProfile>;
  auditLogs: AuditLogEntry[];
  consents?: ConsentRecord[];
}

const VAULT_FILE_PATH = path.resolve(process.cwd(), "data", "medtrust-vault.json");

// Default initial seeds
const INITIAL_PROVIDERS: HealthcareProvider[] = [
  {
    id: "prov-001",
    name: "MedTrust Demo Clinic",
    facilityType: "Clinic",
    licenseNumber: "MED-CL-2024-8891",
    specialty: "Primary Care & Family Medicine",
    pubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    verificationStatus: "Verified",
    verifiedAt: "2026-09-01T10:00:00Z",
    contactEmail: "care@medtrustclinic.org",
    address: "450 Medical Sciences Blvd, Suite 200",
  },
  {
    id: "prov-002",
    name: "Apex Central Pathology Lab",
    facilityType: "Laboratory",
    licenseNumber: "LAB-CERT-77341",
    specialty: "Clinical Chemistry & Molecular Diagnostics",
    pubkey: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
    verificationStatus: "Verified",
    verifiedAt: "2026-09-15T14:30:00Z",
    contactEmail: "lab-orders@apexpathology.com",
    address: "100 Innovation Way, Building C",
  },
  {
    id: "prov-003",
    name: "St. Jude Metropolitan Hospital",
    facilityType: "Hospital",
    licenseNumber: "HOSP-LIC-44910",
    specialty: "Emergency & Inpatient Medicine",
    pubkey: "9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh",
    verificationStatus: "Verified",
    verifiedAt: "2026-09-20T09:15:00Z",
    contactEmail: "records@stjudemetro.org",
    address: "1200 Health Park Avenue",
  },
  {
    id: "prov-004",
    name: "BioGen Imaging & Diagnostics",
    facilityType: "Specialist",
    licenseNumber: "IMG-SPEC-90212",
    specialty: "Diagnostic Radiology & MRI",
    pubkey: "4NDmQ8vXQ9y9wE7C3mQ8vXQ9y9wE7C3mQ8vXQ9y9wE7C",
    verificationStatus: "Pending",
    contactEmail: "admin@biogenimaging.com",
    address: "780 Radiation Oncology Pkwy",
  },
];

const INITIAL_DOCUMENTS: MedicalDocumentRecord[] = [
  {
    id: "doc-001",
    recordId: 1,
    patientPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    providerPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    title: "Routine Checkup & Diagnostic Lab",
    category: "Clinical Note",
    date: "October 8, 2026",
    mimeType: "text/plain",
    sizeBytes: 110,
    envelope: {
      algorithm: "AES-256-GCM",
      iv: "QUVTLTI1Ni1HQ00taXY=",
      ciphertext: "VEVTVCBFRFVDQVRJT05BTCBNRURJQ0FMIFJFQ09SRA==",
      sha256Hash: "43778b5dab9247d44ecc08a894068d76fccf43ac5a157ec1c25140504b74393e",
    },
    plaintextPreview: "TEST MEDICAL RECORD\nPatient ID: DEMO-001\nRecord Type: Routine Checkup\nDate: 2026-10-08\nStatus: Test Data Only\n",
    pda: "PKUfarA6LyUVdXT8sdxCdQR4svGf9BU1dsi5egqRXgh",
    version: 1,
    createdAt: 1728388800,
    updatedAt: 1728388800,
  },
  {
    id: "doc-002",
    recordId: 2,
    patientPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    providerPubkey: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
    title: "Complete Metabolic Panel & Lipid Profile",
    category: "Lab Report",
    date: "October 10, 2026",
    mimeType: "text/plain",
    sizeBytes: 245,
    envelope: {
      algorithm: "AES-256-GCM",
      iv: "QUVTLTI1Ni1HQ00tbGFi",
      ciphertext: "TElQSUQgUFJPRklMRTogSERMIDY1LCBMTEwgOTgsIFRSSUdMWUNFUklERVMgMTIw",
      sha256Hash: "8b7d5c3fa91461b2a7587efc85672ab1e3f890c4d23e5971a5c68b7d5c3fa914",
    },
    plaintextPreview: "LABORATORY ANALYSIS REPORT\nPatient: Alex Rivera (DEMO-001)\nProvider: Apex Central Pathology Lab\nFasting Blood Glucose: 92 mg/dL (Normal)\nTotal Cholesterol: 185 mg/dL\nHDL: 62 mg/dL | LDL: 98 mg/dL | Triglycerides: 125 mg/dL\nStatus: Normal Range",
    pda: "9H2mK8vXQ9y9wE7C3mQ8vXQ9y9wE7C3mQ8vXQ9y9wE7C",
    version: 1,
    createdAt: 1728561600,
    updatedAt: 1728561600,
  },
  {
    id: "doc-003",
    recordId: 3,
    patientPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    providerPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    title: "Amoxicillin & Antihistamine Prescription",
    category: "Prescription",
    date: "October 12, 2026",
    mimeType: "text/plain",
    sizeBytes: 190,
    envelope: {
      algorithm: "AES-256-GCM",
      iv: "QUVTLTI1Ni1HQ00tcnh4",
      ciphertext: "UFJFU0NSSVBUSU9OOiBBbW94aWNpbGxpbiA1MDBtZyBQTyBURFN4MTBk",
      sha256Hash: "3f890c4d23e5971a5c68b7d5c3fa91461b2a7587efc85672ab1e8b7d5c3fa914",
    },
    plaintextPreview: "DIGITAL PRESCRIPTION\nPatient: Alex Rivera\nRx: Amoxicillin 500mg Oral Capsule\nDirections: Take 1 capsule three times daily with food for 10 days.\nRefills: 0\nPrescriber: Dr. Sarah Chen (License MED-CL-2024-8891)",
    pda: "7X1mQ8vXQ9y9wE7C3mQ8vXQ9y9wE7C3mQ8vXQ9y9wE7C",
    version: 1,
    createdAt: 1728734400,
    updatedAt: 1728734400,
  },
];

const INITIAL_PATIENTS: Record<string, PatientProfile> = {
  "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m": {
    pubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    name: "Alex Rivera",
    dob: "1994-06-18",
    bloodGroup: "O+",
    allergies: ["Penicillin (Mild rash)", "Shellfish"],
    emergencyContact: "Elena Rivera (+1-555-019-2834)",
    createdAt: 1728000000,
  },
};

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "aud-001",
    action: "DOCUMENT_CREATED",
    actorPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    actorRole: "Patient",
    targetId: "doc-001",
    details: "Initialized Routine Checkup record on Solana Devnet with SHA-256 anchor.",
    timestamp: 1728388800,
    success: true,
    txHash: "4y8Ym1Q7...solanaTx",
  },
  {
    id: "aud-002",
    action: "CONSENT_GRANTED",
    actorPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    actorRole: "Patient",
    targetId: "prov-001",
    details: "Granted 7-day read-only verification access to MedTrust Demo Clinic for Record #1.",
    timestamp: 1728389400,
    success: true,
    txHash: "5z9Zn2R8...solanaTx",
  },
  {
    id: "aud-003",
    action: "INTEGRITY_VERIFIED",
    actorPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    actorRole: "Provider",
    targetId: "doc-001",
    details: "Provider successfully verified cryptographic hash against Solana PDA anchor.",
    timestamp: 1728475200,
    success: true,
  },
];

const INITIAL_CONSENTS: ConsentRecord[] = [
  {
    pda: "3fjty8qtRUZpyjyMtTkyYAcpamMYX1KU553mgcsxN6jp",
    patientPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    providerPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    recordId: 1,
    recordTitle: "Routine Checkup & Diagnostic Lab",
    grantedAt: 1728389400,
    expiresAt: 1728389400 + 86400 * 7,
    active: true,
  },
  {
    pda: "9tN28F8bUqyR3m9wE7C3mQ8vXQ9y9wE7C3mQ8vXQ9y9A",
    patientPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    providerPubkey: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
    recordId: 2,
    recordTitle: "Comprehensive Metabolic Panel",
    grantedAt: 1728562800,
    expiresAt: 1728562800 + 86400 * 2,
    active: true,
  },
  {
    pda: "4kLm9pQrStUvWxYz1234567890abcdefABCDEF123456",
    patientPubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    providerPubkey: "9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh",
    recordId: 3,
    recordTitle: "Emergency Room Discharge Summary",
    grantedAt: 1728216000,
    expiresAt: 1728302400,
    active: false,
    revokedAt: 1728302400,
  },
];

/**
 * Loads the current vault data from disk or inits with defaults.
 */
function loadVault(): VaultData {
  try {
    if (fs.existsSync(VAULT_FILE_PATH)) {
      const content = fs.readFileSync(VAULT_FILE_PATH, "utf-8");
      const parsed = JSON.parse(content) as VaultData;
      if (!parsed.consents || parsed.consents.length === 0) {
        parsed.consents = INITIAL_CONSENTS;
      }
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to read vault file, initializing defaults:", err);
  }

  const initialVault: VaultData = {
    documents: INITIAL_DOCUMENTS,
    providers: INITIAL_PROVIDERS,
    patients: INITIAL_PATIENTS,
    auditLogs: INITIAL_AUDIT_LOGS,
    consents: INITIAL_CONSENTS,
  };

  saveVault(initialVault);
  return initialVault;
}

/**
 * Persists the vault data to disk safely.
 */
function saveVault(data: VaultData): void {
  try {
    const dir = path.dirname(VAULT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(VAULT_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write vault data:", err);
  }
}

// ================= Document Operations =================

export function listDocuments(requesterPubkey?: string): MedicalDocumentRecord[] {
  const vault = loadVault();
  if (!requesterPubkey) {
    return vault.documents;
  }
  return vault.documents.filter(
    (doc) => doc.patientPubkey === requesterPubkey || doc.providerPubkey === requesterPubkey
  );
}

export function getDocumentById(id: string): MedicalDocumentRecord | null {
  const vault = loadVault();
  return vault.documents.find((d) => d.id === id || String(d.recordId) === id) || null;
}

export function saveDocument(document: MedicalDocumentRecord): MedicalDocumentRecord {
  const vault = loadVault();
  const existingIdx = vault.documents.findIndex((d) => d.id === document.id);
  if (existingIdx >= 0) {
    vault.documents[existingIdx] = document;
  } else {
    vault.documents.unshift(document);
  }
  saveVault(vault);
  return document;
}

// ================= Provider Operations =================

export function listProviders(): HealthcareProvider[] {
  const vault = loadVault();
  return vault.providers;
}

export function getProviderByPubkey(pubkey: string): HealthcareProvider | null {
  const vault = loadVault();
  return vault.providers.find((p) => p.pubkey === pubkey) || null;
}

export function registerProvider(provider: HealthcareProvider): HealthcareProvider {
  const vault = loadVault();
  vault.providers.push(provider);
  saveVault(vault);
  return provider;
}

export function updateProviderStatus(
  pubkeyOrId: string,
  status: "Verified" | "Pending" | "Suspended"
): HealthcareProvider | null {
  const vault = loadVault();
  const provider = vault.providers.find(
    (p) => p.id === pubkeyOrId || p.pubkey === pubkeyOrId
  );
  if (provider) {
    provider.verificationStatus = status;
    if (status === "Verified") {
      provider.verifiedAt = new Date().toISOString();
    }
    saveVault(vault);
    return provider;
  }
  return null;
}

// ================= Patient Operations =================

export function getPatientProfile(pubkey: string): PatientProfile | null {
  const vault = loadVault();
  return vault.patients[pubkey] || null;
}

export function savePatientProfile(profile: PatientProfile): PatientProfile {
  const vault = loadVault();
  vault.patients[profile.pubkey] = profile;
  saveVault(vault);
  return profile;
}

// ================= Audit Operations =================

export function listAuditLogs(limit = 50): AuditLogEntry[] {
  const vault = loadVault();
  return vault.auditLogs.slice(0, limit);
}

export function recordAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
  const vault = loadVault();
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Math.floor(Date.now() / 1000),
  };
  vault.auditLogs.unshift(newEntry);
  saveVault(vault);
  return newEntry;
}

// ================= Version Lineage & Backup Operations =================

/**
 * Traverses and resolves the entire version lineage for a given record.
 */
export function getRecordLineage(recordId: number): MedicalDocumentRecord[] {
  const vault = loadVault();
  const lineage: MedicalDocumentRecord[] = [];
  
  // Find current record
  const current = vault.documents.find((d) => d.recordId === recordId);
  if (!current) return lineage;
  lineage.push(current);

  // Traverse parents backward
  let parentId = current.parentRecordId;
  while (parentId) {
    const parent = vault.documents.find((d) => d.recordId === parentId);
    if (!parent || lineage.some((l) => l.recordId === parent.recordId)) break;
    lineage.unshift(parent);
    parentId = parent.parentRecordId;
  }

  // Traverse children forward
  let checkIds = [recordId];
  while (checkIds.length > 0) {
    const nextCheck: number[] = [];
    for (const pId of checkIds) {
      const children = vault.documents.filter((d) => d.parentRecordId === pId);
      for (const child of children) {
        if (!lineage.some((l) => l.recordId === child.recordId)) {
          lineage.push(child);
          nextCheck.push(child.recordId);
        }
      }
    }
    checkIds = nextCheck;
  }

  return lineage.sort((a, b) => a.version - b.version);
}

export function exportVaultSnapshot(): VaultData {
  return loadVault();
}

export function restoreVaultSnapshot(snapshot: VaultData): { success: boolean; count: number } {
  if (
    !snapshot ||
    !Array.isArray(snapshot.documents) ||
    !Array.isArray(snapshot.providers) ||
    !snapshot.patients
  ) {
    throw new Error("Invalid MedTrust backup bundle structure.");
  }

  saveVault(snapshot);
  return { success: true, count: snapshot.documents.length };
}

/**
 * Computes a deterministic SHA-256 digest of a recovery phrase.
 */
export function hashRecoveryPhrase(phrase: string): string {
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Re-binds all medical records and profiles of an old patient wallet address
 * to a new patient wallet address after identity recovery verification.
 */
export function rebindPatientVault(
  oldPubkey: string,
  newPubkey: string,
  authorizedBy: "RecoveryPhrase" | "GuardianKey",
  authorizerAddress: string
): { success: boolean; reboundCount: number } {
  const vault = loadVault();

  let reboundCount = 0;
  for (const doc of vault.documents) {
    if (doc.patientPubkey === oldPubkey) {
      doc.patientPubkey = newPubkey;
      doc.updatedAt = Math.floor(Date.now() / 1000);
      reboundCount++;
    }
  }

  // Migrate profile
  if (vault.patients[oldPubkey]) {
    vault.patients[newPubkey] = {
      ...vault.patients[oldPubkey],
      pubkey: newPubkey,
    };
    delete vault.patients[oldPubkey];
  }

  // Record audit log
  vault.auditLogs.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    action: "ACCOUNT_RECOVERED",
    actorPubkey: authorizerAddress,
    actorRole: "Patient",
    targetId: newPubkey,
    details: `Patient vault successfully re-anchored from ${oldPubkey} to ${newPubkey} via ${authorizedBy}. ${reboundCount} records transferred.`,
    timestamp: Math.floor(Date.now() / 1000),
    success: true,
  });

  saveVault(vault);
  return { success: true, reboundCount };
}

// ================= Consent Operations =================

export function listConsents(patientPubkey?: string, providerPubkey?: string): ConsentRecord[] {
  const vault = loadVault();
  let consents = vault.consents || INITIAL_CONSENTS;
  if (patientPubkey) {
    consents = consents.filter((c) => c.patientPubkey === patientPubkey);
  }
  if (providerPubkey) {
    consents = consents.filter((c) => c.providerPubkey === providerPubkey);
  }
  return consents;
}

export function saveConsent(consent: ConsentRecord): void {
  const vault = loadVault();
  const consents = vault.consents ? [...vault.consents] : [...INITIAL_CONSENTS];
  const idx = consents.findIndex(
    (c) =>
      c.pda === consent.pda ||
      (c.patientPubkey === consent.patientPubkey &&
        c.providerPubkey === consent.providerPubkey &&
        c.recordId === consent.recordId)
  );

  if (idx >= 0) {
    consents[idx] = consent;
  } else {
    consents.unshift(consent);
  }

  vault.consents = consents;
  saveVault(vault);
}

export function revokeConsentRecord(pdaOrKey: string): boolean {
  const vault = loadVault();
  const consents = vault.consents ? [...vault.consents] : [...INITIAL_CONSENTS];
  const target = consents.find(
    (c) =>
      c.pda === pdaOrKey ||
      `${c.providerPubkey}-${c.recordId}` === pdaOrKey ||
      c.recordId.toString() === pdaOrKey
  );

  if (target) {
    target.active = false;
    target.revokedAt = Math.floor(Date.now() / 1000);
    vault.consents = consents;
    saveVault(vault);
    return true;
  }
  return false;
}


