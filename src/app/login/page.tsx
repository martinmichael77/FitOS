
import { redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default function LoginPage({
  searchParams,
}: LoginPageProps) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <section className="w-full max-w-md" aria-busy="true">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          FitOS<span className="text-emerald-400">.</span>
        </Link>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Welcome back
          </p>
          <h1 className="mt-3 text-3xl font-bold">Sign in to FitOS</h1>
          <p role="status" className="mt-6 text-sm text-slate-400">
            Checking your session...
          </p>
        </div>
      </section>
    </main>
  );
}

async function LoginContent({
  searchParams,
}: LoginPageProps) {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const hasError = params.error === "invalid";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <section className="w-full max-w-md">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight"
        >
          FitOS<span className="text-emerald-400">.</span>
        </Link>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Welcome back
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Sign in to FitOS
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Access your workouts, running history and training plan.
          </p>

          {hasError && (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300"
            >
              Sign-in failed. Check your email and password and try again.
            </p>
          )}

          <form action={login} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Private access only. Accounts are managed by the FitOS administrator.
          </p>
        </div>
      </section>
    </main>
  );
}
    