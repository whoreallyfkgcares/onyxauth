import {
  createCipheriv,
  createDecipheriv,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
} from "node:crypto";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { getSessionCookie, setSessionCookie } from "better-auth/cookies";
import * as z from "zod";

/**
 * Onyx Pass — server-managed keypair authentication.
 *
 * The Ed25519 private key never leaves the server. It is encrypted with
 * AES-256-GCM using PASS_ENCRYPTION_KEY and stored in the onyxKey table.
 * The client stores only a rotating device token (32 random bytes, base64url).
 *
 * Flows:
 *   POST /onyx/create-pass  (requires session)
 *     → generates Ed25519 keypair, encrypts privKey, stores record
 *     → returns { deviceToken, publicKey }
 *
 *   POST /onyx/auth { deviceToken }
 *     → looks up record, decrypts privKey in memory, creates session
 *     → rotates deviceToken, returns { deviceToken }
 */

// ── Encryption ────────────────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const raw = process.env.PASS_ENCRYPTION_KEY;
  if (!raw) throw new Error("PASS_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("PASS_ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
  return key;
}

// Packed format: 12-byte IV | 16-byte GCM tag | ciphertext — all base64url
function encryptPrivKey(rawPrivKey: Buffer): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(rawPrivKey), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

function decryptPrivKey(stored: string): Buffer {
  const key = getEncryptionKey();
  const data = Buffer.from(stored, "base64url");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ── Key generation ────────────────────────────────────────────────────────────

// Ed25519 PKCS8 DER header is 16 bytes; raw private key follows (32 bytes).
// Ed25519 SPKI DER header is 12 bytes; raw public key follows (32 bytes).
function generateEd25519Keypair(): { rawPrivKey: Buffer; rawPubKey: Buffer } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privDer = privateKey.export({ format: "der", type: "pkcs8" }) as Buffer;
  const pubDer = publicKey.export({ format: "der", type: "spki" }) as Buffer;
  return {
    rawPrivKey: Buffer.from(privDer.subarray(16, 48)),
    rawPubKey: Buffer.from(pubDer.subarray(12, 44)),
  };
}

function newDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

// ── Session helper ─────────────────────────────────────────────────────────────

async function getSessionUserId(ctx: any): Promise<string | null> {
  const token = getSessionCookie(ctx.request as Request);
  if (!token) return null;
  const row = (await ctx.context.adapter.findOne({
    model: "session",
    where: [{ field: "token", operator: "eq", value: token }],
  })) as { userId: string; expiresAt: Date } | null;
  if (!row || new Date() > new Date(row.expiresAt)) return null;
  return row.userId;
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export const onyx = () => {
  return {
    id: "onyx",
    schema: {
      onyxKey: {
        fields: {
          userId: {
            type: "string",
            references: { model: "user", field: "id" },
            required: true,
            index: true,
          },
          publicKey: { type: "string", required: true, unique: true },
          encryptedPrivKey: { type: "string", required: true },
          deviceToken: { type: "string", required: true, unique: true },
          createdAt: { type: "date", required: true },
          updatedAt: { type: "date", required: true },
        },
      },
    },
    endpoints: {
      // Creates a new Pass for the currently authenticated user.
      onyxCreatePass: createAuthEndpoint(
        "/onyx/create-pass",
        { method: "POST", requireRequest: true },
        async (ctx) => {
          const userId = await getSessionUserId(ctx);
          if (!userId) throw new APIError("UNAUTHORIZED", { message: "Not authenticated" });

          // One Pass per user — remove existing if present
          const existing = await ctx.context.adapter.findOne<{ id: string }>({
            model: "onyxKey",
            where: [{ field: "userId", operator: "eq", value: userId }],
          });
          if (existing) {
            await ctx.context.adapter.delete({
              model: "onyxKey",
              where: [{ field: "userId", operator: "eq", value: userId }],
            });
            // Remove linked account record too
            await ctx.context.adapter.delete({
              model: "account",
              where: [
                { field: "userId", operator: "eq", value: userId },
                { field: "providerId", operator: "eq", value: "onyx" },
              ],
            });
          }

          const { rawPrivKey, rawPubKey } = generateEd25519Keypair();
          const publicKey = rawPubKey.toString("base64url");
          const encryptedPrivKey = encryptPrivKey(rawPrivKey);
          const deviceToken = newDeviceToken();
          const now = new Date();

          await ctx.context.adapter.create({
            model: "onyxKey",
            data: { userId, publicKey, encryptedPrivKey, deviceToken, createdAt: now, updatedAt: now },
          });
          await ctx.context.internalAdapter.createAccount({
            userId,
            providerId: "onyx",
            accountId: publicKey,
            createdAt: now,
            updatedAt: now,
          });

          return ctx.json({ deviceToken, publicKey });
        },
      ),

      // Authenticates with a device token, rotates it, and creates a session.
      onyxAuth: createAuthEndpoint(
        "/onyx/auth",
        {
          method: "POST",
          body: z.object({ deviceToken: z.string().min(1) }),
          requireRequest: true,
        },
        async (ctx) => {
          const { deviceToken } = ctx.body;

          const record = await ctx.context.adapter.findOne<{
            id: string;
            userId: string;
            publicKey: string;
            encryptedPrivKey: string;
          }>({
            model: "onyxKey",
            where: [{ field: "deviceToken", operator: "eq", value: deviceToken }],
          });

          if (!record) {
            throw new APIError("UNAUTHORIZED", { message: "Invalid Pass" });
          }

          // Decrypt private key in memory — never stored or returned
          decryptPrivKey(record.encryptedPrivKey);

          // Rotate device token immediately
          const nextToken = newDeviceToken();
          await ctx.context.adapter.update({
            model: "onyxKey",
            where: [{ field: "id", operator: "eq", value: record.id }],
            update: { deviceToken: nextToken, updatedAt: new Date() },
          });

          const user = await ctx.context.adapter.findOne<{
            id: string; email: string; name: string; emailVerified: boolean;
            createdAt: Date; updatedAt: Date;
          }>({
            model: "user",
            where: [{ field: "id", operator: "eq", value: record.userId }],
          });

          if (!user) throw new APIError("INTERNAL_SERVER_ERROR", { message: "User not found" });

          const session = await ctx.context.internalAdapter.createSession(user.id);
          if (!session) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Failed to create session" });

          await setSessionCookie(ctx, { session, user });

          return ctx.json({ deviceToken: nextToken });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
