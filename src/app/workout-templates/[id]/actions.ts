"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );

function readOptionalInteger(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return NaN;

  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : NaN;
}

function readOptionalWeight(value: FormDataEntryValue | null) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value)) {
    return NaN;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : NaN;
}

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  return { supabase, userId };
}

function templateUrl(id: string, result: string) {
  return `/workout-templates/${id}?${result}`;
}

export async function addTemplateExercise(formData: FormData) {
  const templateId = formData.get("templateId");
  const exerciseId = formData.get("exerciseId");

  if (
    typeof templateId !== "string" ||
    !isUuid(templateId) ||
    typeof exerciseId !== "string" ||
    !isUuid(exerciseId)
  ) {
    redirect("/workout-templates?error=invalid");
  }

  const targetSets = readOptionalInteger(formData.get("targetSets"));
  const repsMin = readOptionalInteger(formData.get("targetRepsMin"));
  const repsMax = readOptionalInteger(formData.get("targetRepsMax"));
  const targetWeight = readOptionalWeight(formData.get("targetWeightKg"));

  if (
    [targetSets, repsMin, repsMax, targetWeight].some(Number.isNaN) ||
    (repsMin !== null && repsMax !== null && repsMin > repsMax)
  ) {
    redirect(templateUrl(templateId, "error=invalid"));
  }

  const { supabase, userId } = await getAuthenticatedUserId();

  const { data: existing } = await supabase
    .from("template_exercises")
    .select("sort_order")
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (existing?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("template_exercises").insert({
    user_id: userId,
    template_id: templateId,
    exercise_id: exerciseId,
    sort_order: nextOrder,
    target_sets: targetSets,
    target_reps_min: repsMin,
    target_reps_max: repsMax,
    target_weight_kg: targetWeight,
  });

  if (error) {
    console.error("Could not add template exercise:", error.message);
    redirect(templateUrl(templateId, "error=save"));
  }

  redirect(templateUrl(templateId, "added=1"));
}

export async function updateTemplateExercise(formData: FormData) {
  const templateId = formData.get("templateId");
  const itemId = formData.get("itemId");

  if (
    typeof templateId !== "string" ||
    !isUuid(templateId) ||
    typeof itemId !== "string" ||
    !isUuid(itemId)
  ) {
    redirect("/workout-templates?error=invalid");
  }

  const targetSets = readOptionalInteger(formData.get("targetSets"));
  const repsMin = readOptionalInteger(formData.get("targetRepsMin"));
  const repsMax = readOptionalInteger(formData.get("targetRepsMax"));
  const targetWeight = readOptionalWeight(formData.get("targetWeightKg"));

  if (
    [targetSets, repsMin, repsMax, targetWeight].some(Number.isNaN) ||
    (repsMin !== null && repsMax !== null && repsMin > repsMax)
  ) {
    redirect(templateUrl(templateId, "error=invalid"));
  }

  const { supabase, userId } = await getAuthenticatedUserId();

  const { error } = await supabase
    .from("template_exercises")
    .update({
      target_sets: targetSets,
      target_reps_min: repsMin,
      target_reps_max: repsMax,
      target_weight_kg: targetWeight,
    })
    .eq("id", itemId)
    .eq("template_id", templateId)
    .eq("user_id", userId);

  if (error) {
    console.error("Could not update template exercise:", error.message);
    redirect(templateUrl(templateId, "error=save"));
  }

  redirect(templateUrl(templateId, "updated=1"));
}

export async function removeTemplateExercise(formData: FormData) {
  const templateId = formData.get("templateId");
  const itemId = formData.get("itemId");

  if (
    typeof templateId !== "string" ||
    !isUuid(templateId) ||
    typeof itemId !== "string" ||
    !isUuid(itemId)
  ) {
    redirect("/workout-templates?error=invalid");
  }

  const { supabase, userId } = await getAuthenticatedUserId();

  const { error } = await supabase
    .from("template_exercises")
    .delete()
    .eq("id", itemId)
    .eq("template_id", templateId)
    .eq("user_id", userId);

  if (error) {
    console.error("Could not remove template exercise:", error.message);
    redirect(templateUrl(templateId, "error=save"));
  }

  redirect(templateUrl(templateId, "removed=1"));
}

export async function moveTemplateExercise(formData: FormData) {
  const templateId = formData.get("templateId");
  const itemId = formData.get("itemId");
  const direction = formData.get("direction");

  if (
    typeof templateId !== "string" ||
    !isUuid(templateId) ||
    typeof itemId !== "string" ||
    !isUuid(itemId) ||
    (direction !== "up" && direction !== "down")
  ) {
    redirect("/workout-templates?error=invalid");
  }

  const { supabase, userId } = await getAuthenticatedUserId();

  const { data: items, error: listError } = await supabase
    .from("template_exercises")
    .select("id, sort_order")
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (listError || !items) {
    redirect(templateUrl(templateId, "error=save"));
  }

  const index = items.findIndex((item) => item.id === itemId);
  const neighborIndex = index + (direction === "up" ? -1 : 1);

  if (index < 0) {
    redirect(templateUrl(templateId, "error=save"));
  }

  if (neighborIndex < 0 || neighborIndex >= items.length) {
    redirect(templateUrl(templateId, "moved=1"));
  }

  const current = items[index];
  const neighbor = items[neighborIndex];
  const temporaryOrder =
    Math.max(...items.map((item) => item.sort_order)) + 1;

  const first = await supabase
    .from("template_exercises")
    .update({ sort_order: temporaryOrder })
    .eq("id", current.id)
    .eq("user_id", userId);

  if (first.error) redirect(templateUrl(templateId, "error=save"));

  const second = await supabase
    .from("template_exercises")
    .update({ sort_order: current.sort_order })
    .eq("id", neighbor.id)
    .eq("user_id", userId);

  if (second.error) {
    await supabase
      .from("template_exercises")
      .update({ sort_order: current.sort_order })
      .eq("id", current.id)
      .eq("user_id", userId);

    redirect(templateUrl(templateId, "error=save"));
  }

  const third = await supabase
    .from("template_exercises")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", current.id)
    .eq("user_id", userId);

  if (third.error) redirect(templateUrl(templateId, "error=save"));

  redirect(templateUrl(templateId, "moved=1"));
}
