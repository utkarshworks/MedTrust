import { PublicKey } from "@solana/web3.js";
import { connection } from "./solana";

export const RECORD_PDA = new PublicKey(
  "PKUfarA6LyUVdXT8sdxCdQR4svGf9BU1dsi5egqRXgh",
);

export interface RecordData {
  patient: string;
  provider: string;
  recordId: number;
  recordHash: string;
  createdAt: number;
}

export async function getRecord(): Promise<RecordData> {
  const accountInfo = await connection.getAccountInfo(RECORD_PDA);

  if (!accountInfo) {
    throw new Error("Record account not found on Solana Devnet");
  }

  const data = accountInfo.data;

  if (data.length !== 120) {
    throw new Error(`Unexpected record account size: ${data.length} bytes`);
  }

  const patient = new PublicKey(data.slice(8, 40));
  const provider = new PublicKey(data.slice(40, 72));

  const recordId = Number(data.readBigUInt64LE(72));

  const recordHash = Buffer.from(data.slice(80, 112)).toString("hex");

  const createdAt = Number(data.readBigInt64LE(112));

  return {
    patient: patient.toBase58(),
    provider: provider.toBase58(),
    recordId,
    recordHash,
    createdAt,
  };
}
