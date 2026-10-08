import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import fs from "node:fs";

const RPC_URL = "https://api.devnet.solana.com";

const PROGRAM_ID = new PublicKey(
  "9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh"
);

const WALLET_PATH = "/home/Utkarsh/.config/solana/id.json";

const RECORD_ID = 1n;

// 1 hour from now
const EXPIRES_IN_SECONDS = 60 * 60;

const idl = JSON.parse(
  fs.readFileSync("target/idl/healthcare_records.json", "utf8")
);

async function main() {
  const secretKey = Uint8Array.from(
    JSON.parse(fs.readFileSync(WALLET_PATH, "utf8"))
  );

  const keypair = Keypair.fromSecretKey(secretKey);
  const wallet = new Wallet(keypair);

  const connection = new Connection(RPC_URL, "confirmed");

  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const program = new Program(idl, provider);

  const recordIdBuffer = Buffer.alloc(8);
  recordIdBuffer.writeBigUInt64LE(RECORD_ID);

  // For this prototype, patient and provider are the same wallet.
  const patient = keypair.publicKey;
  const providerPublicKey = keypair.publicKey;

  const [recordPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("record"),
      patient.toBuffer(),
      recordIdBuffer,
    ],
    PROGRAM_ID
  );

  const [consentPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("consent"),
      patient.toBuffer(),
      providerPublicKey.toBuffer(),
      recordIdBuffer,
    ],
    PROGRAM_ID
  );

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + EXPIRES_IN_SECONDS;

  console.log("Patient:", patient.toBase58());
  console.log("Provider:", providerPublicKey.toBase58());
  console.log("Record ID:", RECORD_ID.toString());
  console.log("Record PDA:", recordPda.toBase58());
  console.log("Consent PDA:", consentPda.toBase58());
  console.log("Expires At:", expiresAt);

  const signature = await program.methods
    .grantConsent(
      new BN(RECORD_ID.toString()),
      new BN(expiresAt)
    )
    .accounts({
      record: recordPda,
      consent: consentPda,
      patient,
      provider: providerPublicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Transaction signature:", signature);

  const consentAccount = await program.account.consent.fetch(consentPda);

  console.log("\nOn-chain consent:");
  console.log("Patient:", consentAccount.patient.toBase58());
  console.log("Provider:", consentAccount.provider.toBase58());
  console.log("Record:", consentAccount.record.toBase58());
  console.log("Record ID:", consentAccount.recordId.toString());
  console.log("Granted At:", consentAccount.grantedAt.toString());
  console.log("Expires At:", consentAccount.expiresAt.toString());
  console.log("Active:", consentAccount.active);

  if (
    consentAccount.patient.equals(patient) &&
    consentAccount.provider.equals(providerPublicKey) &&
    consentAccount.record.equals(recordPda) &&
    consentAccount.recordId.toString() === RECORD_ID.toString() &&
    consentAccount.active === true
  ) {
    console.log("\nConsent verification: PASS");
  } else {
    throw new Error("Consent verification failed");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
