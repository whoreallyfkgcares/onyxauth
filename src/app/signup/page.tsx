import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Create account — Onyx" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <SignupForm redirectTo={redirectTo} />
    </main>
  );
}
