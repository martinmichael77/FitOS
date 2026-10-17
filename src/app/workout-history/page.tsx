
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

export default function WorkoutHistoryPage() {
  return (
    <Suspense fallback={<WorkoutHistoryFallback />}>
      <WorkoutHistoryContent />
    </Suspense>
  );
}

function WorkoutHistoryFallback() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white"
          >
            Dashboard
          </Link>
        </header>
        <section className="space-y-3" aria-busy="true">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            Your training
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Workout history</h1>
          <p role="status" className="text-slate-400">
            Loading your sessions...
          </p>
        </section>
      </div>
    </main>
  );
}

async function WorkoutHistoryContent() {
  await connection();

  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: sessions, error } = await supabase
    .from("workout_sessions")
    .select("id, name, status, started_at, completed_at")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Failed to load workout history:", error);
    throw new Error("Unable to load workout history.");
  }

  const formatDuration = (start: string, end: string) => {
    const minutes = Math.max(
      0,
      Math.round(
        (new Date(end).getTime() - new Date(start).getTime()) /
          60000
      )
    );

    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes
      ? `${hours} hr ${remainingMinutes} min`
      : `${hours} hr`;
  };

  const completedCount =
    sessions?.filter((session) => session.status === "completed")
      .length ?? 0;

  const inProgressCount =
    sessions?.filter((session) => session.status === "in_progress")
      .length ?? 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Dashboard
          </Link>

          <Link
            href="/workout-templates"
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
          >
            Start workout
          </Link>
        </header>

        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            Your training
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Workout history
          </h1>
          <p className="text-slate-400">
            Review your sessions and return to a workout in progress.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Completed</p>
            <p className="mt-2 text-3xl font-bold">{completedCount}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">In progress</p>
            <p className="mt-2 text-3xl font-bold">{inProgressCount}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">All sessions</h2>

          {!sessions?.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <p className="font-medium">No workouts yet</p>
              <p className="mt-2 text-sm text-slate-400">
                Start a workout from one of your templates to see it here.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <article
                key={session.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {session.name}
                    </h3>

                    <p className="text-sm text-slate-400">
                      Started{" "}
                      {new Date(session.started_at).toLocaleString()}
                    </p>

                    {session.status === "completed" &&
                      session.completed_at && (
                        <p className="text-sm text-slate-400">
                          Duration:{" "}
                          {formatDuration(
                            session.started_at,
                            session.completed_at
                          )}
                        </p>
                      )}

                    {session.status === "in_progress" && (
                      <p className="text-sm text-amber-300">
                        Workout in progress
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        session.status === "completed"
                          ? "bg-emerald-950 text-emerald-300"
                          : "bg-amber-950 text-amber-300"
                      }`}
                    >
                      {session.status.replace("_", " ")}
                    </span>

                    <Link
                      href={`/workout-sessions/${session.id}`}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
