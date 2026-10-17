
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

  const distanceM = Math.round(distanceKm * 1000);
  const durationSeconds = Math.round(durationMinutes * 60);

  const { error } = await supabase.from("runs").insert({
    user_id: userId,
    started_at: `${date}T12:00:00.000Z`,
    distance_m: distanceM,
    duration_seconds: durationSeconds,
    run_type: runType,
    notes: notes || null,
  });

  if (error) {
    console.error("Failed to save run:", error.message);
    redirect("/runs?error=save_failed");
  }

  revalidatePath("/runs");
  revalidatePath("/dashboard");
  redirect("/runs?saved=1");
}
