
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createRun(formData: FormData) {
  const supabase = await createClient();

  const { data: auth, error: authError } =
    await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const date = String(formData.get("startedDate") ?? "").trim();
  const distanceKm = Number(formData.get("distanceKm"));
  const durationMinutes = Number(formData.get("durationMinutes"));
  const runType = String(formData.get("runType") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const plannedActivityId = String(
    formData.get("plannedActivityId") ?? "",
  ).trim();

  const allowedRunTypes = [
    "easy",
    "long",
    "tempo",
    "interval",
    "race",
    "recovery",
    "other",
  ];

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
  ) {
    redirect("/runs?error=invalid_date");
  }

  if (
    !Number.isFinite(distanceKm) ||
    distanceKm <= 0 ||
    distanceKm > 500
  ) {
    redirect("/runs?error=invalid_distance");
  }

  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 100000
  ) {
    redirect("/runs?error=invalid_duration");
  }

  if (!allowedRunTypes.includes(runType)) {
    redirect("/runs?error=invalid_type");
  }

  if (notes.length > 1000) {
    redirect("/runs?error=invalid_notes");
  }

  let verifiedPlannedActivityId: string | null = null;

  if (plannedActivityId) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!isUuid.test(plannedActivityId)) {
      redirect("/runs?error=invalid_activity");
    }

    const { data: activity, error: activityError } = await supabase
      .from("planned_activities")
      .select("id, status, linked_run_id")
      .eq("id", plannedActivityId)
      .eq("user_id", userId)
      .eq("activity_type", "run")
      .maybeSingle();

    if (
      activityError ||
      !activity ||
      activity.status !== "planned" ||
      activity.linked_run_id !== null
    ) {
      redirect("/runs?error=invalid_activity");
    }

    verifiedPlannedActivityId = activity.id;
  }

  const distanceM = Math.round(distanceKm * 1000);
  const durationSeconds = Math.round(durationMinutes * 60);

  const { data: savedRun, error: saveError } = await supabase
    .from("runs")
    .insert({
      user_id: userId,
      started_at: `${date}T12:00:00.000Z`,
      distance_m: distanceM,
      duration_seconds: durationSeconds,
      run_type: runType,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (saveError || !savedRun) {
    console.error("Failed to save run:", saveError?.message);
    redirect("/runs?error=save_failed");
  }

  if (verifiedPlannedActivityId) {
    const { data: linkedActivity, error: linkError } = await supabase
      .from("planned_activities")
      .update({
        linked_run_id: savedRun.id,
        status: "completed",
      })
      .eq("id", verifiedPlannedActivityId)
      .eq("user_id", userId)
      .eq("activity_type", "run")
      .eq("status", "planned")
      .is("linked_run_id", null)
      .select("id")
      .maybeSingle();

    if (linkError || !linkedActivity) {
      console.error(
        "Run saved, but planned activity linking failed:",
        linkError,
      );

      revalidatePath("/runs");
      revalidatePath("/planner");
      redirect("/runs?error=link_failed");
    }
  }

  revalidatePath("/runs");
  revalidatePath("/planner");
  revalidatePath("/dashboard");

  redirect(
    verifiedPlannedActivityId
      ? "/runs?saved=1&linked=1"
      : "/runs?saved=1",
  );
}
