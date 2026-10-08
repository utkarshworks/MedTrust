import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
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

  const account = await program.account.record.fetch(recordPda);

  const localRecord = fs.readFileSync(RECORD_PATH);
  const localHash = createHash("sha256").update(localRecord).digest();

  const onChainHash = Buffer.from(account.recordHash);

  console.log("Record PDA:", recordPda.toBase58());
  console.log("On-chain patient:", account.patient.toBase58());
  console.log("On-chain provider:", account.provider.toBase58());
  console.log("On-chain record ID:", account.recordId.toString());
  console.log("On-chain hash:", onChainHash.toString("hex"));
  console.log("Local file hash:", localHash.toString("hex"));
  console.log("Hash match:", onChainHash.equals(localHash));
  console.log("Created at:", account.createdAt.toString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
