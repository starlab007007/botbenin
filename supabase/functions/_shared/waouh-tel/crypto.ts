const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Bytes(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
}

async function encryptionKey() {
  const secret = Deno.env.get("WAOUH_TEL_PHONE_ENCRYPTION_KEY") || "";
  if (secret.length < 24) {
    throw new Error(
      "WAOUH_TEL_PHONE_ENCRYPTION_KEY must contain at least 24 characters",
    );
  }
  return crypto.subtle.importKey(
    "raw",
    await sha256Bytes(secret),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPhone(e164: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await encryptionKey(),
      encoder.encode(e164),
    ),
  );
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(cipher)}`;
}

export async function decryptPhone(ciphertext: string) {
  const [version, ivRaw, cipherRaw] = ciphertext.split(".");
  if (version !== "v1" || !ivRaw || !cipherRaw) {
    throw new Error("unsupported_phone_ciphertext");
  }
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivRaw) },
    await encryptionKey(),
    base64ToBytes(cipherRaw),
  );
  return decoder.decode(clear);
}

export async function encryptSensitiveJson(value: unknown) {
  return encryptPhone(JSON.stringify(value));
}

export async function decryptSensitiveJson<T>(ciphertext: string): Promise<T> {
  const clear = await decryptPhone(ciphertext);
  return JSON.parse(clear) as T;
}

export async function hmacHex(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
    ),
  );
}

export async function hashPhone(e164: string) {
  const secret = Deno.env.get("WAOUH_TEL_PHONE_HASH_KEY") || "";
  if (secret.length < 24) {
    throw new Error(
      "WAOUH_TEL_PHONE_HASH_KEY must contain at least 24 characters",
    );
  }
  return hmacHex(e164, secret);
}

export async function sha256Hex(value: string) {
  return bytesToHex(await sha256Bytes(value));
}

export function constantTimeEqual(left: string, right: string) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

export function randomCode(length = 8) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((value) => alphabet[value % alphabet.length]).join("");
}
