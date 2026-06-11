"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { EmailInput } from "./email-input";
import { authClient } from "@/lib/auth-client";
import { APP_NAME } from "@/lib/config";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const isFilled = email.trim().length > 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) { toast.error("Enter your email."); return; }
    setPending(true);
    const { error } = await (authClient as any).forgetPassword({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Something went wrong.");
      return;
    }
    setSent(true);
  }

  return (
    <>
      <Card className="w-full max-w-sm border-border">
        <CardHeader>
          <CardTitle className="text-xl">Reset Your Password.</CardTitle>
          <CardDescription>
            {sent
              ? `We've sent a reset link to ${email}.`
              : `Enter your ${APP_NAME} email and we'll send a reset link.`}
          </CardDescription>
        </CardHeader>
        {!sent && (
          <CardContent>
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <EmailInput
                  id="email"
                  name="email"
                  value={email}
                  onChange={setEmail}
                  required
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                disabled={pending}
                className={isFilled ? "!bg-primary !text-primary-foreground" : ""}
              >
                {pending ? "Sending…" : "Send Reset Link"}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
      <p className="mt-5 text-sm text-muted-foreground">
        <Link href="/login" className="transition-colors hover:text-foreground">
          Back to Sign In.
        </Link>
      </p>
    </>
  );
}
