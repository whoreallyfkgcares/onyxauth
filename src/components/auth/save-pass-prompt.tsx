"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { getOrCreateOnyxIdentity } from "@/lib/onyx/identity";

interface SavePassPromptProps {
  onDone: () => void;
}

export function SavePassPrompt({ onDone }: SavePassPromptProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function savePass() {
    setSaving(true);
    try {
      const identity = await getOrCreateOnyxIdentity();
      const publicKey = identity.publicKey;
      await (authClient as any).onyx.link({ publicKey });
      setSaved(true);
      setTimeout(onDone, 1000);
    } catch {
      // if linking fails, just continue — Pass is still in localStorage
      setSaved(true);
      setTimeout(onDone, 1000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="w-full max-w-sm border-border">
        <CardContent className="flex flex-col items-center gap-4 py-6 px-8">
          <Image
            src="/OnyxWhite.png"
            alt="Onyx Pass"
            width={420}
            height={234}
            className="h-8 w-auto select-none"
            priority
          />
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-base font-medium">Save Your Onyx Pass.</h2>
            <p className="text-xs text-muted-foreground text-balance leading-relaxed">
              Your Pass is a key stored in this browser. Any Onyx project can use
              it to sign you in instantly — no password needed.
            </p>
          </div>
          {saved ? (
            <p className="text-sm text-muted-foreground">Pass saved.</p>
          ) : (
            <Button
              className="w-full !bg-primary !text-primary-foreground"
              onClick={savePass}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Pass"}
            </Button>
          )}
        </CardContent>
      </Card>
      {!saved && (
        <button
          onClick={onDone}
          className="mt-5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip for now.
        </button>
      )}
    </>
  );
}
