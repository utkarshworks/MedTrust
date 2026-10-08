export async function sha256(text: string): Promise<string> {
  const data = new Uint8Array(new TextEncoder().encode(text)).buffer;
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
