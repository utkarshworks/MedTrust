import { PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey(
  "9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh"
);

const PATIENT = new PublicKey(
  "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m"
);

const RECORD_ID = 1n;

const recordIdBuffer = Buffer.alloc(8);
recordIdBuffer.writeBigUInt64LE(RECORD_ID);

const [recordPda, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("record"),
    PATIENT.toBuffer(),
    recordIdBuffer,
  ],
  PROGRAM_ID
);

console.log("Patient:", PATIENT.toBase58());
console.log("Record ID:", RECORD_ID.toString());
console.log("Record PDA:", recordPda.toBase58());
console.log("Bump:", bump);
