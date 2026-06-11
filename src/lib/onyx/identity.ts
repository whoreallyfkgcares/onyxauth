"use client";

// The Onyx Pass device token is the only credential stored in the browser.
// The actual Ed25519 keypair lives server-side, encrypted with PASS_ENCRYPTION_KEY.
// This token rotates on every successful auth — stealing it grants at most one use.

const STORAGE_KEY = "onyx.pass.v2";

export function getDeviceToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function saveDeviceToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearDeviceToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasPass(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}
