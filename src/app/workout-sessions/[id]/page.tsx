import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import ConfirmDeleteForm from "@/components/ConfirmDeleteForm";
import {
  deleteWorkoutSet,
  finishWorkout,
  saveWorkoutSet,
} from "@/app/workout-sessions/actions";
import { createClient } from "@/lib/supabase/server";

type WorkoutSessionPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
    completed?: string;
    deletedSet?: string;
  }>;
};

type WorkoutSet = {
  id: string;
  session_exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  is_warmup: boolean;
  is_completed: boolean;
  rpe: number | null;
  notes: string | null;
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );

export default function WorkoutSessionPage({
  params,
  searchParams,
}: WorkoutSessionPageProps) {
  return (
    <Suspense fallback={<WorkoutSessionFallback />}>
      <WorkoutSessionContent params={params} searchParams={searchParams} />
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
  searchParams,
}: WorkoutSessionPageProps) {
  await connection();

  const { id } = await params;
  const query = await searchParams;

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

  let allSets: WorkoutSet[] = [];

  if (exercises.length > 0) {
    const { data: rawSets, error: setsError } = await supabase
      .from("workout_sets")
      .select(
        "id, session_exercise_id, set_number, reps, weight_kg, is_warmup, is_completed, rpe, notes",
      )
      .eq("user_id", userId)
      .in(
        "session_exercise_id",
        exercises.map((exercise) => exercise.id),
      )
      .order("set_number", { ascending: true });

    if (setsError) {
      console.error("Failed to load workout sets:", setsError);
      throw new Error("Unable to load saved sets.");
    }

    allSets = (rawSets ?? []) as WorkoutSet[];
  }

  const formatRepRange = (min: number | null, max: number | null) => {
    if (min !== null && max !== null) {
      return min === max ? `${min}` : `${min}–${max}`;
    }

    if (min !== null) return `${min}+`;
    if (max !== null) return `Up to ${max}`;

    return "Not set";
  };

  const errorMessages: Record<string, string> = {
    "invalid-set": "Check your set values and try again.",
    "missing-set-data": "Enter reps and weight before completing a set.",
    "delete-set": "The set could not be deleted. Please try again.",
    save: "We couldn't save your set. Please try again.",
    "session-closed": "This workout is no longer editable.",
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

        {query.saved === "1" && (
          <p className="rounded-lg border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-300">
            Set saved successfully.
          </p>
        )}

        {query.deletedSet === "1" && (
          <p
            role="status"
            className="rounded-lg border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-300"
          >
            Set deleted successfully.
          </p>
        )}

        {query.error && (
          <p className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            {errorMessages[query.error] ?? "Something went wrong."}
          </p>
        )}

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
              {exercises.map((exercise, index) => {
                const targetSets = Math.min(
                  Math.max(exercise.target_sets ?? 1, 1),
                  30,
                );

                const exerciseSets = allSets.filter(
                  (set) => set.session_exercise_id === exercise.id,
                );

                const completedCount = exerciseSets.filter(
                  (set) => set.is_completed,
                ).length;

                const setNumbers = Array.from(
                  { length: targetSets },
                  (_, setIndex) => setIndex + 1,
                );

                const numbersToShow = [
                  ...setNumbers,
                  ...exerciseSets
                    .map((set) => set.set_number)
                    .filter((number) => !setNumbers.includes(number)),
                ];

                return (
                  <article
                    key={exercise.id}
                    className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 font-semibold text-emerald-400">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {exercise.exercise_name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          Target: {exercise.target_sets ?? "—"} sets ·{" "}
                          {formatRepRange(
                            exercise.target_reps_min,
                            exercise.target_reps_max,
                          )}{" "}
                          reps ·{" "}
                          {exercise.target_weight_kg !== null
                            ? `${exercise.target_weight_kg} kg`
                            : "Weight not set"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {completedCount} of {exerciseSets.length} saved sets
                          completed
                        </p>
                      </div>
                    </div>

                    {numbersToShow.map((setNumber) => {
                      const savedSet = exerciseSets.find(
                        (set) => set.set_number === setNumber,
                      );

                      return (
                        <div
                          key={setNumber}
                          className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4"
                        >
                          <form action={saveWorkoutSet} className="space-y-3">
                            <input
                              type="hidden"
                              name="sessionId"
                              value={session.id}
                            />
                            <input
                              type="hidden"
                              name="sessionExerciseId"
                              value={exercise.id}
                            />
                            <input
                              type="hidden"
                              name="setNumber"
                              value={setNumber}
                            />

                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                Set {setNumber}
                              </span>
                              {savedSet?.is_completed && (
                                <span className="text-xs text-emerald-400">
                                  Completed
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <label className="space-y-1 text-xs text-slate-400">
                                Reps
                                <input
                                  name="reps"
                                  type="number"
                                  min="1"
                                  max="1000"
                                  step="1"
                                  defaultValue={savedSet?.reps ?? ""}
                                  placeholder={
                                    exercise.target_reps_min?.toString() ?? "0"
                                  }
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base text-white"
                                />
                              </label>

                              <label className="space-y-1 text-xs text-slate-400">
                                Weight (kg)
                                <input
                                  name="weightKg"
                                  type="number"
                                  min="0"
                                  max="10000"
                                  step="0.25"
                                  defaultValue={
                                    savedSet?.weight_kg ??
                                    exercise.target_weight_kg ??
                                    ""
                                  }
                                  placeholder="0"
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base text-white"
                                />
                              </label>

                              <label className="space-y-1 text-xs text-slate-400">
                                RPE (optional)
                                <input
                                  name="rpe"
                                  type="number"
                                  min="1"
                                  max="10"
                                  step="0.5"
                                  defaultValue={savedSet?.rpe ?? ""}
                                  placeholder="1–10"
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base text-white"
                                />
                              </label>

                              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
                                <input
                                  type="checkbox"
                                  name="isWarmup"
                                  defaultChecked={savedSet?.is_warmup ?? false}
                                  className="h-4 w-4 accent-emerald-400"
                                />
                                Warm-up
                              </label>
                            </div>

                            <label className="block space-y-1 text-xs text-slate-400">
                              Notes (optional)
                              <input
                                name="notes"
                                type="text"
                                maxLength={1000}
                                defaultValue={savedSet?.notes ?? ""}
                                placeholder="How did the set feel?"
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                              />
                            </label>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <label className="flex items-center gap-2 text-sm text-slate-300">
                                <input
                                  type="checkbox"
                                  name="isCompleted"
                                  defaultChecked={
                                    savedSet?.is_completed ?? false
                                  }
                                  className="h-4 w-4 accent-emerald-400"
                                />
                                Set completed
                              </label>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="submit"
                                  disabled={session.status !== "in_progress"}
                                  className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Save set
                                </button>
                              </div>
                            </div>
                          </form>

                          {savedSet && session.status === "in_progress" && (
                            <div className="flex justify-end">
                              <ConfirmDeleteForm
                                action={deleteWorkoutSet}
                                fieldName="setId"
                                fieldValue={savedSet.id}
                                confirmationMessage={`Delete Set ${setNumber} for ${exercise.exercise_name}? This cannot be undone.`}
                                buttonLabel="Delete set"
                              >
                                <input
                                  type="hidden"
                                  name="sessionId"
                                  value={session.id}
                                />
                              </ConfirmDeleteForm>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {query.completed === "1" && (
          <p className="rounded-lg border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-300">
            Workout completed successfully!
          </p>
        )}

        {session.status === "in_progress" && (
          <form
            action={finishWorkout}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <input
              type="hidden"
              name="sessionId"
              value={session.id}
            />

            <h2 className="text-lg font-semibold">Finish workout</h2>

            <p className="mt-2 text-sm text-slate-400">
              Finish this session when you&apos;re done training. Any incomplete
              sets will remain saved as incomplete.
            </p>

            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Finish workout
            </button>
          </form>
        )}

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
