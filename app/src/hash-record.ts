import { createHash } from "node:crypto";
import fs from "node:fs";

const FILE_PATH = "sample-medical-record.txt";

const file = fs.readFileSync(FILE_PATH);
const hash = createHash("sha256").update(file).digest("hex");

console.log("File:", FILE_PATH);
console.log("SHA-256:", hash);
