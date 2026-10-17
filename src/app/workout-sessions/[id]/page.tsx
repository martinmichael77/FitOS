import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

type WorkoutSessionPageProps = {
  params: Promise<{ id: string }>;
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );

export default function WorkoutSessionPage({
  params,
}: WorkoutSessionPageProps) {
  return (
    <Suspense fallback={<WorkoutSessionFallback />}>
      <WorkoutSessionContent params={params} />
    </Suspense>
  );
}

function WorkoutSessionFallback() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <Link
            href="/workout-templates"
            className="text-sm text-slate-400 hover:text-white"
          >
            Workout templates
          </Link>
        </header>
        <section className="space-y-3" aria-busy="true">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            Workout session
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loading workout...
          </h1>
          <p role="status" className="text-sm text-slate-400">
            Loading your session and exercise targets.
          </p>
        </section>
      </div>
    </main>
  );
}

async function WorkoutSessionContent({
  params,
}: WorkoutSessionPageProps) {
  await connection();

  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, name, status, started_at, completed_at, notes")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    console.error("Failed to load workout session:", sessionError);
    throw new Error("Unable to load this workout session.");
  }

  if (!session) {
    notFound();
  }

  const { data: exercises, error: exercisesError } = await supabase
    .from("session_exercises")
    .select(
      "id, exercise_name, sort_order, target_sets, target_reps_min, target_reps_max, target_weight_kg, notes",
    )
    .eq("session_id", session.id)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (exercisesError) {
    console.error("Failed to load session exercises:", exercisesError);
    throw new Error("Unable to load workout exercises.");
  }

  const formatRepRange = (min: number | null, max: number | null) => {
    if (min !== null && max !== null) {
      return min === max ? `${min}` : `${min}–${max}`;
    }

    if (min !== null) return `${min}+`;
    if (max !== null) return `Up to ${max}`;

    return "Not set";
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/workout-templates"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Workout templates
          </Link>

          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm capitalize text-slate-300">
            {session.status.replace("_", " ")}
          </span>
        </header>

        <section className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            Workout session
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {session.name}
          </h1>

          <p className="text-sm text-slate-400">
            Started {new Date(session.started_at).toLocaleString()}
          </p>

          {session.status === "in_progress" && (
            <p className="text-slate-300">
              Your workout is in progress. Your exercise targets are shown below.
            </p>
          )}

          {session.status === "completed" && session.completed_at && (
            <p className="text-slate-300">
              Completed {new Date(session.completed_at).toLocaleString()}
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Exercises</h2>
            <span className="text-sm text-slate-400">
              {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
            </span>
          </div>

          {exercises.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <p className="font-medium">No exercises in this session</p>
              <p className="mt-2 text-sm text-slate-400">
                This session does not contain any copied exercises. Start a workout
                from a template that has exercises added.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {exercises.map((exercise, index) => (
                <article
                  key={exercise.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 font-semibold text-emerald-400">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold">
                        {exercise.exercise_name}
                      </h3>

                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-950 p-3">
                          <p className="text-xs text-slate-400">Target sets</p>
                          <p className="mt-1 font-semibold">
                            {exercise.target_sets ?? "—"}
                          </p>
                        </div>

                        <div className="rounded-lg bg-slate-950 p-3">
                          <p className="text-xs text-slate-400">Rep range</p>
                          <p className="mt-1 font-semibold">
                            {formatRepRange(
                              exercise.target_reps_min,
                              exercise.target_reps_max,
                            )}
                          </p>
                        </div>

                        <div className="rounded-lg bg-slate-950 p-3">
                          <p className="text-xs text-slate-400">Target weight</p>
                          <p className="mt-1 font-semibold">
                            {exercise.target_weight_kg !== null
                              ? `${exercise.target_weight_kg} kg`
                              : "Not set"}
                          </p>
                        </div>
                      </div>

                      {exercise.notes && (
                        <p className="mt-3 text-sm text-slate-400">
                          {exercise.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-slate-800 pt-5">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white"
          >
            Back to dashboard →
          </Link>
        </footer>
      </div>
    </main>
  );
}
