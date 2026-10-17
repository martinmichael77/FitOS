
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "../../lib/supabase/server";
import { logout } from "./actions";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardFallback() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-slate-800 pb-6">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            FitOS<span className="text-emerald-400">.</span>
          </Link>
        </header>
        <section className="py-12" aria-busy="true">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Personal fitness
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Your dashboard
          </h1>
          <p role="status" className="mt-3 text-slate-400">
            Loading your training overview...
          </p>
        </section>
      </div>
    </main>
  );
}

async function DashboardContent() {
  await connection();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : "Signed-in user";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            FitOS<span className="text-emerald-400">.</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/workout-history"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Workout history →
            </Link>

            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="py-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Personal fitness
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Your dashboard
          </h1>

          <p className="mt-3 text-slate-400">
            Signed in as {email}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Strength training",
                description: "Browse exercises and prepare for your workout templates.",
                href: "/exercises",
                action: "Open exercise library",
              },
              {
                title: "Workout templates",
                description: "Create and manage reusable strength routines.",
                href: "/workout-templates",
                action: "Manage templates",
              },
              {
                title: "Running",
                description: "Record distance, duration and pace.",
                href: null,
                action: "Coming soon",
              },
              {
                title: "Training planner",
                description: "Organize your upcoming workouts and runs.",
                href: null,
                action: "Coming soon",
              },
              {
                title: "Progress",
                description: "Review your training history and trends.",
                href: null,
                action: "Coming soon",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6"
              >
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 leading-6 text-slate-400">{item.description}</p>

                {item.href ? (
                  <Link
                    href={item.href}
                    className="mt-5 inline-flex rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
                  >
                    {item.action}
                  </Link>
                ) : (
                  <p className="mt-5 text-xs text-slate-500">{item.action}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
