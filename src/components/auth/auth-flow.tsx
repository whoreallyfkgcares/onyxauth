"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { OnyxSignInButton } from "./onyx-sign-in-button";
import { SocialButtons } from "./social-buttons";
import { EmailInput } from "./email-input";
import { authClient } from "@/lib/auth-client";
import { APP_NAME } from "@/lib/config";
import { safeRedirectTo } from "@/lib/redirect";
import { saveDeviceToken } from "@/lib/onyx/identity";

type State = "login" | "signup1" | "signup2" | "passPrompt";
type Dir = "forward" | "back";


export function AuthFlow({
  initial,
  redirectTo,
}: {
  initial: "login" | "signup";
  redirectTo?: string;
}) {
  const router = useRouter();
  const dest = safeRedirectTo(redirectTo);

  const [state, setState] = useState<State>(initial === "login" ? "login" : "signup1");
  const [dir, setDir] = useState<Dir>("forward");
  const [animKey, setAnimKey] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const [passSaving, setPassSaving] = useState(false);
  const [passSaved, setPassSaved] = useState(false);

  function go(to: State, d: Dir, url?: string) {
    setDir(d);
    setAnimKey((k) => k + 1);
    setState(to);
    if (url) router.push(url, { scroll: false });
  }

  // ── Login submit ──────────────────────────────────────────────────────────
  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email."); return; }
    if (!password) { toast.error("Enter your password."); return; }
    setPending(true);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) { toast.error(error.message ?? "Invalid email or password"); setPending(false); return; }
    router.push(dest); router.refresh();
  }

  // ── Signup submit ─────────────────────────────────────────────────────────
  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email."); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setPending(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) { toast.error(error.message ?? "Could not create account"); setPending(false); return; }
    go("passPrompt", "forward");
    setPending(false);
  }

  // ── Pass prompt ───────────────────────────────────────────────────────────
  async function savePass() {
    setPassSaving(true);
    try {
      const res = await (authClient as any).onyx.createPass({});
      if (res.error) throw new Error(res.error.message);
      saveDeviceToken(res.data.deviceToken);
    } catch { /* silently continue */ }
    setPassSaved(true);
    setPassSaving(false);
    setTimeout(() => { router.push(dest); router.refresh(); }, 1000);
  }

  // ── Slide class ───────────────────────────────────────────────────────────
  const slide = dir === "forward"
    ? "animate-in fade-in-0 slide-in-from-right-4 duration-200"
    : "animate-in fade-in-0 slide-in-from-left-4 duration-200";

  // ── Render ────────────────────────────────────────────────────────────────
  if (state === "passPrompt") {
    return (
      <div key={animKey} className={`${slide} flex flex-col items-center`}>
        <Card className="w-full max-w-sm border-border">
          <CardContent className="flex flex-col items-center gap-4 py-6 px-8">
            <Image src="/OnyxWhite.png" alt="Onyx" width={420} height={234} className="h-8 w-auto select-none" priority />
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-base font-medium">Save Your Onyx Pass.</h2>
              <p className="text-xs text-muted-foreground text-balance leading-relaxed">
                Your Pass is a key stored on this device. Any Onyx project can use it to sign you in instantly — no password needed.
              </p>
            </div>
            {passSaved ? (
              <p className="text-sm text-muted-foreground">Pass saved.</p>
            ) : (
              <Button
                className="w-full !bg-primary !text-primary-foreground"
                onClick={savePass}
                disabled={passSaving}
              >
                {passSaving ? "Saving…" : "Save Pass"}
              </Button>
            )}
          </CardContent>
        </Card>
        {!passSaved && (
          <button
            onClick={() => { router.push(dest); router.refresh(); }}
            className="mt-5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip for now.
          </button>
        )}
      </div>
    );
  }

  const loginFilled = email.trim().length > 0 && password.length > 0;
  const signup2Filled = email.trim().length > 0 && password.length >= 8;

  return (
    <div key={animKey} className={`${slide} flex flex-col items-center`}>
      <Card className="w-full max-w-sm border-border">
        {/* ── Login ─────────────────────────────────────────── */}
        {state === "login" && (
          <>
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
              <form onSubmit={submitLogin} noValidate className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <EmailInput id="email" value={email} onChange={setEmail} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                      Forgot?
                    </Link>
                  </div>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </div>
                <Button type="submit" variant="secondary" disabled={pending}
                  className={loginFilled ? "!bg-primary !text-primary-foreground" : ""}>
                  {pending ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* ── Signup step 1 ──────────────────────────────────── */}
        {state === "signup1" && (
          <>
            <CardHeader>
              <CardTitle className="text-xl">Create a {APP_NAME} Account.</CardTitle>
              <CardDescription>Use a Pass, Email, or Account.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                <OnyxSignInButton redirectTo={dest} />
                <SocialButtons />
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!name.trim()) { toast.error("Enter your name."); return; }
                        go("signup2", "forward");
                      }
                    }}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!name.trim()) { toast.error("Enter your name."); return; }
                  go("signup2", "forward");
                }}
                className={name.trim() ? "!bg-primary !text-primary-foreground" : ""}
              >
                Continue
              </Button>
            </CardContent>
          </>
        )}

        {/* ── Signup step 2 ──────────────────────────────────── */}
        {state === "signup2" && (
          <>
            <CardHeader>
              <CardTitle className="text-xl">
                Almost there{name ? `, ${name.split(" ")[0]}` : ""}.
              </CardTitle>
              <CardDescription>Set your email and password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitSignup} noValidate className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email2">Email</Label>
                  <EmailInput id="email2" value={email} onChange={setEmail} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password2">Password</Label>
                  <Input id="password2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                  <p className="text-xs text-muted-foreground">At least 8 characters</p>
                </div>
                <Button type="submit" variant="secondary" disabled={pending}
                  className={signup2Filled ? "!bg-primary !text-primary-foreground" : ""}>
                  {pending ? "Creating account…" : "Create Account"}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <p className="mt-5 text-sm text-muted-foreground">
        {state === "signup2" && (
          <>
            <button onClick={() => go("signup1", "back")} className="transition-colors hover:text-foreground">
              Back.
            </button>
            {" · "}
          </>
        )}
        {state === "login" ? (
          <>
            No Account?{" "}
            <button onClick={() => go("signup1", "forward", "/signup")} className="transition-colors hover:text-foreground">
              Create One.
            </button>
          </>
        ) : (
          <>
            Have an Account?{" "}
            <button onClick={() => go("login", "back", "/login")} className="transition-colors hover:text-foreground">
              Sign In.
            </button>
          </>
        )}
      </p>
    </div>
  );
}
