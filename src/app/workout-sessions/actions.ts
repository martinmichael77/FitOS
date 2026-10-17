"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );

export async function startWorkout(formData: FormData) {
  const templateId = formData.get("templateId");

  if (typeof templateId !== "string" || !isUuid(templateId)) {
    redirect("/workout-templates?error=invalid");
  }

  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: template, error: templateError } = await supabase
    .from("workout_templates")
    .select("id, name")
    .eq("id", templateId)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .maybeSingle();

  if (templateError || !template) {
    redirect("/workout-templates?error=notfound");
  }

  const { data: plannedExercises, error: exercisesError } = await supabase
    .from("template_exercises")
    .select(
      "exercise_id, sort_order, target_sets, target_reps_min, target_reps_max, target_weight_kg",
    )
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (exercisesError) {
    console.error("Could not load template exercises:", exercisesError.message);
    redirect(`/workout-templates/${templateId}?error=save`);
  }

  if (!plannedExercises || plannedExercises.length === 0) {
    redirect(`/workout-templates/${templateId}?error=empty`);
  }

  const { data: exercises, error: exerciseNamesError } = await supabase
    .from("exercises")
    .select("id, name")
    .in(
      "id",
      plannedExercises.map((item) => item.exercise_id),
    );

  if (exerciseNamesError || !exercises) {
    console.error(
      "Could not load exercise names:",
      exerciseNamesError?.message,
    );
    redirect(`/workout-templates/${templateId}?error=save`);
  }

  const exerciseNameById = new Map(
    exercises.map((exercise) => [exercise.id, exercise.name] as const),
  );

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      template_id: templateId,
      name: template.name,
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("Could not start workout:", sessionError?.message);
    redirect(`/workout-templates/${templateId}?error=save`);
  }

  const sessionExercises = plannedExercises.map((item) => ({
    user_id: userId,
    session_id: session.id,
    exercise_id: item.exercise_id,
    exercise_name: exerciseNameById.get(item.exercise_id) ?? "Exercise",
    sort_order: item.sort_order,
    target_sets: item.target_sets,
    target_reps_min: item.target_reps_min,
    target_reps_max: item.target_reps_max,
    target_weight_kg: item.target_weight_kg,
  }));

  const { error: copyError } = await supabase
    .from("session_exercises")
    .insert(sessionExercises);

  if (copyError) {
    console.error("Could not copy session exercises:", copyError.message);

    await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", session.id)
      .eq("user_id", userId);

    redirect(`/workout-templates/${templateId}?error=save`);
  }

  redirect(`/workout-sessions/${session.id}`);
}

export async function saveWorkoutSet(formData: FormData) {
  const { redirect } = await import("next/navigation");
  const { createClient } = await import("@/lib/supabase/server");

  const sessionId = formData.get("sessionId");
  const sessionExerciseId = formData.get("sessionExerciseId");
  const setNumber = Number(formData.get("setNumber"));
  const repsValue = formData.get("reps");
  const weightValue = formData.get("weightKg");
  const rpeValue = formData.get("rpe");
  const notesValue = formData.get("notes");

  const isUuid = (value: unknown): value is string =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );

  if (
    !isUuid(sessionId) ||
    !isUuid(sessionExerciseId) ||
    !Number.isInteger(setNumber) ||
    setNumber < 1 ||
    setNumber > 100
  ) {
    redirect("/workout-templates?error=invalid");
  }

  const parseOptionalNumber = (value: FormDataEntryValue | null) => {
    if (value === null || value === "") return null;
    if (typeof value !== "string") return Number.NaN;
    return Number(value);
  };

  const reps = parseOptionalNumber(repsValue);
  const weightKg = parseOptionalNumber(weightValue);
  const rpe = parseOptionalNumber(rpeValue);
  const notes =
    typeof notesValue === "string" ? notesValue.trim() : "";

  if (
    (reps !== null &&
      (!Number.isInteger(reps) || reps < 1 || reps > 1000)) ||
    (weightKg !== null &&
      (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 10000)) ||
    (rpe !== null &&
      (!Number.isFinite(rpe) || rpe < 1 || rpe > 10)) ||
    notes.length > 1000
  ) {
    redirect(`/workout-sessions/${sessionId}?error=invalid-set`);
  }

  const isWarmup = formData.get("isWarmup") === "on";
  const isCompleted = formData.get("isCompleted") === "on";

  if (isCompleted && (reps === null || weightKg === null)) {
    redirect(`/workout-sessions/${sessionId}?error=missing-set-data`);
  }

  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  // Verify that this exercise belongs to this user's session.
  const { data: exercise, error: exerciseError } = await supabase
    .from("session_exercises")
    .select("id, session_id")
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (exerciseError) {
    console.error("Failed to verify workout exercise:", exerciseError);
    redirect(`/workout-sessions/${sessionId}?error=save`);
  }

  if (!exercise) {
    redirect("/dashboard");
  }

  // Only allow changes while the workout is in progress.
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    console.error("Failed to verify workout session:", sessionError);
    redirect(`/workout-sessions/${sessionId}?error=save`);
  }

  if (!session) {
    return redirect("/dashboard");
  }

  if (session.status !== "in_progress") {
    redirect(`/workout-sessions/${sessionId}?error=session-closed`);
  }

  const { error: saveError } = await supabase
    .from("workout_sets")
    .upsert(
      {
        user_id: userId,
        session_exercise_id: sessionExerciseId,
        set_number: setNumber,
        reps,
        weight_kg: weightKg,
        rpe,
        is_warmup: isWarmup,
        is_completed: isCompleted,
        notes: notes || null,
      },
      { onConflict: "session_exercise_id,set_number" },
    );

  if (saveError) {
    console.error("Failed to save workout set:", saveError);
    redirect(`/workout-sessions/${sessionId}?error=save`);
  }

  redirect(`/workout-sessions/${sessionId}?saved=1`);
}

export async function finishWorkout(formData: FormData) {
  const sessionId = formData.get("sessionId");

  const isUuid = (value: unknown): value is string =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );

  if (!isUuid(sessionId)) {
    redirect("/dashboard");
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
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    console.error("Failed to verify workout session:", sessionError);
    redirect(`/workout-sessions/${sessionId}?error=save`);
  }

  if (!session) {
    redirect("/dashboard");
  }

  if (session.status !== "in_progress") {
    redirect(`/workout-sessions/${sessionId}?error=session-closed`);
  }

  const { data: updatedSession, error: updateError } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Failed to finish workout:", updateError);
    redirect(`/workout-sessions/${sessionId}?error=save`);
  }

  if (!updatedSession) {
    redirect(`/workout-sessions/${sessionId}?error=session-closed`);
  }

  redirect(`/workout-sessions/${sessionId}?completed=1`);
}
