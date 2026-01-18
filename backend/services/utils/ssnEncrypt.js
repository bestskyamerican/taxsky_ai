import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.SSN_ENCRYPT_KEY, "hex");
const IV = Buffer.from(process.env.SSN_IV, "hex");

export function encryptSSN(plaintext) {
  const cipher = crypto.createCipheriv(ALGO, KEY, IV);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return encrypted + ":" + tag;
}

export function decryptSSN(ciphertext) {
  const [data, tag] = ciphertext.split(":");
  const decipher = crypto.createDecipheriv(ALGO, KEY, IV);
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
