
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

const categories = [
  "all",
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "core",
  "cardio",
  "full_body",
  "other",
] as const;

type ExercisesPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function ExercisesPage({
  searchParams,
}: ExercisesPageProps) {
  return (
    <Suspense fallback={<ExercisesFallback />}>
      <ExercisesContent searchParams={searchParams} />
    </Suspense>
  );
}

function ExercisesFallback() {
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
            Strength training
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Exercise library
          </h1>
          <p role="status" className="mt-3 text-slate-400">
            Loading exercises...
          </p>
        </section>
      </div>
    </main>
  );
}

async function ExercisesContent({
  searchParams,
}: ExercisesPageProps) {
  await connection();

  const params = await searchParams;
  const search = (params.q ?? "").trim().slice(0, 100);
  const requestedCategory = params.category ?? "all";

  const category = categories.includes(
    requestedCategory as (typeof categories)[number],
  )
    ? requestedCategory
    : "all";

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/login");
  }

  let query = supabase
    .from("exercises")
    .select("id, name, category, equipment, instructions")
    .eq("is_active", true);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  if (category !== "all") {
    query = query.eq("category", category);
  }

  const { data: exercises, error } = await query.order("name");

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <Link href="/dashboard" className="text-2xl font-bold tracking-tight">
            FitOS<span className="text-emerald-400">.</span>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Strength training
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Exercise library
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-400">
            Browse your exercise catalog and find the movements you want to
            include in your training plans.
          </p>

          <form
            action="/exercises"
            method="get"
            className="mt-8 grid gap-3 sm:grid-cols-[1fr_220px_auto]"
          >
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search exercises..."
              aria-label="Search exercises"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <select
              name="category"
              defaultValue={category}
              aria-label="Filter by category"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All categories" : formatLabel(item)}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Search
            </button>
          </form>

          {error ? (
            <div
              role="alert"
              className="mt-8 rounded-xl border border-red-900 bg-red-950/40 p-6"
            >
              <h2 className="font-semibold text-red-300">
                Couldn&apos;t load exercises
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Check your connection and try again. If the problem continues,
                check the server logs.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Available exercises</h2>
                <p className="text-sm text-slate-400">
                  {exercises?.length ?? 0} found
                </p>
              </div>

              {exercises && exercises.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {exercises.map((exercise) => (
                    <article
                      key={exercise.id}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold leading-6">
                          {exercise.name}
                        </h3>

                        <span className="shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-emerald-300">
                          {formatLabel(exercise.category)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-400">
                        Equipment:{" "}
                        {exercise.equipment
                          ? formatLabel(exercise.equipment)
                          : "Not specified"}
                      </p>

                      {exercise.instructions && (
                        <p className="mt-3 text-sm leading-6 text-slate-400">
                          {exercise.instructions}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                  <h3 className="font-semibold">No exercises found</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Try another name or select a different category.
                  </p>
                  <Link
                    href="/exercises"
                    className="mt-4 inline-block text-sm font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Clear filters
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
