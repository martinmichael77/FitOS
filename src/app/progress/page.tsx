import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ChartCard, ExerciseProgressChart } from "@/components/ProgressCharts";

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

type SearchParams = Promise<{ week?: string }>;

function dateKey(value: string) {
  return value.slice(0, 10);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mondayOfWeek(date: Date) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (result.getUTCDay() + 6) % 7;
  result.setUTCDate(result.getUTCDate() - day);
  return result;
}

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
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRange(start: string, end: string) {
  const first = new Date(`${start}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const last = new Date(`${end}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${first} – ${last}`;
}

export default function ProgressPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<ProgressFallback />}>
      <ProgressContent searchParams={searchParams} />
    </Suspense>
  );
}

function ProgressFallback() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header><Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">Dashboard</Link></header>
        <section aria-busy="true">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">Your training</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Progress</h1>
          <p role="status" className="mt-2 text-slate-400">Loading your training progress...</p>
        </section>
      </div>
    </main>
  );
}

async function ProgressContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (authError || typeof userId !== "string") redirect("/login");

  const [sessionsResult, runsResult] = await Promise.all([
    supabase.from("workout_sessions").select("id, name, status, started_at, completed_at").eq("user_id", userId).order("started_at", { ascending: false }),
    supabase.from("runs").select("id, started_at, distance_m, duration_seconds, run_type").eq("user_id", userId).order("started_at", { ascending: false }),
  ]);

  const sessions = (sessionsResult.data ?? []) as WorkoutSession[];
  const runs = (runsResult.data ?? []) as Run[];
  const completedSessions = sessions.filter((session) => session.status === "completed");
  const totalDistance = runs.reduce((sum, run) => sum + run.distance_m, 0);
  const totalRunSeconds = runs.reduce((sum, run) => sum + run.duration_seconds, 0);

  // Use ISO date keys for week grouping so records are consistently grouped by their logged calendar date.
  const today = new Date();
  const currentWeekStart = mondayOfWeek(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  const requestedWeek = params.week ?? isoDate(currentWeekStart);
  const isValidWeek = /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek) &&
    isoDate(mondayOfWeek(new Date(`${requestedWeek}T12:00:00Z`))) === requestedWeek;
  const weekStart = isValidWeek ? new Date(`${requestedWeek}T00:00:00Z`) : currentWeekStart;
  const weekStartKey = isoDate(weekStart);
  const weekEnd = addDays(weekStart, 6);
  const weekEndKey = isoDate(weekEnd);
  const nextWeekKey = isoDate(addDays(weekStart, 7));
  const previousWeekKey = isoDate(addDays(weekStart, -7));
  const isCurrentWeek = weekStartKey === isoDate(currentWeekStart);

  const isInSelectedWeek = (date: string) => {
    const key = dateKey(date);
    return key >= weekStartKey && key <= weekEndKey;
  };

  const weeklySessions = sessions.filter((session) => isInSelectedWeek(session.started_at));
  const weeklyCompletedSessions = weeklySessions.filter((session) => session.status === "completed");
  const weeklyRuns = runs.filter((run) => isInSelectedWeek(run.started_at));
  const weeklyDistance = weeklyRuns.reduce((sum, run) => sum + run.distance_m, 0);
  const weeklyRunSeconds = weeklyRuns.reduce((sum, run) => sum + run.duration_seconds, 0);
  const weeklySetCounts = await supabase
    .from("session_exercises")
    .select("id, session_id, workout_sets(id)")
    .eq("user_id", userId)
    .in("session_id", weeklyCompletedSessions.map((session) => session.id));
  const weeklySets = (weeklySetCounts.data ?? []).reduce((sum, exercise) => {
    const sets = (exercise.workout_sets as unknown as { id: string }[] | null) ?? [];
    return sum + sets.length;
  }, 0);

  const exerciseDetailsResult = await supabase
    .from("session_exercises")
    .select("id, session_id, exercise_name, workout_sets(id, reps, weight_kg)")
    .eq("user_id", userId);

  type SetDetail = { id: string; reps: number | null; weight_kg: number | null };
  type ExerciseDetail = { id: string; session_id: string; exercise_name: string; workout_sets: SetDetail[] | null };
  const exerciseDetails = (exerciseDetailsResult.data ?? []) as unknown as ExerciseDetail[];
  const completedSessionIds = new Set(completedSessions.map((session) => session.id));
  const sessionDateById = new Map(completedSessions.map((session) => [session.id, dateKey(session.started_at)]));
  const weeklyVolumeByStart = new Map<string, number>();
  const weeklyWorkoutsByStart = new Map<string, number>();
  const weeklyRunDistanceByStart = new Map<string, number>();
  const weekStarts = Array.from({ length: 8 }, (_, index) => isoDate(addDays(currentWeekStart, -7 * (7 - index))));
  for (const start of weekStarts) {
    weeklyVolumeByStart.set(start, 0);
    weeklyWorkoutsByStart.set(start, 0);
    weeklyRunDistanceByStart.set(start, 0);
  }
  for (const session of completedSessions) {
    const start = isoDate(mondayOfWeek(new Date(`${dateKey(session.started_at)}T12:00:00Z`)));
    if (weeklyWorkoutsByStart.has(start)) weeklyWorkoutsByStart.set(start, (weeklyWorkoutsByStart.get(start) ?? 0) + 1);
  }
  const exerciseRowsById = new Map(exerciseDetails.map((exercise) => [exercise.id, exercise]));
  for (const exercise of exerciseDetails) {
    if (!completedSessionIds.has(exercise.session_id)) continue;
    const sessionDate = sessionDateById.get(exercise.session_id);
    if (!sessionDate) continue;
    const start = isoDate(mondayOfWeek(new Date(`${sessionDate}T12:00:00Z`)));
    if (!weeklyVolumeByStart.has(start)) continue;
    const volume = (exercise.workout_sets ?? []).reduce((sum, set) => {
      const weight = Number(set.weight_kg ?? 0);
      const reps = Number(set.reps ?? 0);
      return sum + (Number.isFinite(weight) && Number.isFinite(reps) ? weight * reps : 0);
    }, 0);
    weeklyVolumeByStart.set(start, (weeklyVolumeByStart.get(start) ?? 0) + volume);
  }
  for (const run of runs) {
    const start = isoDate(mondayOfWeek(new Date(`${dateKey(run.started_at)}T12:00:00Z`)));
    if (weeklyRunDistanceByStart.has(start)) weeklyRunDistanceByStart.set(start, (weeklyRunDistanceByStart.get(start) ?? 0) + run.distance_m / 1000);
  }
  const weeklyLabels = weekStarts.map((start) => new Date(`${start}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }));
  const workoutTrendPoints = weekStarts.map((start, index) => ({ label: weeklyLabels[index], value: weeklyWorkoutsByStart.get(start) ?? 0 }));
  const volumeTrendPoints = weekStarts.map((start, index) => ({ label: weeklyLabels[index], value: Math.round(weeklyVolumeByStart.get(start) ?? 0) }));
  const runTrendPoints = weekStarts.map((start, index) => ({ label: weeklyLabels[index], value: Number((weeklyRunDistanceByStart.get(start) ?? 0).toFixed(1)) }));

  const strengthByExercise = new Map<string, Map<string, number>>();
  for (const exercise of exerciseDetails) {
    if (!completedSessionIds.has(exercise.session_id)) continue;
    const sessionDate = sessionDateById.get(exercise.session_id);
    if (!sessionDate) continue;
    const start = isoDate(mondayOfWeek(new Date(`${sessionDate}T12:00:00Z`)));
    if (!weekStarts.includes(start)) continue;
    for (const set of exercise.workout_sets ?? []) {
      const weight = Number(set.weight_kg ?? 0);
      if (!Number.isFinite(weight) || weight <= 0) continue;
      if (!strengthByExercise.has(exercise.exercise_name)) strengthByExercise.set(exercise.exercise_name, new Map());
      const weeklyBest = strengthByExercise.get(exercise.exercise_name)!;
      weeklyBest.set(start, Math.max(weeklyBest.get(start) ?? 0, weight));
    }
  }
  const strengthTrends = [...strengthByExercise.entries()]
    .map(([name, values]) => ({
      name,
      points: weekStarts.map((start, index) => ({ label: weeklyLabels[index], value: values.get(start) ?? 0 })),
      latest: Math.max(...values.values()),
    }))
    .sort((a, b) => b.latest - a.latest)
    .slice(0, 12)
    .map(({ name, points }) => ({ name, points }));

  const personalRecords = [...strengthByExercise.entries()]
    .map(([name, values]) => ({ name, weight: Math.max(...values.values()) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  const weekOptions = Array.from({ length: 12 }, (_, index) => {
    const start = addDays(currentWeekStart, -7 * index);
    const end = addDays(start, 6);
    return { start: isoDate(start), end: isoDate(end), label: `Week of ${formatDate(isoDate(start))}` };
  });
  if (!weekOptions.some((week) => week.start === weekStartKey)) {
    weekOptions.push({ start: weekStartKey, end: weekEndKey, label: `Week of ${formatDate(weekStartKey)}` });
    weekOptions.sort((a, b) => b.start.localeCompare(a.start));
  }

  const activities = [
    ...weeklySessions.map((session) => ({
      id: session.id,
      title: session.name,
      type: "Strength",
      date: session.started_at,
      detail: session.status === "completed" && session.completed_at
        ? formatDuration(Math.max(0, Math.floor((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000)))
        : session.status.replace("_", " "),
    })),
    ...weeklyRuns.map((run) => ({
      id: run.id,
      title: `${(run.distance_m / 1000).toFixed(2)} km run`,
      type: "Running",
      date: run.started_at,
      detail: `${formatDuration(run.duration_seconds)} · ${formatPace(run.distance_m, run.duration_seconds)}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">← Dashboard</Link>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Progress</h1>
            <p className="mt-2 text-slate-400">Review training by week or switch to your all-time totals.</p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link href="/workout-history" className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-900">Workout history</Link>
            <Link href="/runs" className="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-300">Log a run</Link>
          </nav>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">Weekly view</p>
              <h2 className="mt-1 text-2xl font-semibold">{formatRange(weekStartKey, weekEndKey)}</h2>
              <p className="mt-1 text-sm text-slate-400">{isCurrentWeek ? "Current week · Monday to Sunday" : "Selected week · Monday to Sunday"}</p>
            </div>
            <form action="/progress" method="get" className="flex flex-wrap items-center gap-2">
              <label htmlFor="week" className="sr-only">Select week</label>
              <select id="week" name="week" defaultValue={weekStartKey} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                {weekOptions.map((week) => <option key={week.start} value={week.start}>{week.label}</option>)}
              </select>
              <button type="submit" className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300">View week</button>
            </form>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/progress?week=${previousWeekKey}`} className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">← Previous week</Link>
            <Link href={`/progress?week=${nextWeekKey}`} className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">Next week →</Link>
            <Link href="/progress" className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">This week</Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Completed workouts", value: String(weeklyCompletedSessions.length), note: `${weeklySessions.filter((session) => session.status === "in_progress").length} in progress` },
            { label: "Sets completed", value: String(weeklySets), note: "Across completed workouts" },
            { label: "Runs completed", value: String(weeklyRuns.length), note: "Logged running sessions" },
            { label: "Running distance", value: `${(weeklyDistance / 1000).toFixed(2)} km`, note: weeklyDistance > 0 ? `Average pace ${formatPace(weeklyDistance, weeklyRunSeconds)}` : "No distance logged this week" },
          ].map((metric) => (
            <article key={metric.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{metric.label}</p>
              <p className="mt-3 text-2xl font-bold">{metric.value}</p>
              <p className="mt-2 text-xs text-slate-500">{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Training trends</h2>
            <p className="mt-1 text-sm text-slate-400">Last 8 weeks · use these charts to spot consistency and progression.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Workouts per week" subtitle="Completed strength sessions" points={workoutTrendPoints} />
            <ChartCard title="Running distance" subtitle="Kilometres completed each week" points={runTrendPoints} suffix=" km" />
            <div className="lg:col-span-2">
              <ChartCard title="Strength training volume" subtitle="Estimated workload: sum of weight × reps across completed sets (kg-reps)" points={volumeTrendPoints} suffix="" />
            </div>
          </div>
          <ExerciseProgressChart trends={strengthTrends} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Personal bests</h2>
            <span className="text-sm text-slate-400">Highest recorded weight per exercise</span>
          </div>
          {personalRecords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Record completed workouts with working weights to build your personal-best list.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {personalRecords.map((record) => (
                <article key={record.name} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">{record.name}</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-300">{record.weight} kg</p>
                  <p className="mt-1 text-xs text-slate-500">Best recorded set weight</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Activity for this week</h2>
            <span className="text-sm text-slate-400">{activities.length} activities</span>
          </div>
          {activities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900 p-8 text-center">
              <p className="font-medium">No activity logged for this week</p>
              <p className="mt-2 text-sm text-slate-400">Choose another week above or log a workout or run to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <article key={`${activity.type}-${activity.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{activity.type} · {formatDate(activity.date)}</p>
                  </div>
                  <p className="text-sm capitalize text-slate-300">{activity.detail}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">All-time overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Completed workouts", value: String(completedSessions.length), note: `${sessions.filter((session) => session.status === "in_progress").length} in progress` },
              { label: "Total runs", value: String(runs.length), note: "Logged running sessions" },
              { label: "Distance covered", value: `${(totalDistance / 1000).toFixed(2)} km`, note: "Across all logged runs" },
              { label: "Average running pace", value: formatPace(totalDistance, totalRunSeconds), note: "Minutes per kilometre" },
            ].map((metric) => (
              <article key={metric.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">{metric.label}</p>
                <p className="mt-3 text-2xl font-bold">{metric.value}</p>
                <p className="mt-2 text-xs text-slate-500">{metric.note}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
