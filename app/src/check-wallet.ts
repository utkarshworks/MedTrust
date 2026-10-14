import { Connection } from "@solana/web3.js";
import { loadKeypair, RPC_URL } from "./common.js";

async function main() {
  const keypair = loadKeypair();
  const publicKey = keypair.publicKey;

  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(publicKey);

  console.log("Wallet:", publicKey.toBase58());
  console.log("Balance:", balance / 1_000_000_000, "SOL");
}

main().catch((error) => {
  console.error("Error checking wallet:", error);
  process.exit(1);
});
