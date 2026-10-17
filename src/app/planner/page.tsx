
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import ConfirmDeleteForm from "@/components/ConfirmDeleteForm";
import { createClient } from "@/lib/supabase/server";
import { startWorkout } from "@/app/workout-sessions/actions";
import {
  createPlannedActivity,
  updatePlannedActivityStatus,
  deletePlannedActivity,
} from "./actions";

type Template = {
  id: string;
  name: string;
};

type Activity = {
  id: string;
  activity_type: string;
  title: string;
  scheduled_for: string;
  status: string;
  template_id: string | null;
  target_distance_m: number | null;
  target_duration_seconds: number | null;
  notes: string | null;
};

type SearchParams = Promise<{
  saved?: string;
  error?: string;
}>;

type PlannerPageProps = {
  searchParams: SearchParams;
};

const errorMessages: Record<string, string> = {
  invalid_type: "Please select Strength or Run.",
  invalid_title: "Enter a title of up to 120 characters.",
  invalid_date: "Please enter a valid scheduled date and time.",
  invalid_notes: "Notes must be 1,000 characters or fewer.",
  invalid_template: "Choose one of your active workout templates.",
  invalid_distance: "Run distance must be greater than 0 and no more than 500 km.",
  invalid_duration: "Enter a valid target duration.",
  save_failed: "Could not schedule the activity. Please try again.",
  invalid_update: "The requested status update is invalid.",
  update_failed: "Could not update this activity. Please try again.",
  delete_failed: "Could not delete this planned activity. Please try again.",
};

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}

export default function PlannerPage({
  searchParams,
}: PlannerPageProps) {
  return (
    <Suspense fallback={<PlannerFallback />}>
      <PlannerContent searchParams={searchParams} />
    </Suspense>
  );
}

function PlannerFallback() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Training Planner</h1>
        <p role="status" className="mt-2 text-gray-600">
          Loading your schedule...
        </p>
      </header>
    </main>
  );
}

async function PlannerContent({ searchParams }: PlannerPageProps) {
  await connection();

  const params = await searchParams;
  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const [templateResult, activityResult] = await Promise.all([
    supabase
      .from("workout_templates")
      .select("id, name")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("name"),

    supabase
      .from("planned_activities")
      .select(
        "id, activity_type, title, scheduled_for, status, template_id, target_distance_m, target_duration_seconds, notes",
      )
      .eq("user_id", userId)
      .order("scheduled_for", { ascending: true }),
  ]);

  const templates = (templateResult.data ?? []) as Template[];
  const activities = (activityResult.data ?? []) as Activity[];

  const queryError = templateResult.error || activityResult.error;

  const plannedCount = activities.filter(
    (activity) => activity.status === "planned",
  ).length;

  const completedCount = activities.filter(
    (activity) => activity.status === "completed",
  ).length;

  const skippedCount = activities.filter(
    (activity) => activity.status === "skipped",
  ).length;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Training Planner</h1>
        <p className="mt-2 text-gray-600">
          Schedule strength sessions and runs, then track your progress.
        </p>
      </header>

      {params.saved === "1" && (
        <p
          role="status"
          className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-800"
        >
          Planner updated successfully.
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

      {queryError && (
        <p role="alert" className="text-red-700">
          Could not load all planner data. Refresh the page to try again.
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5">
          <p className="text-sm text-gray-500">Planned</p>
          <p className="mt-2 text-2xl font-bold">{plannedCount}</p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="mt-2 text-2xl font-bold">{completedCount}</p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-gray-500">Skipped</p>
          <p className="mt-2 text-2xl font-bold">{skippedCount}</p>
        </div>
      </section>

      <section className="rounded-xl border p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Schedule an activity</h2>

        <form action={createPlannedActivity} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Activity type
              <select
                name="activityType"
                defaultValue="strength"
                required
                className="mt-1 block w-full rounded-lg border p-3"
              >
                <option value="strength">Strength workout</option>
                <option value="run">Run</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Title
              <input
                type="text"
                name="title"
                maxLength={120}
                placeholder="e.g. Push Day or Easy Run"
                required
                className="mt-1 block w-full rounded-lg border p-3"
              />
            </label>

           
            <label className="block text-sm font-medium">
            Scheduled date
            <input
                type="date"
                name="scheduledDate"
                required
                defaultValue={new Date().toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata",
                })}
                className="mt-1 block w-full rounded-lg border p-3"
            />
            </label>

            <label className="block text-sm font-medium">
            Scheduled time
            <input
                type="time"
                name="scheduledTime"
                required
                defaultValue="06:00"
                className="mt-1 block w-full rounded-lg border p-3"
            />
            </label>


            <label className="block text-sm font-medium sm:col-span-2">
              Workout template
              <select
                name="templateId"
                defaultValue=""
                className="mt-1 block w-full rounded-lg border p-3"
              >
                <option value="">Select a template (required for strength)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-gray-500">
                Select a template for strength workouts. Leave blank for runs.
              </span>
            </label>

            <label className="block text-sm font-medium">
              Target distance (km, optional)
              <input
                type="number"
                name="targetDistanceKm"
                min="0.01"
                max="500"
                step="0.01"
                placeholder="e.g. 5"
                className="mt-1 block w-full rounded-lg border p-3"
              />
            </label>

            <label className="block text-sm font-medium">
              Target duration (minutes, optional)
              <input
                type="number"
                name="targetDurationMinutes"
                min="0.01"
                step="0.01"
                placeholder="e.g. 30"
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
              placeholder="Training focus or reminders..."
              className="mt-1 block w-full rounded-lg border p-3"
            />
          </label>

          <button
            type="submit"
            className="rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800"
          >
            Schedule activity
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Your schedule</h2>

        {activities.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">Nothing scheduled yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Use the form above to plan your next workout or run.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <article
                key={activity.id}
                className="rounded-xl border p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {activity.activity_type === "strength"
                        ? "Strength"
                        : "Running"}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {activity.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(activity.scheduled_for)}
                    </p>
                  </div>

                  <span className="rounded-full border px-3 py-1 text-sm capitalize">
                    {activity.status}
                  </span>
                </div>

                {(activity.target_distance_m !== null ||
                  activity.target_duration_seconds !== null) && (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    {activity.target_distance_m !== null && (
                      <p>
                        <span className="text-gray-500">Distance: </span>
                        {(activity.target_distance_m / 1000).toFixed(2)} km
                      </p>
                    )}
                    {activity.target_duration_seconds !== null && (
                      <p>
                        <span className="text-gray-500">Duration: </span>
                        {formatDuration(activity.target_duration_seconds)}
                      </p>
                    )}
                  </div>
                )}

                {activity.notes && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                    {activity.notes}
                  </p>
                )}

                {activity.status === "planned" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {activity.activity_type === "strength" &&
                      activity.template_id && (
                        <form action={startWorkout}>
                          <input
                            type="hidden"
                            name="templateId"
                            value={activity.template_id}
                          />
                          <input
                            type="hidden"
                            name="plannedActivityId"
                            value={activity.id}
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                          >
                            Start workout
                          </button>
                        </form>
                      )}

                    {activity.activity_type === "run" && (
                      <Link
                        href={`/runs?plannedActivityId=${activity.id}`}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
                      >
                        Log run
                      </Link>
                    )}

                    <form action={updatePlannedActivityStatus}>
                      <input
                        type="hidden"
                        name="activityId"
                        value={activity.id}
                      />
                      <input
                        type="hidden"
                        name="status"
                        value="completed"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                      >
                        Mark completed
                      </button>
                    </form>

                    <form action={updatePlannedActivityStatus}>
                      <input
                        type="hidden"
                        name="activityId"
                        value={activity.id}
                      />
                      <input
                        type="hidden"
                        name="status"
                        value="skipped"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Skip
                      </button>
                    </form>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <ConfirmDeleteForm
                    action={deletePlannedActivity}
                    fieldName="activityId"
                    fieldValue={activity.id}
                    confirmationMessage={`Delete "${activity.title}" from your planner? Any linked workout or run will be preserved.`}
                    buttonLabel="Delete activity"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
