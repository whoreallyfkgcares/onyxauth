"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  const isFilled = password.length >= 8 && confirm.length > 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    if (!token) { toast.error("Invalid or missing reset token."); return; }
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not reset password.");
      return;
    }
    toast.success("Password updated. Sign in with your new password.");
    router.push("/login");
  }

  if (!token) {
    return (
      <>
        <Card className="w-full max-w-sm border-border">
          <CardHeader>
            <CardTitle className="text-xl">Invalid Link.</CardTitle>
            <CardDescription>This reset link is missing or expired. Request a new one.</CardDescription>
          </CardHeader>
        </Card>
        <p className="mt-5 text-sm text-muted-foreground">
          <Link href="/forgot-password" className="transition-colors hover:text-foreground">
            Request a new link.
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Card className="w-full max-w-sm border-border">
        <CardHeader>
          <CardTitle className="text-xl">New Password.</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={pending}
              className={isFilled ? "!bg-primary !text-primary-foreground" : ""}
            >
              {pending ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-5 text-sm text-muted-foreground">
        <Link href="/login" className="transition-colors hover:text-foreground">
          Back to Sign In.
        </Link>
      </p>
    </>
  );
}
