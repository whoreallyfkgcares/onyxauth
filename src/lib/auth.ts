import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { onyx } from "./onyx/plugin";

const hasGoogle =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
const hasGithub =
  !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;

const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  advanced: {
    crossSubDomainCookies: {
      enabled: !!process.env.COOKIE_DOMAIN,
      domain: process.env.COOKIE_DOMAIN,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(hasGoogle && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    }),
    ...(hasGithub && {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    }),
  },
  plugins: [onyx(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
