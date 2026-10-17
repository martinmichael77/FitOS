import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

type WorkoutSession = {
  id: string;
  name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
};

type Run = {
  id: string;
  started_at: string;
  distance_m: number;
  duration_seconds: number;
  run_type: string;
};

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}

function formatPace(distanceM: number, durationSeconds: number) {
  if (distanceM <= 0) return "—";

  const seconds = Math.round(durationSeconds / (distanceM / 1000));

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} /km`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<ProgressFallback />}>
      <ProgressContent />
    </Suspense>
  );
}

function ProgressFallback() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white"
          >
            Dashboard
          </Link>
        </header>
        <section aria-busy="true">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            Your training
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Progress</h1>
          <p role="status" className="mt-2 text-slate-400">
            Loading your training progress...
          </p>
        </section>
      </div>
    </main>
  );
}

async function ProgressContent() {
  await connection();

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const [sessionsResult, runsResult] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, name, status, started_at, completed_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false }),
    supabase
      .from("runs")
      .select("id, started_at, distance_m, duration_seconds, run_type")
      .eq("user_id", userId)
      .order("started_at", { ascending: false }),
  ]);

  const sessions = (sessionsResult.data ?? []) as WorkoutSession[];
  const runs = (runsResult.data ?? []) as Run[];

  const completedSessions = sessions.filter(
    (session) => session.status === "completed",
  );

  const totalDistance = runs.reduce(
    (sum, run) => sum + run.distance_m,
    0,
  );

  const totalRunSeconds = runs.reduce(
    (sum, run) => sum + run.duration_seconds,
    0,
  );

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  const weeklySessions = completedSessions.filter(
    (session) => new Date(session.started_at) >= weekStart,
  ).length;

  const weeklyRuns = runs.filter(
    (run) => new Date(run.started_at) >= weekStart,
  );

  const weeklyDistance = weeklyRuns.reduce(
    (sum, run) => sum + run.distance_m,
    0,
  );

  const activities = [
    ...completedSessions.map((session) => ({
      id: session.id,
      title: session.name,
      type: "Strength",
      date: session.started_at,
      detail: session.completed_at
        ? formatDuration(
            Math.max(
              0,
              Math.floor(
                (new Date(session.completed_at).getTime() -
                  new Date(session.started_at).getTime()) /
                  1000,
              ),
            ),
          )
        : "Completed workout",
    })),
    ...runs.map((run) => ({
      id: run.id,
      title: `${(run.distance_m / 1000).toFixed(2)} km run`,
      type: "Running",
      date: run.started_at,
      detail: `${formatDuration(run.duration_seconds)} · ${formatPace(
        run.distance_m,
        run.duration_seconds,
      )}`,
    })),
  ]
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Progress</h1>
            <p className="mt-2 text-slate-400">
              Your training, running, and consistency at a glance.
            </p>
          </div>

          <nav className="flex gap-3 text-sm">
            <Link
              href="/workout-history"
              className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-900"
            >
              Workout history
            </Link>
            <Link
              href="/runs"
              className="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Log a run
            </Link>
          </nav>
        </header>

        <section>
          <h2 className="mb-4 text-lg font-semibold">All-time overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Completed workouts",
                value: completedSessions.length.toString(),
                note: `${sessions.filter((session) => session.status === "in_progress").length} in progress`,
              },
              {
                label: "Total runs",
                value: runs.length.toString(),
                note: "Logged running sessions",
              },
              {
                label: "Distance covered",
                value: `${(totalDistance / 1000).toFixed(2)} km`,
                note: "Across all logged runs",
              },
              {
                label: "Average running pace",
                value: formatPace(totalDistance, totalRunSeconds),
                note: "Minutes per kilometre",
              },
            ].map((metric) => (
              <article
                key={metric.label}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <p className="text-sm text-slate-400">{metric.label}</p>
                <p className="mt-3 text-2xl font-bold">{metric.value}</p>
                <p className="mt-2 text-xs text-slate-500">{metric.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">
              This week
            </p>
            <h2 className="mt-2 text-xl font-semibold">Training consistency</h2>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Completed workouts</p>
                <p className="mt-2 text-3xl font-bold">{weeklySessions}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Running distance</p>
                <p className="mt-2 text-3xl font-bold">
                  {(weeklyDistance / 1000).toFixed(2)} km
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">
              Your training
            </p>
            <h2 className="mt-2 text-xl font-semibold">Quick actions</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/workout-templates"
                className="rounded-lg border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800"
              >
                Start strength workout
              </Link>
              <Link
                href="/planner"
                className="rounded-lg border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800"
              >
                View training planner
              </Link>
            </div>
          </article>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent activity</h2>
            <Link
              href="/workout-history"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              All workouts →
            </Link>
          </div>

          {activities.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
              <p className="font-medium">Your progress starts here</p>
              <p className="mt-2 text-sm text-slate-400">
                Complete a workout or log a run to see activity here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <article
                  key={`${activity.type}-${activity.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {activity.type} · {formatDate(activity.date)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-300">{activity.detail}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
