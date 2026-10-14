import { Connection } from "@solana/web3.js";
import { PROGRAM_ID, RPC_URL } from "./common.js";

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  const accountInfo = await connection.getAccountInfo(PROGRAM_ID);

  if (!accountInfo) {
    throw new Error(`MedTrust program (${PROGRAM_ID.toBase58()}) was not found on Devnet.`);
  }

  console.log("MedTrust program found on Devnet.");
  console.log("Program ID:", PROGRAM_ID.toBase58());
  console.log("Program owner:", accountInfo.owner.toBase58());
  console.log("Program executable:", accountInfo.executable);
  console.log("Program data length:", accountInfo.data.length, "bytes");
}

main().catch((error) => {
  console.error("Error checking program:", error);
  process.exit(1);
});
