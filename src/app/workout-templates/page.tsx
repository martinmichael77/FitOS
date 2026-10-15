
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createWorkoutTemplate } from "./actions";

type PageProps = {
  searchParams: Promise<{
    created?: string;
    error?: string;
  }>;
};

export default function WorkoutTemplatesPage({
  searchParams,
}: PageProps) {
  return (
    <Suspense fallback={<WorkoutTemplatesFallback />}>
      <WorkoutTemplatesContent searchParams={searchParams} />
    </Suspense>
  );
}

function WorkoutTemplatesFallback() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-slate-800 pb-6">
          <Link href="/dashboard" className="text-2xl font-bold tracking-tight">
            FitOS<span className="text-emerald-400">.</span>
          </Link>
        </header>
        <section className="py-10" aria-busy="true">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Strength training
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Workout templates
          </h1>
          <p role="status" className="mt-3 text-slate-400">
            Loading templates...
          </p>
        </section>
      </div>
    </main>
  );
}

async function WorkoutTemplatesContent({
  searchParams,
}: PageProps) {
  await connection();

  const params = await searchParams;
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  const userId = authData?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: templates, error } = await supabase
    .from("workout_templates")
    .select("id, name, description, created_at")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <Link
            href="/dashboard"
            className="text-2xl font-bold tracking-tight"
          >
            FitOS<span className="text-emerald-400">.</span>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Dashboard
          </Link>
        </header>

        <section className="py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Strength training
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Workout templates
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            Create reusable routines for your training sessions.
          </p>

          {params.created === "1" && (
            <p
              role="status"
              className="mt-6 rounded-lg border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-300"
            >
              Workout template created successfully.
            </p>
          )}

          {params.error && (
            <p
              role="alert"
              className="mt-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300"
            >
              {params.error === "invalid"
                ? "Enter a valid name (up to 100 characters) and description (up to 1,000 characters)."
                : "The template could not be created. Please try again."}
            </p>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">
                Create a template
              </h2>

              <form action={createWorkoutTemplate} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium"
                  >
                    Workout name
                  </label>

                  <input
                    id="name"
                    name="name"
                    required
                    maxLength={100}
                    placeholder="e.g. Push Day"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-medium"
                  >
                    Description
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    maxLength={1000}
                    rows={4}
                    placeholder="Optional notes about this routine..."
                    className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
                >
                  Create template
                </button>
              </form>
            </section>

            <section>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Your templates</h2>
                <span className="text-sm text-slate-400">
                  {templates?.length ?? 0} saved
                </span>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-5 text-sm text-red-300"
                >
                  Could not load templates. Check the server logs and try again.
                </div>
              ) : templates && templates.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {templates.map((template) => (
                    <article
                      key={template.id}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                    >
                      <h3 className="font-semibold">{template.name}</h3>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                        {template.description || "No description added."}
                      </p>

                      <p className="mt-3 text-xs text-slate-500">
                        Created{" "}
                        {new Date(template.created_at).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </p>

                      <Link
                        href={`/workout-templates/${template.id}`}
                        className="mt-4 inline-flex rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
                      >
                        Edit exercises
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
                  <h3 className="font-semibold">No templates yet</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Create your first routine using the form. You will be able
                    to add exercises and target sets and reps next.
                  </p>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
