const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? "";

/** Only allow redirects to subdomains of our platform domain. */
export function isTrustedRedirect(url: string): boolean {
  if (!url || !COOKIE_DOMAIN) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return false;
    const domain = COOKIE_DOMAIN.replace(/^\./, "");
    return hostname === domain || hostname.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

export function safeRedirectTo(redirectTo: string | undefined, fallback = "/account"): string {
  return redirectTo && isTrustedRedirect(redirectTo) ? redirectTo : fallback;
}
