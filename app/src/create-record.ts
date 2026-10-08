import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import fs from "node:fs";
import { createHash } from "node:crypto";

const RPC_URL = "https://api.devnet.solana.com";

const PROGRAM_ID = new PublicKey(
  "9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh"
);

const WALLET_PATH = "/home/Utkarsh/.config/solana/id.json";
const RECORD_PATH = "sample-medical-record.txt";
const RECORD_ID = 1n;

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

  const record = fs.readFileSync(RECORD_PATH);
  const hash = createHash("sha256").update(record).digest();

  const recordIdBuffer = Buffer.alloc(8);
  recordIdBuffer.writeBigUInt64LE(RECORD_ID);

  const [recordPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("record"),
      keypair.publicKey.toBuffer(),
      recordIdBuffer,
    ],
    PROGRAM_ID
  );

  const providerPublicKey = keypair.publicKey;

  console.log("Patient:", keypair.publicKey.toBase58());
  console.log("Provider:", providerPublicKey.toBase58());
  console.log("Record ID:", RECORD_ID.toString());
  console.log("Record PDA:", recordPda.toBase58());
  console.log("SHA-256:", hash.toString("hex"));

  const signature = await program.methods
    .createRecord(new BN(RECORD_ID.toString()), Array.from(hash))
    .accounts({
      record: recordPda,
      patient: keypair.publicKey,
      provider: providerPublicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Transaction signature:", signature);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
