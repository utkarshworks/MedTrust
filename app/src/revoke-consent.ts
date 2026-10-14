import {
  deriveConsentPda,
  getAnchorContext,
} from "./common.js";

const RECORD_ID = 1n;

async function main() {
  const { keypair, connection, program } = getAnchorContext();

  const patient = keypair.publicKey;
  const providerPublicKey = keypair.publicKey;

  const [consentPda] = deriveConsentPda(patient, providerPublicKey, RECORD_ID);

  console.log("Patient:", patient.toBase58());
  console.log("Consent PDA:", consentPda.toBase58());

  const tx = await program.methods
    .revokeConsent()
    .accountsStrict({
      consent: consentPda,
      patient,
    })
    .signers([keypair])
    .rpc();

  console.log("\nRevoke transaction signature:", tx);

  await connection.confirmTransaction(tx, "confirmed");

  const consentAccount = await program.account.consent.fetch(consentPda);

  console.log("Active state:", consentAccount.active);

  if (consentAccount.active) {
    throw new Error("REVOCATION FAILED: consent is still active");
  }

  console.log("\nConsent revocation verification: PASS");
}

main().catch((err) => {
  console.error("Failed to revoke consent:", err);
  process.exit(1);
});
