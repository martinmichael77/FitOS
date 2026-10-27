import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

const primaryActions = [
  {
    number: "01",
    eyebrow: "STRENGTH",
    title: "Set up a workout",
    description:
      "Create a reusable routine once, then use it whenever you train.",
    href: "/workout-templates",
    action: "Create or choose a workout",
    icon: "↗",
    accent: "border-emerald-400/30 bg-emerald-400/5",
  },
  {
    number: "02",
    eyebrow: "RUNNING",
    title: "Log a run",
    description:
      "Already ran today? Save distance and time. No setup required.",
    href: "/runs",
    action: "Record a run",
    icon: "↗",
    accent: "border-sky-400/30 bg-sky-400/5",
  },
  {
    number: "03",
    eyebrow: "PLAN AHEAD",
    title: "Make a simple plan",
    description:
      "Add workouts or runs to your calendar when you’re ready.",
    href: "/planner",
    action: "Open your planner",
    icon: "↗",
    accent: "border-violet-400/30 bg-violet-400/5",
  },
];

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
        <p role="status" className="text-slate-400">Loading your FitOS home…</p>
      </div>
    </main>
  );
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) redirect("/login");

  const email =
    typeof data.claims.email === "string" ? data.claims.email : "your account";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <Link href="/dashboard" className="text-2xl font-bold tracking-tight">
            FitOS<span className="text-emerald-400">.</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href="/workout-history" className="text-slate-300 hover:text-white">
              History
            </Link>
            <Link href="/progress" className="text-slate-300 hover:text-white">
              Progress
            </Link>
            <form action={logout}>
              <button type="submit" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="py-9 sm:py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Your training, made simple
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
            Welcome to FitOS.
            <span className="mt-2 block text-slate-400">Let’s get your first session logged.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
            You don’t need to configure everything first. Start with one activity.
            You can build your plan and explore the rest later.
          </p>
          <p className="mt-3 text-sm text-slate-500">Signed in as {email}</p>
        </section>

        <section aria-labelledby="start-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Start here</p>
              <h2 id="start-title" className="mt-1 text-2xl font-bold">Choose what you want to do</h2>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">One step at a time</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {primaryActions.map((item) => (
              <article key={item.number} className={`flex min-h-64 flex-col rounded-2xl border p-5 sm:p-6 ${item.accent}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">{item.number}</span>
                  <span aria-hidden="true" className="text-xl text-slate-300">{item.icon}</span>
                </div>
                <p className="mt-5 text-xs font-bold tracking-[0.16em] text-slate-400">{item.eyebrow}</p>
                <h3 className="mt-2 text-xl font-bold">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{item.description}</p>
                <Link href={item.href} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
                  {item.action} <span className="ml-2" aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7" aria-labelledby="how-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">The easy workflow</p>
          <h2 id="how-title" className="mt-2 text-xl font-bold">Use FitOS in 3 simple steps</h2>
          <ol className="mt-5 grid gap-5 sm:grid-cols-3">
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold">1</span>
              <div><h3 className="font-semibold">Do an activity</h3><p className="mt-1 text-sm leading-6 text-slate-400">Start a saved workout or record a run. You can skip planning for now.</p></div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold">2</span>
              <div><h3 className="font-semibold">Save what happened</h3><p className="mt-1 text-sm leading-6 text-slate-400">Enter sets, reps and weights for strength, or distance and duration for running.</p></div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold">3</span>
              <div><h3 className="font-semibold">Review your progress</h3><p className="mt-1 text-sm leading-6 text-slate-400">History shows what you completed. Progress shows trends as you log more.</p></div>
            </li>
          </ol>
        </section>

        <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Need to find something?</h2>
            <p className="mt-1 text-sm text-slate-400">These tools are here when you need them—no need to start with all of them.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/exercises" className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900">Exercise library</Link>
            <Link href="/workout-templates" className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900">My workouts</Link>
            <Link href="/planner" className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900">Planner</Link>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-600">
          Keep it simple. Every activity you log helps build your training history.
        </footer>
      </div>
    </main>
  );
}
