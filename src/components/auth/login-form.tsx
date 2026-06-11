"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { OnyxSignInButton } from "./onyx-sign-in-button";
import { SocialButtons } from "./social-buttons";
import { EmailInput } from "./email-input";
import { authClient } from "@/lib/auth-client";
import { APP_NAME } from "@/lib/config";
import { safeRedirectTo } from "@/lib/redirect";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dest = safeRedirectTo(redirectTo);

  const isFilled = email.trim().length > 0 && password.length > 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) { toast.error("Enter your email."); return; }
    if (!password) { toast.error("Enter your password."); return; }
    setPending(true);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      toast.error(error.message ?? "Invalid email or password");
      setPending(false);
      return;
    }
    router.push(dest);
    router.refresh();
  }

  return (
    <>
      <Card className="w-full max-w-sm border-border">
        <CardHeader>
          <CardTitle className="text-xl">Sign In to {APP_NAME}.</CardTitle>
          <CardDescription>Use a Pass, Email, or Account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <OnyxSignInButton redirectTo={dest} />
          <SocialButtons />
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>
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
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={pending}
              className={isFilled ? "!bg-primary !text-primary-foreground" : ""}
            >
              {pending ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-5 text-sm text-muted-foreground">
        No Account?{" "}
        <Link
          href={redirectTo ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : "/signup"}
          className="transition-colors hover:text-foreground"
        >
          Create One.
        </Link>
      </p>
    </>
  );
}
