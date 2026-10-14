import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { connection, PROGRAM_ID } from "./solana";

let consentActivityRequest: Promise<ConsentActivity[]> | null = null;
let consentActivityCache: ConsentActivity[] | null = null;
let consentActivityCacheTime = 0;

const CONSENT_ACTIVITY_CACHE_TTL = 30_000;

export const CONSENT_PDA = new PublicKey(
  "3fjty8qtRUZpyjyMtTkyYAcpamMYX1KU553mgcsxN6jp",
);

export const CONSENT_SEED = Buffer.from("consent");
export const RECORD_SEED = Buffer.from("record");

const GRANT_CONSENT_DISCRIMINATOR = Buffer.from([
  174, 67, 143, 95, 73, 190, 40, 141,
]);

const REVOKE_CONSENT_DISCRIMINATOR = Buffer.from([
  36, 0, 100, 148, 132, 131, 112, 76,
]);

const VERIFY_ACCESS_DISCRIMINATOR = Buffer.from([
  198, 35, 119, 166, 140, 214, 241, 222,
]);

export interface ConsentData {
  pda: string;
  patient: string;
  provider: string;
  record: string;
  recordId: number;
  grantedAt: number;
  expiresAt: number;
  active: boolean;
}

export function invalidateConsentCache(): void {
  consentActivityCache = null;
  consentActivityCacheTime = 0;
  consentActivityRequest = null;
}

export function getConsentPda(
  patient: PublicKey,
  provider: PublicKey,
  recordId: number,
): PublicKey {
  const [consentPda] = PublicKey.findProgramAddressSync(
    [CONSENT_SEED, patient.toBuffer(), provider.toBuffer(), u64Le(recordId)],
    PROGRAM_ID,
  );

  return consentPda;
}

export function getRecordPda(patient: PublicKey, recordId: number): PublicKey {
  const [recordPda] = PublicKey.findProgramAddressSync(
    [RECORD_SEED, patient.toBuffer(), u64Le(recordId)],
    PROGRAM_ID,
  );

  return recordPda;
}

function u64Le(value: number): Buffer {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, BigInt(value), true);
  return Buffer.from(bytes);
}

function i64Le(value: number): Buffer {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setBigInt64(0, BigInt(value), true);
  return Buffer.from(bytes);
}

export async function grantConsent(
  patient: PublicKey,
  provider: PublicKey,
  recordId: number,
  expiresAt: number,
  sendTransaction: (
    transaction: Transaction,
    connection: Connection,
  ) => Promise<string>,
): Promise<string> {
  const recordPda = getRecordPda(patient, recordId);
  const consentPda = getConsentPda(patient, provider, recordId);

  const data = Buffer.concat([
    GRANT_CONSENT_DISCRIMINATOR,
    u64Le(recordId),
    i64Le(expiresAt),
  ]);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: recordPda, isSigner: false, isWritable: false },
      { pubkey: consentPda, isSigner: false, isWritable: true },
      { pubkey: patient, isSigner: true, isWritable: true },
      { pubkey: provider, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await sendTransaction(transaction, connection);
  invalidateConsentCache();
  return signature;
}

export async function revokeConsent(
  patient: PublicKey,
  provider: PublicKey,
  recordId: number,
  sendTransaction: (
    transaction: Transaction,
    connection: Connection,
  ) => Promise<string>,
): Promise<string> {
  const consentPda = getConsentPda(patient, provider, recordId);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: consentPda, isSigner: false, isWritable: true },
      { pubkey: patient, isSigner: true, isWritable: false },
    ],
    data: REVOKE_CONSENT_DISCRIMINATOR,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await sendTransaction(transaction, connection);
  invalidateConsentCache();
  return signature;
}

/**
 * Invokes the on-chain `verify_access` instruction for a provider.
 * Enforces that consent is active, unexpired, and matches provider signer.
 */
export async function verifyAccessOnChain(
  provider: PublicKey,
  consentPda: PublicKey,
  sendTransaction: (
    transaction: Transaction,
    connection: Connection,
  ) => Promise<string>,
): Promise<string> {
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: consentPda, isSigner: false, isWritable: false },
      { pubkey: provider, isSigner: true, isWritable: false },
    ],
    data: VERIFY_ACCESS_DISCRIMINATOR,
  });

  const transaction = new Transaction().add(instruction);
  return sendTransaction(transaction, connection);
}

export async function getConsent(customPda?: PublicKey): Promise<ConsentData | null> {
  const targetPda = customPda || CONSENT_PDA;
  try {
    const accountInfo = await connection.getAccountInfo(targetPda);

    if (!accountInfo) {
      return null;
    }

    const data = accountInfo.data;

    if (data.length < 129) {
      throw new Error(`Unexpected consent account size: ${data.length} bytes (expected at least 129)`);
    }

    const patient = new PublicKey(data.slice(8, 40));
    const provider = new PublicKey(data.slice(40, 72));
    const record = new PublicKey(data.slice(72, 104));

    const recordId = Number(data.readBigUInt64LE(104));
    const grantedAt = Number(data.readBigInt64LE(112));
    const expiresAt = Number(data.readBigInt64LE(120));

    const active = data[128] === 1;

    return {
      pda: targetPda.toBase58(),
      patient: patient.toBase58(),
      provider: provider.toBase58(),
      record: record.toBase58(),
      recordId,
      grantedAt,
      expiresAt,
      active,
    };
  } catch (err) {
    console.warn("Could not retrieve consent from Solana:", err);
    return null;
  }
}

/**
 * Resolves on-chain consent data dynamically for a given patient, provider, and recordId.
 */
export async function getConsentForRecord(
  patient: PublicKey | string,
  provider: PublicKey | string,
  recordId: number
): Promise<ConsentData | null> {
  try {
    const patientPk = typeof patient === "string" ? new PublicKey(patient) : patient;
    const providerPk = typeof provider === "string" ? new PublicKey(provider) : provider;
    const pda = getConsentPda(patientPk, providerPk, recordId);
    return await getConsent(pda);
  } catch (err) {
    console.warn(`Could not resolve consent PDA for record #${recordId}:`, err);
    return null;
  }
}

/**
 * Dynamically queries all consent accounts created on Solana by a specific patient.
 */
export async function discoverPatientConsentsOnChain(
  patient: PublicKey | string
): Promise<ConsentData[]> {
  try {
    const patientPk = typeof patient === "string" ? new PublicKey(patient) : patient;
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 129 },
        { memcmp: { offset: 8, bytes: patientPk.toBase58() } },
      ],
    });

    return accounts.map(({ pubkey, account }) => {
      const data = account.data;
      const pat = new PublicKey(data.slice(8, 40));
      const prov = new PublicKey(data.slice(40, 72));
      const rec = new PublicKey(data.slice(72, 104));
      const recordId = Number(data.readBigUInt64LE(104));
      const grantedAt = Number(data.readBigInt64LE(112));
      const expiresAt = Number(data.readBigInt64LE(120));
      const active = data[128] === 1;

      return {
        pda: pubkey.toBase58(),
        patient: pat.toBase58(),
        provider: prov.toBase58(),
        record: rec.toBase58(),
        recordId,
        grantedAt,
        expiresAt,
        active,
      };
    });
  } catch (err) {
    console.warn("Could not query program accounts for patient consents:", err);
    return [];
  }
}

/**
 * Dynamically queries all consent accounts on Solana where a specific provider is authorized.
 */
export async function discoverProviderConsentsOnChain(
  provider: PublicKey | string
): Promise<ConsentData[]> {
  try {
    const providerPk = typeof provider === "string" ? new PublicKey(provider) : provider;
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 129 },
        { memcmp: { offset: 40, bytes: providerPk.toBase58() } },
      ],
    });

    return accounts.map(({ pubkey, account }) => {
      const data = account.data;
      const pat = new PublicKey(data.slice(8, 40));
      const prov = new PublicKey(data.slice(40, 72));
      const rec = new PublicKey(data.slice(72, 104));
      const recordId = Number(data.readBigUInt64LE(104));
      const grantedAt = Number(data.readBigInt64LE(112));
      const expiresAt = Number(data.readBigInt64LE(120));
      const active = data[128] === 1;

      return {
        pda: pubkey.toBase58(),
        patient: pat.toBase58(),
        provider: prov.toBase58(),
        record: rec.toBase58(),
        recordId,
        grantedAt,
        expiresAt,
        active,
      };
    });
  } catch (err) {
    console.warn("Could not query program accounts for provider consents:", err);
    return [];
  }
}

export interface ConsentActivity {
  title: string;
  description: string;
  timestamp: number;
  status: "Granted" | "Revoked";
  signature: string;
}

export function getConsentActivity(targetAddress: PublicKey = CONSENT_PDA): Promise<ConsentActivity[]> {
  if (
    consentActivityCache !== null &&
    Date.now() - consentActivityCacheTime < CONSENT_ACTIVITY_CACHE_TTL
  ) {
    return Promise.resolve(consentActivityCache);
  }

  if (consentActivityRequest) {
    return consentActivityRequest;
  }

  consentActivityRequest = loadConsentActivity(targetAddress)
    .then((activities) => {
      consentActivityCache = activities;
      consentActivityCacheTime = Date.now();
      return activities;
    })
    .finally(() => {
      consentActivityRequest = null;
    });

  return consentActivityRequest;
}

async function loadConsentActivity(targetAddress: PublicKey): Promise<ConsentActivity[]> {
  let signatures;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      signatures = await connection.getSignaturesForAddress(targetAddress, {
        limit: 10,
      });
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("429") || attempt === 2) {
        console.warn("Could not retrieve signatures:", message);
        return [];
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  if (!signatures || signatures.length === 0) {
    return [];
  }

  const activities: ConsentActivity[] = [];

  for (const item of signatures) {
    let transaction = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        transaction = await connection.getParsedTransaction(item.signature, {
          maxSupportedTransactionVersion: 0,
        });
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("429") || attempt === 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    if (!transaction) {
      continue;
    }

    const logs = transaction.meta?.logMessages ?? [];
    const isGrant = logs.some((log) => log.includes("Instruction: GrantConsent"));
    const isRevoke = logs.some((log) => log.includes("Instruction: RevokeConsent"));

    if (!isGrant && !isRevoke) {
      continue;
    }

    activities.push({
      title: isGrant ? "Access permission granted" : "Access permission revoked",
      description: "MedTrust Demo Clinic",
      timestamp: transaction.blockTime ?? Math.floor(Date.now() / 1000),
      status: isGrant ? "Granted" : "Revoked",
      signature: item.signature,
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return activities;
}
