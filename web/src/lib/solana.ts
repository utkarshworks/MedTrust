import { Connection, PublicKey } from "@solana/web3.js";

export const SOLANA_RPC_URL = "https://api.devnet.solana.com";

export const connection = new Connection(SOLANA_RPC_URL, "confirmed");

export const PROGRAM_ID = new PublicKey(
  "9yeMT9pyBoqQ1EEfFcP4y2j97rpmJZtxMsNoVMVXt9Sh",
);
