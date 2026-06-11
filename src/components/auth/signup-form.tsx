"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { OnyxSignInButton } from "./onyx-sign-in-button";
import { SocialButtons } from "./social-buttons";
import { EmailInput } from "./email-input";
import { SavePassPrompt } from "./save-pass-prompt";
import { authClient } from "@/lib/auth-client";
import { APP_NAME } from "@/lib/config";
import { safeRedirectTo } from "@/lib/redirect";

export function SignupForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const dest = safeRedirectTo(redirectTo);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassPrompt, setShowPassPrompt] = useState(false);

  const isFilled = name.trim().length > 0 && email.trim().length > 0 && password.length >= 8;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { toast.error("Enter your name."); return; }
    if (!email.trim()) { toast.error("Enter your email."); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setPending(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      toast.error(error.message ?? "Could not create account");
      setPending(false);
      return;
    }
    setShowPassPrompt(true);
    setPending(false);

  }

  if (showPassPrompt) {
    return (
      <SavePassPrompt
        onDone={() => {
          router.push(dest);
          router.refresh();
        }}
      />
    );
  }

  return (
    <>
      <Card className="w-full max-w-sm border-border">
        <CardHeader>
          <CardTitle className="text-xl">Create a {APP_NAME} Account.</CardTitle>
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
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={pending}
              className={isFilled ? "!bg-primary !text-primary-foreground" : ""}
            >
              {pending ? "Creating account…" : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-5 text-sm text-muted-foreground">
        Have an Account?{" "}
        <Link href={redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login"} className="transition-colors hover:text-foreground">
          Sign In.
        </Link>
      </p>
    </>
  );
}
