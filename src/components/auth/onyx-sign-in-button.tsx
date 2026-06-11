"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import {
  getOrCreateOnyxIdentity,
  signOnyxChallenge,
} from "@/lib/onyx/identity";

export function OnyxSignInButton({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signInWithOnyx() {
    setPending(true);
    try {
      const { publicKey } = await getOrCreateOnyxIdentity();

      const challengeRes = await authClient.onyx.challenge({ publicKey });
      if (challengeRes.error || !challengeRes.data) {
        throw new Error(challengeRes.error?.message ?? "Challenge failed");
      }

      const signature = await signOnyxChallenge(challengeRes.data.challenge);

      const verifyRes = await authClient.onyx.verify({ publicKey, signature });
      if (verifyRes.error) {
        throw new Error(verifyRes.error.message ?? "Verification failed");
      }

      router.push(redirectTo ?? "/account");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Onyx sign-in failed",
      );
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      className="w-full"
      disabled={pending}
      onClick={signInWithOnyx}
    >
      <Image src="/OnyxButton.png" alt="Onyx" width={420} height={234} className="h-4 w-auto" />
      {pending ? "Verifying…" : "Pass"}
    </Button>
  );
}
