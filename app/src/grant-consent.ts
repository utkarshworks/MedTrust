import { BN } from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import {
  deriveConsentPda,
  deriveRecordPda,
  getAnchorContext,
} from "./common.js";

const RECORD_ID = 1n;
const EXPIRES_IN_SECONDS = 60 * 60; // 1 hour

async function main() {
  const { keypair, program } = getAnchorContext();

  const patient = keypair.publicKey;
  const providerPublicKey = keypair.publicKey; // For demo/testing, provider defaults to same wallet

  const [recordPda] = deriveRecordPda(patient, RECORD_ID);
  const [consentPda] = deriveConsentPda(patient, providerPublicKey, RECORD_ID);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + EXPIRES_IN_SECONDS;

  console.log("Patient:", patient.toBase58());
  console.log("Provider:", providerPublicKey.toBase58());
  console.log("Record ID:", RECORD_ID.toString());
  console.log("Record PDA:", recordPda.toBase58());
  console.log("Consent PDA:", consentPda.toBase58());
  console.log("Expires At:", new Date(expiresAt * 1000).toISOString());

  const signature = await program.methods
    .grantConsent(new BN(RECORD_ID.toString()), new BN(expiresAt))
    .accountsStrict({
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
  console.error("Failed to grant consent:", error);
  process.exit(1);
});
