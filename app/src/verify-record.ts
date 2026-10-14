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

  const [recordPda] = deriveRecordPda(keypair.publicKey, RECORD_ID);

  const account = await program.account.record.fetch(recordPda);

  const localHash = computeFileSha256(filePath);
  const onChainHash = Buffer.from(account.recordHash);
  const isMatch = onChainHash.equals(localHash);

  console.log("Record PDA:", recordPda.toBase58());
  console.log("On-chain patient:", account.patient.toBase58());
  console.log("On-chain provider:", account.provider.toBase58());
  console.log("On-chain record ID:", account.recordId.toString());
  console.log("On-chain hash:", onChainHash.toString("hex"));
  console.log("Local file hash:", localHash.toString("hex"));
  console.log("Hash match:", isMatch ? "YES (Verified)" : "NO (Integrity Mismatch)");
  console.log("Created at:", new Date(Number(account.createdAt) * 1000).toISOString());

  if (!isMatch) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Failed to verify record:", error);
  process.exit(1);
});
