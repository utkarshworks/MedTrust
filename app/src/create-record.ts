import { BN } from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import {
  computeFileSha256,
  DEFAULT_RECORD_PATH,
  deriveRecordPda,
  getAnchorContext,
} from "./common.js";

const RECORD_ID = 1n;

async function main() {
  const { keypair, program } = getAnchorContext();
  const filePath = process.argv[2] || DEFAULT_RECORD_PATH;
  const hash = computeFileSha256(filePath);

  const [recordPda] = deriveRecordPda(keypair.publicKey, RECORD_ID);
  const providerPublicKey = keypair.publicKey;

  console.log("Patient:", keypair.publicKey.toBase58());
  console.log("Provider:", providerPublicKey.toBase58());
  console.log("Record ID:", RECORD_ID.toString());
  console.log("Record PDA:", recordPda.toBase58());
  console.log("SHA-256:", hash.toString("hex"));

  const signature = await program.methods
    .createRecord(new BN(RECORD_ID.toString()), Array.from(hash))
    .accountsStrict({
      record: recordPda,
      patient: keypair.publicKey,
      provider: providerPublicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Transaction signature:", signature);
}

main().catch((error) => {
  console.error("Failed to create record:", error);
  process.exit(1);
});
