import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import type { HealthcareRecords } from "../../target/types/healthcare_records.js";

export const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const PROGRAM_ID = new PublicKey(
  "9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh"
);

export const DEFAULT_RECORD_PATH = "sample-medical-record.txt";

export function getWalletPath(customPath?: string): string {
  if (customPath) return customPath;
  if (process.env.ANCHOR_WALLET) return process.env.ANCHOR_WALLET;
  return path.join(os.homedir(), ".config", "solana", "id.json");
}

export function loadKeypair(walletPath?: string): Keypair {
  const resolvedPath = getWalletPath(walletPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Solana wallet keypair file not found at: ${resolvedPath}. Set ANCHOR_WALLET or pass path.`
    );
  }
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(resolvedPath, "utf8")));
  return Keypair.fromSecretKey(secretKey);
}

export function getIdl() {
  const idlPath = path.resolve("target/idl/healthcare_records.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(`IDL file not found at: ${idlPath}. Run 'anchor build' first.`);
  }
  return JSON.parse(fs.readFileSync(idlPath, "utf8"));
}

export function getAnchorContext(walletPath?: string) {
  const keypair = loadKeypair(walletPath);
  const wallet = new Wallet(keypair);
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const idl = getIdl();
  const program = new Program<HealthcareRecords>(idl, provider);
  return { keypair, wallet, connection, provider, program };
}

export function deriveRecordPda(
  patient: PublicKey,
  recordId: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const recordIdBuffer = Buffer.alloc(8);
  recordIdBuffer.writeBigUInt64LE(recordId);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("record"), patient.toBuffer(), recordIdBuffer],
    programId
  );
}

export function deriveConsentPda(
  patient: PublicKey,
  provider: PublicKey,
  recordId: bigint,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const recordIdBuffer = Buffer.alloc(8);
  recordIdBuffer.writeBigUInt64LE(recordId);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("consent"), patient.toBuffer(), provider.toBuffer(), recordIdBuffer],
    programId
  );
}

export function computeFileSha256(filePath: string): Buffer {
  const fileContent = fs.readFileSync(filePath);
  return createHash("sha256").update(fileContent).digest();
}

