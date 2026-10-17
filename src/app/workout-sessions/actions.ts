"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );

export async function startWorkout(formData: FormData) {
  const templateId = formData.get("templateId");
  const plannedActivityId = formData.get("plannedActivityId");

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

  let verifiedPlannedActivityId: string | null = null;

  if (plannedActivityId !== null) {
    if (
      typeof plannedActivityId !== "string" ||
      !isUuid(plannedActivityId)
    ) {
      redirect("/planner?error=invalid_update");
    }

    const { data: plannedActivity, error: plannedActivityError } =
      await supabase
        .from("planned_activities")
        .select("id, template_id, status, linked_session_id")
        .eq("id", plannedActivityId)
        .eq("user_id", userId)
        .eq("activity_type", "strength")
        .maybeSingle();

    if (
      plannedActivityError ||
      !plannedActivity ||
      plannedActivity.status !== "planned" ||
      plannedActivity.linked_session_id !== null ||
      plannedActivity.template_id !== templateId
    ) {
      redirect("/planner?error=invalid_update");
    }

    verifiedPlannedActivityId = plannedActivity.id;
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

  if (verifiedPlannedActivityId) {
    const { data: linkedActivity, error: linkError } = await supabase
      .from("planned_activities")
      .update({
        linked_session_id: session.id,
      })
      .eq("id", verifiedPlannedActivityId)
      .eq("user_id", userId)
      .eq("status", "planned")
      .is("linked_session_id", null)
      .select("id")
      .maybeSingle();

    if (linkError || !linkedActivity) {
      console.error("Could not link planned workout:", linkError);

      await supabase
        .from("session_exercises")
        .delete()
        .eq("session_id", session.id)
        .eq("user_id", userId);

      await supabase
        .from("workout_sessions")
        .delete()
        .eq("id", session.id)
        .eq("user_id", userId);

      redirect("/planner?error=update_failed");
    }
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

  const { error: plannedActivityError } = await supabase
    .from("planned_activities")
    .update({
      status: "completed",
    })
    .eq("linked_session_id", sessionId)
    .eq("user_id", userId)
    .eq("activity_type", "strength")
    .eq("status", "planned");

  if (plannedActivityError) {
    console.error(
      "Workout finished, but its planned activity could not be updated:",
      plannedActivityError,
    );
  }

  redirect(`/workout-sessions/${sessionId}?completed=1`);
}

export async function deleteWorkout(formData: FormData) {
  const sessionId = formData.get("sessionId");

  if (typeof sessionId !== "string" || !isUuid(sessionId)) {
    redirect("/workout-history?error=delete_failed");
  }

  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: deletedSession, error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !deletedSession) {
    console.error("Could not delete workout:", error?.message);
    redirect("/workout-history?error=delete_failed");
  }

  revalidatePath("/workout-history");
  revalidatePath("/planner");
  revalidatePath("/dashboard");
  revalidatePath("/progress");

  redirect("/workout-history");
}

export async function deleteWorkoutSet(formData: FormData) {
  const setId = formData.get("setId");
  const sessionId = formData.get("sessionId");

  if (
    typeof setId !== "string" ||
    !isUuid(setId) ||
    typeof sessionId !== "string" ||
    !isUuid(sessionId)
  ) {
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

  if (sessionError || !session) {
    redirect("/dashboard");
  }

  if (session.status !== "in_progress") {
    redirect(`/workout-sessions/${sessionId}?error=session-closed`);
  }

  const { data: exercise, error: exerciseError } = await supabase
    .from("session_exercises")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (exerciseError || !exercise) {
    redirect(`/workout-sessions/${sessionId}?error=delete-set`);
  }

  const { data: set, error: setError } = await supabase
    .from("workout_sets")
    .select("id, session_exercise_id")
    .eq("id", setId)
    .eq("user_id", userId)
    .maybeSingle();

  if (setError || !set) {
    redirect(`/workout-sessions/${sessionId}?error=delete-set`);
  }

  const { data: matchingExercise, error: matchingExerciseError } =
    await supabase
      .from("session_exercises")
      .select("id")
      .eq("id", set.session_exercise_id)
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

  if (matchingExerciseError || !matchingExercise) {
    redirect(`/workout-sessions/${sessionId}?error=delete-set`);
  }

  const { data: deletedSet, error: deleteError } = await supabase
    .from("workout_sets")
    .delete()
    .eq("id", setId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (deleteError || !deletedSet) {
    redirect(`/workout-sessions/${sessionId}?error=delete-set`);
  }

  revalidatePath(`/workout-sessions/${sessionId}`);
  revalidatePath("/workout-history");
  revalidatePath("/progress");
  revalidatePath("/dashboard");

  redirect(`/workout-sessions/${sessionId}?deletedSet=1`);
}
