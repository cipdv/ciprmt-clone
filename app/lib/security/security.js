import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is not set in environment variables");
}

export function encryptData(data) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv
    );
    let encrypted = cipher.update(
      typeof data === "string" ? data : JSON.stringify(data)
    );
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (error) {
    console.error("Encryption error:", error);
    return null;
  }
}

export function decryptData(encryptedData) {
  try {
    if (typeof encryptedData !== "string") {
      console.error("Invalid encrypted data type:", typeof encryptedData);
      return null;
    }

    const [ivHex, encryptedHex] = encryptedData.split(":");
    if (!ivHex || !encryptedHex) {
      console.error("Invalid encrypted data format");
      return null;
    }

    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv
    );
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const decryptedString = decrypted.toString();
    try {
      return JSON.parse(decryptedString);
    } catch (parseError) {
      return decryptedString;
    }
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

export async function logAuditEvent(event) {
  // Implement audit logging (e.g., write to a secure database or send to a logging service)
}
