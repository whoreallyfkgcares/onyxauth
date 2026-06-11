import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OnyxLogo } from "@/components/onyx-logo";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="flex flex-col items-center gap-4 text-center">
        <OnyxLogo className="h-12" />
        <h1 className="text-4xl font-semibold tracking-tight">Onyx</h1>
        <p className="max-w-md text-balance text-muted-foreground">
          Keypair-native authentication for the Onyx platform. Sign in with
          your Onyx key, email, or a connected account.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/signup">Create account</Link>
        </Button>
      </div>
    </main>
  );
}
