import { createPublicKey, randomBytes, verify as edVerify } from "node:crypto";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { getSessionCookie, setSessionCookie } from "better-auth/cookies";
import * as z from "zod";

/**
 * "Login with Onyx" — keypair-based authentication.
 *
 * Flow (all verification server-side):
 *   1. POST /onyx/challenge { publicKey }            → { challenge }
 *   2. Client signs the challenge with its Ed25519 private key.
 *   3. POST /onyx/verify { publicKey, signature }    → session cookie + token
 *
 * Public keys are raw 32-byte Ed25519 keys, base64url-encoded.
 * Signatures are 64-byte Ed25519 signatures, base64url-encoded.
 * Challenges are single-use and expire after 5 minutes.
 */

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
// DER prefix that wraps a raw 32-byte Ed25519 key into SPKI format
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const publicKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "publicKey must be a base64url raw Ed25519 key");

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function verifyOnyxSignature(
  publicKey: string,
  challenge: string,
  signature: string,
): boolean {
  const rawKey = decodeBase64Url(publicKey);
  const rawSig = decodeBase64Url(signature);
  if (rawKey.length !== 32 || rawSig.length !== 64) return false;
  try {
    const keyObject = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, rawKey]),
      format: "der",
      type: "spki",
    });
    return edVerify(null, Buffer.from(challenge, "utf8"), keyObject, rawSig);
  } catch {
    return false;
  }
}

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
          createdAt: { type: "date", required: true },
        },
      },
    },
    endpoints: {
      onyxChallenge: createAuthEndpoint(
        "/onyx/challenge",
        {
          method: "POST",
          body: z.object({ publicKey: publicKeySchema }),
        },
        async (ctx) => {
          const { publicKey } = ctx.body;
          const challenge = randomBytes(32).toString("base64url");
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: `onyx:${publicKey}`,
            value: challenge,
            expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
          });
          return ctx.json({ challenge });
        },
      ),
      onyxVerify: createAuthEndpoint(
        "/onyx/verify",
        {
          method: "POST",
          body: z.object({
            publicKey: publicKeySchema,
            signature: z.string().min(1),
            name: z.string().max(120).optional(),
          }),
          requireRequest: true,
        },
        async (ctx) => {
          const { publicKey, signature, name } = ctx.body;

          const verification =
            await ctx.context.internalAdapter.findVerificationValue(
              `onyx:${publicKey}`,
            );
          if (!verification || new Date() > verification.expiresAt) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid or expired challenge",
            });
          }
          // single-use: burn the challenge before verifying
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(
            `onyx:${publicKey}`,
          );

          if (!verifyOnyxSignature(publicKey, verification.value, signature)) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid Onyx signature",
            });
          }

          const existingKey = await ctx.context.adapter.findOne<{
            id: string;
            userId: string;
            publicKey: string;
          }>({
            model: "onyxKey",
            where: [{ field: "publicKey", operator: "eq", value: publicKey }],
          });

          let user = existingKey
            ? await ctx.context.adapter.findOne<{
                id: string;
                email: string;
                name: string;
                emailVerified: boolean;
                createdAt: Date;
                updatedAt: Date;
              }>({
                model: "user",
                where: [{ field: "id", operator: "eq", value: existingKey.userId }],
              })
            : null;

          if (!user) {
            const fingerprint = publicKey.slice(0, 12).toLowerCase();
            user = await ctx.context.internalAdapter.createUser({
              name: name ?? `onyx:${fingerprint}`,
              email: `${fingerprint}@keys.onyx`,
              emailVerified: false,
            });
            await ctx.context.adapter.create({
              model: "onyxKey",
              data: {
                userId: user.id,
                publicKey,
                createdAt: new Date(),
              },
            });
            await ctx.context.internalAdapter.createAccount({
              userId: user.id,
              providerId: "onyx",
              accountId: publicKey,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          );
          if (!session) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to create session",
            });
          }
          await setSessionCookie(ctx, { session, user });

          return ctx.json({
            token: session.token,
            user: { id: user.id, name: user.name, email: user.email },
          });
        },
      ),
      onyxLink: createAuthEndpoint(
        "/onyx/link",
        {
          method: "POST",
          body: z.object({ publicKey: publicKeySchema }),
          requireRequest: true,
        },
        async (ctx) => {
          const { publicKey } = ctx.body;

          const sessionToken = getSessionCookie(ctx.request as Request);
          if (!sessionToken) {
            throw new APIError("UNAUTHORIZED", { message: "Not authenticated" });
          }

          const sessionRow = await ctx.context.adapter.findOne<{
            id: string;
            userId: string;
            expiresAt: Date;
          }>({
            model: "session",
            where: [{ field: "token", operator: "eq", value: sessionToken }],
          });

          if (!sessionRow || new Date() > new Date(sessionRow.expiresAt)) {
            throw new APIError("UNAUTHORIZED", { message: "Session expired" });
          }

          const existing = await ctx.context.adapter.findOne({
            model: "onyxKey",
            where: [{ field: "publicKey", operator: "eq", value: publicKey }],
          });
          if (existing) return ctx.json({ success: true });

          await ctx.context.adapter.create({
            model: "onyxKey",
            data: { userId: sessionRow.userId, publicKey, createdAt: new Date() },
          });
          await ctx.context.internalAdapter.createAccount({
            userId: sessionRow.userId,
            providerId: "onyx",
            accountId: publicKey,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          return ctx.json({ success: true });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
