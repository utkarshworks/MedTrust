import { PublicKey } from "@solana/web3.js";
import { deriveRecordPda, PROGRAM_ID } from "./common.js";

const PATIENT = new PublicKey(
  "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m"
);

const RECORD_ID = 1n;

const [recordPda, bump] = deriveRecordPda(PATIENT, RECORD_ID, PROGRAM_ID);

console.log("Program ID:", PROGRAM_ID.toBase58());
console.log("Patient:", PATIENT.toBase58());
console.log("Record ID:", RECORD_ID.toString());
console.log("Record PDA:", recordPda.toBase58());
console.log("Bump:", bump);
