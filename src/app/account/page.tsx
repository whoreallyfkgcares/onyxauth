import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OnyxLogo } from "@/components/onyx-logo";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata = { title: "Account — Onyx" };

export default async function AccountPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect("/login");

  const accounts = await auth.api.listUserAccounts({
    headers: requestHeaders,
  });

  const { user } = session;
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <OnyxLogo className="h-8" />
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="size-12">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Separator />
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">User ID</span>
              <code className="font-mono text-xs">{user.id}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email verified</span>
              <Badge variant={user.emailVerified ? "default" : "secondary"}>
                {user.emailVerified ? "Verified" : "Unverified"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Session expires</span>
              <span className="text-xs">
                {new Date(session.session.expiresAt).toUTCString()}
              </span>
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              Sign-in methods
            </span>
            <div className="flex flex-wrap gap-2">
              {accounts.map((account) => (
                <Badge key={account.id} variant="outline" className="gap-1.5">
                  {account.providerId === "onyx" && (
                    <OnyxLogo className="h-3" />
                  )}
                  {account.providerId === "credential"
                    ? "email + password"
                    : account.providerId}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <SignOutButton />
        </CardFooter>
      </Card>
    </main>
  );
}
