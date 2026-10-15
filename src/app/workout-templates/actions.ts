    
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createWorkoutTemplate(formData: FormData) {
  const nameValue = formData.get("name");
  const descriptionValue = formData.get("description");

  if (
    typeof nameValue !== "string" ||
    typeof descriptionValue !== "string"
  ) {
    redirect("/workout-templates?error=invalid");
  }

  const name = nameValue.trim();
  const description = descriptionValue.trim();

  if (!name || name.length > 100 || description.length > 1000) {
    redirect("/workout-templates?error=invalid");
  }

  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  const userId = authData?.claims?.sub;

  if (authError || typeof userId !== "string") {
    redirect("/login");
  }

  const { error } = await supabase
    .from("workout_templates")
    .insert({
      user_id: userId,
      name,
      description: description || null,
    });

  if (error) {
    console.error("Failed to create workout template:", error.message);
    redirect("/workout-templates?error=create");
  }

  redirect("/workout-templates?created=1");
}
