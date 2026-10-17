
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createRun } from "./actions";

type Run = {
  id: string;
  started_at: string;
  distance_m: number;
  duration_seconds: number;
  run_type: string;
  notes: string | null;
};

type SearchParams = Promise<{
  saved?: string;
  error?: string;
}>;

type RunsPageProps = {
  searchParams: SearchParams;
};

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function formatPace(distanceM: number, durationSeconds: number) {
  if (distanceM <= 0) return "—";

  const paceSeconds = Math.round(durationSeconds / (distanceM / 1000));
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = paceSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")} min/km`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const errorMessages: Record<string, string> = {
  invalid_date: "Please enter a valid run date.",
  invalid_distance: "Distance must be greater than 0 and no more than 500 km.",
  invalid_duration: "Please enter a valid duration greater than 0.",
  invalid_type: "Please select a valid run type.",
  invalid_notes: "Notes must be 1,000 characters or fewer.",
  save_failed: "The run could not be saved. Please try again.",
};

export default function RunsPage({
  searchParams,
}: RunsPageProps) {
  return (
    <Suspense fallback={<RunsFallback />}>
      <RunsContent searchParams={searchParams} />
    </Suspense>
  );
}

function RunsFallback() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Dashboard
        </Link>
      </header>
      <section aria-busy="true">
        <h1 className="text-3xl font-bold">Running</h1>
        <p role="status" className="mt-2 text-gray-600">
          Loading your running history...
        </p>
      </section>
    </main>
  );
}

async function RunsContent({ searchParams }: RunsPageProps) {
  await connection();

  const params = await searchParams;
  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("runs")
    .select(
      "id, started_at, distance_m, duration_seconds, run_type, notes",
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  const runs = (data ?? []) as Run[];

  const totalDistance = runs.reduce(
    (total, run) => total + run.distance_m,
    0,
  );

  const totalDuration = runs.reduce(
    (total, run) => total + run.duration_seconds,
    0,
  );

  const totalKm = totalDistance / 1000;
  const averagePace =
    totalDistance > 0
      ? formatPace(totalDistance, totalDuration)
      : "—";

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Running</h1>
          <p className="mt-2 text-gray-600">
            Log your runs and track your progress.
          </p>
        </div>
      </header>

      {params.saved === "1" && (
        <p
          role="status"
          className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-800"
        >
          Run saved successfully.
        </p>
      )}

      {params.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800"
        >
          {errorMessages[params.error] ??
            "Something went wrong. Please try again."}
        </p>
      )}

      {error && (
        <p role="alert" className="text-red-700">
          Unable to load your running history. Please refresh the page.
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total distance</p>
          <p className="mt-2 text-2xl font-bold">
            {totalKm.toFixed(2)} km
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total runs</p>
          <p className="mt-2 text-2xl font-bold">{runs.length}</p>
        </div>

        <div className="rounded-xl border p-5">
          <p className="text-sm text-gray-500">Average pace</p>
          <p className="mt-2 text-2xl font-bold">{averagePace}</p>
          <p className="mt-1 text-xs text-gray-500">
            Across all logged runs
          </p>
        </div>
      </section>

      <section className="rounded-xl border p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Log a run</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter your distance and total running time.
        </p>

        <form action={createRun} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Run date
              <input
                type="date"
                name="startedDate"
                defaultValue={new Date().toLocaleDateString("en-CA", {
                  timeZone: "Asia/Kolkata",
                })}
                required
                className="mt-1 block w-full rounded-lg border p-3"
              />
            </label>

            <label className="block text-sm font-medium">
              Run type
              <select
                name="runType"
                defaultValue="easy"
                required
                className="mt-1 block w-full rounded-lg border p-3"
              >
                <option value="easy">Easy run</option>
                <option value="long">Long run</option>
                <option value="tempo">Tempo run</option>
                <option value="interval">Interval training</option>
                <option value="race">Race</option>
                <option value="recovery">Recovery run</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Distance (km)
              <input
                type="number"
                name="distanceKm"
                min="0.01"
                max="500"
                step="0.01"
                placeholder="e.g. 5.00"
                required
                className="mt-1 block w-full rounded-lg border p-3"
              />
            </label>

            <label className="block text-sm font-medium">
              Duration (minutes)
              <input
                type="number"
                name="durationMinutes"
                min="0.01"
                step="0.01"
                placeholder="e.g. 30"
                required
                className="mt-1 block w-full rounded-lg border p-3"
              />
            </label>
          </div>

          <label className="block text-sm font-medium">
            Notes (optional)
            <textarea
              name="notes"
              maxLength={1000}
              rows={3}
              placeholder="Route, effort, weather, or how you felt..."
              className="mt-1 block w-full rounded-lg border p-3"
            />
          </label>

          <button
            type="submit"
            className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
          >
            Save run
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Running history</h2>

        {runs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">No runs logged yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Your running history and statistics will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <article
                key={run.id}
                className="rounded-xl border p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold capitalize">
                      {run.run_type} run
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(run.started_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {(run.distance_m / 1000).toFixed(2)} km
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDuration(run.duration_seconds)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <p>
                    <span className="text-gray-500">Pace: </span>
                    <span className="font-medium">
                      {formatPace(
                        run.distance_m,
                        run.duration_seconds,
                      )}
                    </span>
                  </p>
                </div>

                {run.notes && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                    {run.notes}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
