"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { getDeviceToken, saveDeviceToken } from "@/lib/onyx/identity";

export function OnyxSignInButton({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signInWithPass() {
    const deviceToken = getDeviceToken();
    if (!deviceToken) {
      toast.error("No Pass found on this device.");
      return;
    }
    setPending(true);
    try {
      const res = await (authClient as any).onyx.auth({ deviceToken });
      if (res.error) throw new Error(res.error.message ?? "Pass sign-in failed");
      saveDeviceToken(res.data.deviceToken);
      router.push(redirectTo ?? "/account");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pass sign-in failed");
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      className="w-full"
      disabled={pending}
      onClick={signInWithPass}
    >
      <Image src="/OnyxButton.png" alt="Onyx" width={420} height={234} className="h-4 w-auto" />
      {pending ? "Verifying…" : "Pass"}
    </Button>
  );
}
