import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, clusterApiUrl } from "@solana/web3.js";
import fs from "fs";

const PROGRAM_ID = new PublicKey(
  "9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh"
);

const walletPath = "/home/Utkarsh/.config/solana/id.json";
const walletSecret = JSON.parse(fs.readFileSync(walletPath, "utf8"));
const wallet = Keypair.fromSecretKey(Uint8Array.from(walletSecret));

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(wallet),
  { commitment: "confirmed" }
);

const idl = JSON.parse(
  fs.readFileSync("target/idl/healthcare_records.json", "utf8")
);

const program = new anchor.Program(idl, provider);

const patient = wallet.publicKey;

const recordId = new anchor.BN(1);

const [consentPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("consent"),
    patient.toBuffer(),
    patient.toBuffer(),
    recordId.toArrayLike(Buffer, "le", 8),
  ],
  PROGRAM_ID
);

console.log("Patient:", patient.toBase58());
console.log("Consent PDA:", consentPda.toBase58());

async function main() {
  const tx = await program.methods
    .revokeConsent()
    .accounts({
      consent: consentPda,
      patient,
    })
    .signers([wallet])
    .rpc();

  console.log("\nRevoke transaction:", tx);

  await connection.confirmTransaction(tx, "confirmed");

  const accountInfo = await connection.getAccountInfo(consentPda);

  if (!accountInfo) {
    throw new Error("Consent account not found");
  }

  // Anchor account layout:
  // 8 bytes discriminator
  // 32 patient
  // 32 provider
  // 32 record
  // 8 record_id
  // 8 granted_at
  // 8 expires_at
  // 1 active
  const activeOffset = 8 + 32 + 32 + 32 + 8 + 8 + 8;

  const active = accountInfo.data[activeOffset] === 1;

  console.log("Active:", active);

  if (active) {
    throw new Error("REVOCATION FAILED: consent is still active");
  }

  console.log("\nConsent revocation verification: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
