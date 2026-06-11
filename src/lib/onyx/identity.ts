"use client";

import { getPublicKeyAsync, signAsync, utils } from "@noble/ed25519";

/**
 * Client-side Onyx identity. In production this key lives in the Onyx
 * platform's keychain; for this app a keypair is generated on first use
 * and persisted in localStorage.
 */

const STORAGE_KEY = "onyx.identity.v1";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface OnyxIdentity {
  publicKey: string; // base64url raw 32-byte Ed25519 key
}

export async function getOrCreateOnyxIdentity(): Promise<OnyxIdentity> {
  const stored = localStorage.getItem(STORAGE_KEY);
  let secretKey: Uint8Array;
  if (stored) {
    secretKey = fromBase64Url(stored);
  } else {
    secretKey = utils.randomSecretKey();
    localStorage.setItem(STORAGE_KEY, toBase64Url(secretKey));
  }
  const publicKey = await getPublicKeyAsync(secretKey);
  return { publicKey: toBase64Url(publicKey) };
}

export async function signOnyxChallenge(challenge: string): Promise<string> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error("No Onyx identity found");
  const secretKey = fromBase64Url(stored);
  const signature = await signAsync(
    new TextEncoder().encode(challenge),
    secretKey,
  );
  return toBase64Url(signature);
}

export function resetOnyxIdentity(): void {
  localStorage.removeItem(STORAGE_KEY);
}
