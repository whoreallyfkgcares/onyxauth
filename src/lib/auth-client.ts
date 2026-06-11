"use client";

import { createAuthClient } from "better-auth/react";
import { onyxClient } from "./onyx/client";

export const authClient = createAuthClient({
  plugins: [onyxClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
