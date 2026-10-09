import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { connection, PROGRAM_ID } from "./solana";

let consentActivityRequest: Promise<ConsentActivity[]> | null = null;

export const CONSENT_PDA = new PublicKey(
  "3fjty8qtRUZpyjyMtTkyYAcpamMYX1KU553mgcsxN6jp",
);

const CONSENT_SEED = Buffer.from("consent");
const RECORD_SEED = Buffer.from("record");

const GRANT_CONSENT_DISCRIMINATOR = Buffer.from([
  174, 67, 143, 95, 73, 190, 40, 141,
]);

const REVOKE_CONSENT_DISCRIMINATOR = Buffer.from([
  36, 0, 100, 148, 132, 131, 112, 76,
]);

export interface ConsentData {
  patient: string;
  provider: string;
  record: string;
  recordId: number;
  grantedAt: number;
  expiresAt: number;
  active: boolean;
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
      {
        pubkey: recordPda,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: consentPda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: patient,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: provider,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    data,
  });

  const transaction = new Transaction().add(instruction);

  return sendTransaction(transaction, connection);
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
      {
        pubkey: consentPda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: patient,
        isSigner: true,
        isWritable: false,
      },
    ],
    data: REVOKE_CONSENT_DISCRIMINATOR,
  });

  const transaction = new Transaction().add(instruction);

  return sendTransaction(transaction, connection);
}

export async function getConsent(): Promise<ConsentData> {
  const accountInfo = await connection.getAccountInfo(CONSENT_PDA);

  if (!accountInfo) {
    throw new Error("Consent account not found on Solana Devnet");
  }

  const data = accountInfo.data;

  if (data.length !== 129) {
    throw new Error(`Unexpected consent account size: ${data.length} bytes`);
  }

  const patient = new PublicKey(data.slice(8, 40));
  const provider = new PublicKey(data.slice(40, 72));
  const record = new PublicKey(data.slice(72, 104));

  const recordId = Number(data.readBigUInt64LE(104));
  const grantedAt = Number(data.readBigInt64LE(112));
  const expiresAt = Number(data.readBigInt64LE(120));

  const active = data[128] === 1;

  return {
    patient: patient.toBase58(),
    provider: provider.toBase58(),
    record: record.toBase58(),
    recordId,
    grantedAt,
    expiresAt,
    active,
  };
}

export interface ConsentActivity {
  title: string;
  description: string;
  timestamp: number;
  status: "Granted" | "Revoked";
  signature: string;
}

export function getConsentActivity(): Promise<ConsentActivity[]> {
  if (consentActivityRequest) {
    return consentActivityRequest;
  }

  consentActivityRequest = loadConsentActivity();

  return consentActivityRequest.finally(() => {
    consentActivityRequest = null;
  });
}

async function loadConsentActivity(): Promise<ConsentActivity[]> {
  let signatures;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      signatures = await connection.getSignaturesForAddress(CONSENT_PDA, {
        limit: 10,
      });
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (!message.includes("429") || attempt === 3) {
        throw error;
      }

      const delay = 1500 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (!signatures) {
    return [];
  }

  const activities: ConsentActivity[] = [];

  for (const item of signatures) {
    let transaction = null;

    // Retry rate-limited requests up to 3 times.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        transaction = await connection.getParsedTransaction(item.signature, {
          maxSupportedTransactionVersion: 0,
        });
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (!message.includes("429") || attempt === 2) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }

    if (!transaction) {
      continue;
    }

    const logs = transaction.meta?.logMessages ?? [];

    const isGrant = logs.some((log) =>
      log.includes("Instruction: GrantConsent"),
    );

    const isRevoke = logs.some((log) =>
      log.includes("Instruction: RevokeConsent"),
    );

    if (!isGrant && !isRevoke) {
      continue;
    }

    activities.push({
      title: isGrant
        ? "Access permission granted"
        : "Access permission revoked",
      description: "MedTrust Demo Clinic",
      timestamp: transaction.blockTime ?? 0,
      status: isGrant ? "Granted" : "Revoked",
      signature: item.signature,
    });

    // Space out consecutive RPC requests.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return activities;
}