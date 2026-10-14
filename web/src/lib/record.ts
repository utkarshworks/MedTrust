import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { connection, PROGRAM_ID } from "./solana";

export const RECORD_PDA = new PublicKey(
  "PKUfarA6LyUVdXT8sdxCdQR4svGf9BU1dsi5egqRXgh",
);

export const RECORD_SEED = Buffer.from("record");

const CREATE_RECORD_DISCRIMINATOR = Buffer.from([
  116, 124, 63, 58, 126, 204, 178, 10,
]);

export interface RecordData {
  pda: string;
  patient: string;
  provider: string;
  recordId: number;
  recordHash: string;
  createdAt: number;
}

export function getRecordPda(patient: PublicKey, recordId: number = 1): PublicKey {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, BigInt(recordId), true);

  const [recordPda] = PublicKey.findProgramAddressSync(
    [RECORD_SEED, patient.toBuffer(), Buffer.from(bytes)],
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

function hexToBytes32(hex: string): Buffer {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const buf = Buffer.from(cleanHex, "hex");
  if (buf.length !== 32) {
    throw new Error(`Invalid SHA-256 length: expected 32 bytes, got ${buf.length}`);
  }
  return buf;
}

/**
 * Creates and anchors a new medical record on Solana Devnet.
 * Invokes the on-chain `create_record` instruction.
 */
export async function createRecordOnChain(
  patient: PublicKey,
  provider: PublicKey,
  recordId: number,
  recordHashHex: string,
  sendTransaction: (
    transaction: Transaction,
    connection: Connection
  ) => Promise<string>
): Promise<{ signature: string; recordPda: PublicKey }> {
  const recordPda = getRecordPda(patient, recordId);
  const hashBytes = hexToBytes32(recordHashHex);

  const data = Buffer.concat([
    CREATE_RECORD_DISCRIMINATOR,
    u64Le(recordId),
    hashBytes,
  ]);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: recordPda, isSigner: false, isWritable: true },
      { pubkey: patient, isSigner: true, isWritable: true },
      { pubkey: provider, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const transaction = new Transaction().add(instruction);
  const signature = await sendTransaction(transaction, connection);
  return { signature, recordPda };
}

/**
 * Retrieves the on-chain record data for a given PDA or default PDA.
 */
export async function getRecord(customPda?: PublicKey): Promise<RecordData | null> {
  const targetPda = customPda || RECORD_PDA;

  try {
    const accountInfo = await connection.getAccountInfo(targetPda);

    if (!accountInfo) {
      return null;
    }

    const data = accountInfo.data;

    if (data.length < 120) {
      throw new Error(`Unexpected record account size: ${data.length} bytes (expected at least 120)`);
    }

    const patient = new PublicKey(data.slice(8, 40));
    const provider = new PublicKey(data.slice(40, 72));
    const recordId = Number(data.readBigUInt64LE(72));
    const recordHash = Buffer.from(data.slice(80, 112)).toString("hex");
    const createdAt = Number(data.readBigInt64LE(112));

    return {
      pda: targetPda.toBase58(),
      patient: patient.toBase58(),
      provider: provider.toBase58(),
      recordId,
      recordHash,
      createdAt,
    };
  } catch (err) {
    console.warn("Could not fetch record from Solana:", err);
    return null;
  }
}

/**
 * Resolves on-chain record data dynamically for a given patient and recordId.
 */
export async function getRecordForDocument(
  patient: PublicKey | string,
  recordId: number
): Promise<RecordData | null> {
  try {
    const patientPk = typeof patient === "string" ? new PublicKey(patient) : patient;
    const pda = getRecordPda(patientPk, recordId);
    return await getRecord(pda);
  } catch (err) {
    console.warn(`Could not resolve record PDA for record #${recordId}:`, err);
    return null;
  }
}

/**
 * Dynamically queries all medical record accounts owned by the Anchor program for a specific patient.
 */
export async function discoverPatientRecordsOnChain(
  patient: PublicKey | string
): Promise<RecordData[]> {
  try {
    const patientPk = typeof patient === "string" ? new PublicKey(patient) : patient;
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 120 },
        { memcmp: { offset: 8, bytes: patientPk.toBase58() } },
      ],
    });

    return accounts.map(({ pubkey, account }) => {
      const data = account.data;
      const pat = new PublicKey(data.slice(8, 40));
      const prov = new PublicKey(data.slice(40, 72));
      const recordId = Number(data.readBigUInt64LE(72));
      const recordHash = Buffer.from(data.slice(80, 112)).toString("hex");
      const createdAt = Number(data.readBigInt64LE(112));

      return {
        pda: pubkey.toBase58(),
        patient: pat.toBase58(),
        provider: prov.toBase58(),
        recordId,
        recordHash,
        createdAt,
      };
    });
  } catch (err) {
    console.warn("Could not query program accounts for records:", err);
    return [];
  }
}

