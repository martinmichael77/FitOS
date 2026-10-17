
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const allowedStatuses = ["planned", "completed", "skipped"] as const;

export async function createPlannedActivity(formData: FormData) {
  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const activityType = String(
    formData.get("activityType") ?? "",
  );
  const title = String(formData.get("title") ?? "").trim();
  const scheduledDate = String(
    formData.get("scheduledDate") ?? "",
  ).trim();
  const scheduledTime = String(
    formData.get("scheduledTime") ?? "",
  ).trim();
  const templateId = String(
    formData.get("templateId") ?? "",
  ).trim();
  const distanceInput = String(
    formData.get("targetDistanceKm") ?? "",
  ).trim();
  const durationInput = String(
    formData.get("targetDurationMinutes") ?? "",
  ).trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!["strength", "run"].includes(activityType)) {
    redirect("/planner?error=invalid_type");
  }

  if (!title || title.length > 120) {
    redirect("/planner?error=invalid_title");
  }

  const validDateFormat =
    /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate);

  const validTimeFormat =
    /^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledTime);

  const parsedDate = new Date(
    `${scheduledDate}T12:00:00.000Z`,
  );

  if (
    !validDateFormat ||
    !validTimeFormat ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== scheduledDate
  ) {
    redirect("/planner?error=invalid_date");
  }

  const scheduledAt = new Date(
    `${scheduledDate}T${scheduledTime}:00+05:30`,
  );

  if (notes.length > 1000) {
    redirect("/planner?error=invalid_notes");
  }

  let verifiedTemplateId: string | null = null;

  if (activityType === "strength") {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        templateId,
      )
    ) {
      redirect("/planner?error=invalid_template");
    }

    const { data: template, error } = await supabase
      .from("workout_templates")
      .select("id, name")
      .eq("id", templateId)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .maybeSingle();

    if (error || !template) {
      redirect("/planner?error=invalid_template");
    }

    verifiedTemplateId = template.id;
  }

  let targetDistanceM: number | null = null;
  let targetDurationSeconds: number | null = null;

  if (activityType === "run") {
    if (distanceInput !== "") {
      const km = Number(distanceInput);

      if (!Number.isFinite(km) || km <= 0 || km > 500) {
        redirect("/planner?error=invalid_distance");
      }

      targetDistanceM = Math.round(km * 1000);
    }

    if (durationInput !== "") {
      const minutes = Number(durationInput);

      if (
        !Number.isFinite(minutes) ||
        minutes <= 0 ||
        minutes > 100000
      ) {
        redirect("/planner?error=invalid_duration");
      }

      targetDurationSeconds = Math.round(minutes * 60);
    }
  }

  const { error } = await supabase
    .from("planned_activities")
    .insert({
      user_id: userId,
      activity_type: activityType,
      title,
      scheduled_for: scheduledAt.toISOString(),
      status: "planned",
      template_id: verifiedTemplateId,
      target_distance_m: targetDistanceM,
      target_duration_seconds: targetDurationSeconds,
      notes: notes || null,
    });

  if (error) {
    console.error("Failed to create planned activity:", error.message);
    redirect("/planner?error=save_failed");
  }

  revalidatePath("/planner");
  revalidatePath("/dashboard");
  redirect("/planner?saved=1");
}

export async function updatePlannedActivityStatus(
  formData: FormData,
) {
  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const activityId = String(
    formData.get("activityId") ?? "",
  );
  const status = String(formData.get("status") ?? "");

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      activityId,
    ) ||
    !allowedStatuses.includes(
      status as (typeof allowedStatuses)[number],
    )
  ) {
    redirect("/planner?error=invalid_update");
  }

  const { data, error } = await supabase
    .from("planned_activities")
    .update({ status })
    .eq("id", activityId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/planner?error=update_failed");
  }

  revalidatePath("/planner");
  revalidatePath("/dashboard");
  redirect("/planner?saved=1");
}

export async function deletePlannedActivity(formData: FormData) {
  const activityId = String(formData.get("activityId") ?? "");

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      activityId,
    )
  ) {
    redirect("/planner?error=delete_failed");
  }

  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();

  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: deletedActivity, error } = await supabase
    .from("planned_activities")
    .delete()
    .eq("id", activityId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !deletedActivity) {
    console.error("Could not delete planned activity:", error?.message);
    redirect("/planner?error=delete_failed");
  }

  revalidatePath("/planner");
  revalidatePath("/dashboard");

  redirect("/planner?saved=1");
}
