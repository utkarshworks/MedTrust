import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "node:fs";

const RPC_URL = "https://api.devnet.solana.com";
const WALLET_PATH = "/home/Utkarsh/.config/solana/id.json";

async function main() {
  const secretKey = Uint8Array.from(
    JSON.parse(fs.readFileSync(WALLET_PATH, "utf8"))
  );

  const wallet = Keypair.fromSecretKey(secretKey);
  const publicKey = wallet.publicKey;

  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(publicKey);

  console.log("Wallet:", publicKey.toBase58());
  console.log("Balance:", balance / 1_000_000_000, "SOL");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
