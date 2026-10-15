import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  addTemplateExercise,
  moveTemplateExercise,
  removeTemplateExercise,
  updateTemplateExercise,
} from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    added?: string;
    updated?: string;
    removed?: string;
    moved?: string;
    error?: string;
  }>;
};

function label(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function TemplateEditorPage({
  params,
  searchParams,
}: PageProps) {
  return (
    <Suspense fallback={<TemplateEditorFallback />}>
      <TemplateEditorContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function TemplateEditorFallback() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-800 pb-6">
          <Link href="/dashboard" className="text-2xl font-bold tracking-tight">
            FitOS<span className="text-emerald-400">.</span>
          </Link>
        </header>
        <section className="py-10" aria-busy="true">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Template editor
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Workout template
          </h1>
          <p role="status" className="mt-3 text-slate-400">
            Loading your template...
          </p>
        </section>
      </div>
    </main>
  );
}

async function TemplateEditorContent({
  params,
  searchParams,
}: PageProps) {
  await connection();

  const { id } = await params;
  const messages = await searchParams;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    notFound();
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: template, error: templateError } = await supabase
    .from("workout_templates")
    .select("id, name, description")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (templateError) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <p role="alert">Could not load this template. Please try again.</p>
        <Link
          href="/workout-templates"
          className="mt-4 inline-block text-emerald-400"
        >
          Back to templates
        </Link>
      </main>
    );
  }

  if (!template) notFound();

  const [
    { data: exercises, error: exercisesError },
    { data: items, error: itemsError },
  ] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, name, category, equipment")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("template_exercises")
      .select(
        "id, exercise_id, sort_order, target_sets, target_reps_min, target_reps_max, target_weight_kg",
      )
      .eq("template_id", id)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
  ]);

  const loadError = exercisesError || itemsError;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <Link href="/dashboard" className="text-2xl font-bold tracking-tight">
            FitOS<span className="text-emerald-400">.</span>
          </Link>

          <Link
            href="/workout-templates"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            All templates
          </Link>
        </header>

        <section className="py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Template editor
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            {template.name}
          </h1>

          <p className="mt-3 text-slate-400">
            {template.description || "Build your reusable workout routine."}
          </p>

          {messages.added === "1" && (
            <p role="status" className="mt-6 rounded-lg border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-300">
              Exercise added.
            </p>
          )}

          {messages.updated === "1" && (
            <p role="status" className="mt-6 rounded-lg border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-300">
              Exercise targets updated.
            </p>
          )}

          {messages.removed === "1" && (
            <p role="status" className="mt-6 rounded-lg border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-300">
              Exercise removed from this template.
            </p>
          )}

          {messages.moved === "1" && (
            <p role="status" className="mt-6 rounded-lg border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-300">
              Exercise order updated.
            </p>
          )}

          {messages.error && (
            <p role="alert" className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
              {messages.error === "invalid"
                ? "Check the selected exercise and target values. Reps and sets must be positive, weight cannot be negative, and minimum reps cannot exceed maximum reps."
                : "The change could not be saved. Please try again."}
            </p>
          )}

          {loadError ? (
            <div role="alert" className="mt-8 rounded-xl border border-red-900 bg-red-950/40 p-6">
              Could not load exercises or template items. Check the server logs and try again.
            </div>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
              <section className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold">Add an exercise</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Choose a movement and set its default targets for this routine.
                </p>

                {exercises && exercises.length > 0 ? (
                  <form action={addTemplateExercise} className="mt-6 space-y-5">
                    <input type="hidden" name="templateId" value={id} />

                    <div>
                      <label htmlFor="exerciseId" className="mb-2 block text-sm font-medium">
                        Exercise
                      </label>
                      <select
                        id="exerciseId"
                        name="exerciseId"
                        required
                        defaultValue=""
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
                      >
                        <option value="" disabled>Select an exercise</option>
                        {exercises.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name} — {label(exercise.category)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="targetSets" className="mb-2 block text-sm font-medium">
                          Target sets
                        </label>
                        <input id="targetSets" name="targetSets" type="number" min="1" step="1" placeholder="3" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3" />
                      </div>
                      <div>
                        <label htmlFor="targetWeightKg" className="mb-2 block text-sm font-medium">
                          Weight (kg)
                        </label>
                        <input id="targetWeightKg" name="targetWeightKg" type="number" min="0" step="0.01" placeholder="Optional" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3" />
                      </div>
                      <div>
                        <label htmlFor="targetRepsMin" className="mb-2 block text-sm font-medium">
                          Minimum reps
                        </label>
                        <input id="targetRepsMin" name="targetRepsMin" type="number" min="1" step="1" placeholder="8" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3" />
                      </div>
                      <div>
                        <label htmlFor="targetRepsMax" className="mb-2 block text-sm font-medium">
                          Maximum reps
                        </label>
                        <input id="targetRepsMax" name="targetRepsMax" type="number" min="1" step="1" placeholder="12" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3" />
                      </div>
                    </div>

                    <button type="submit" className="w-full rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-300">
                      Add to template
                    </button>
                  </form>
                ) : (
                  <p className="mt-5 text-sm text-slate-400">
                    No active exercises are available. Check the exercise catalog first.
                  </p>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold">Routine exercises</h2>
                  <span className="text-sm text-slate-400">
                    {items?.length ?? 0} exercises
                  </span>
                </div>

                {items && items.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {items.map((item, index) => {
                      const exercise = exercises?.find(
                        (catalogExercise) => catalogExercise.id === item.exercise_id,
                      );

                      return (
                        <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                                Exercise {index + 1}
                              </p>
                              <h3 className="mt-1 text-lg font-semibold">
                                {exercise?.name ?? "Exercise"}
                              </h3>
                              <p className="mt-1 text-sm text-slate-400">
                                {exercise?.category ? label(exercise.category) : ""}
                                {exercise?.equipment ? ` · ${label(exercise.equipment)}` : ""}
                              </p>
                            </div>

                            <div className="flex gap-1">
                              <form action={moveTemplateExercise}>
                                <input type="hidden" name="templateId" value={id} />
                                <input type="hidden" name="itemId" value={item.id} />
                                <input type="hidden" name="direction" value="up" />
                                <button type="submit" disabled={index === 0} aria-label="Move exercise up" className="rounded-md border border-slate-700 px-3 py-2 text-sm enabled:hover:bg-slate-800 disabled:opacity-30">
                                  ↑
                                </button>
                              </form>
                              <form action={moveTemplateExercise}>
                                <input type="hidden" name="templateId" value={id} />
                                <input type="hidden" name="itemId" value={item.id} />
                                <input type="hidden" name="direction" value="down" />
                                <button type="submit" disabled={index === items.length - 1} aria-label="Move exercise down" className="rounded-md border border-slate-700 px-3 py-2 text-sm enabled:hover:bg-slate-800 disabled:opacity-30">
                                  ↓
                                </button>
                              </form>
                            </div>
                          </div>

                          <form action={updateTemplateExercise} className="mt-5 grid grid-cols-2 gap-3">
                            <input type="hidden" name="templateId" value={id} />
                            <input type="hidden" name="itemId" value={item.id} />

                            <div>
                              <label htmlFor={`sets-${item.id}`} className="mb-1 block text-xs text-slate-400">
                                Target sets
                              </label>
                              <input id={`sets-${item.id}`} name="targetSets" type="number" min="1" step="1" defaultValue={item.target_sets ?? ""} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                            </div>

                            <div>
                              <label htmlFor={`weight-${item.id}`} className="mb-1 block text-xs text-slate-400">
                                Target weight (kg)
                              </label>
                              <input id={`weight-${item.id}`} name="targetWeightKg" type="number" min="0" step="0.01" defaultValue={item.target_weight_kg ?? ""} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                            </div>

                            <div>
                              <label htmlFor={`min-${item.id}`} className="mb-1 block text-xs text-slate-400">
                                Minimum reps
                              </label>
                              <input id={`min-${item.id}`} name="targetRepsMin" type="number" min="1" step="1" defaultValue={item.target_reps_min ?? ""} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                            </div>

                            <div>
                              <label htmlFor={`max-${item.id}`} className="mb-1 block text-xs text-slate-400">
                                Maximum reps
                              </label>
                              <input id={`max-${item.id}`} name="targetRepsMax" type="number" min="1" step="1" defaultValue={item.target_reps_max ?? ""} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                            </div>

                            <button type="submit" className="col-span-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800">
                              Save targets
                            </button>
                          </form>

                          <form action={removeTemplateExercise} className="mt-3">
                            <input type="hidden" name="templateId" value={id} />
                            <input type="hidden" name="itemId" value={item.id} />
                            <button type="submit" className="text-sm text-red-300 hover:text-red-200">
                              Remove exercise
                            </button>
                          </form>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
                    <h3 className="font-semibold">Your routine is empty</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Add your first exercise using the form. You can configure its targets and order afterward.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
