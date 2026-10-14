import { computeFileSha256, DEFAULT_RECORD_PATH } from "./common.js";

const filePath = process.argv[2] || DEFAULT_RECORD_PATH;

try {
  const hash = computeFileSha256(filePath).toString("hex");
  console.log("File:", filePath);
  console.log("SHA-256:", hash);
} catch (error) {
  console.error("Failed to hash file:", error);
  process.exit(1);
}
