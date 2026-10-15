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
