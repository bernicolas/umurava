import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
   return crypto
      .createHash("sha256")
      .update(process.env.JWT_SECRET ?? "fallback-key-change-in-production")
      .digest();
}

export function encrypt(text: string): string {
   const key = getKey();
   const iv = crypto.randomBytes(16);
   const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
   const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
   ]);
   const authTag = cipher.getAuthTag();
   return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encoded: string): string {
   const key = getKey();
   const parts = encoded.split(":");
   if (parts.length !== 3) {
      throw new Error("Invalid encrypted value format");
   }
   const [ivHex, authTagHex, encHex] = parts;
   const iv = Buffer.from(ivHex, "hex");
   const authTag = Buffer.from(authTagHex, "hex");
   const encData = Buffer.from(encHex, "hex");
   const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
   decipher.setAuthTag(authTag);
   return Buffer.concat([decipher.update(encData), decipher.final()]).toString(
      "utf8",
   );
}
