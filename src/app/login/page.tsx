import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in — Onyx" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <LoginForm redirectTo={redirectTo} />
    </main>
  );
}
