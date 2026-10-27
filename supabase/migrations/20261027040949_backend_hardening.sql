-- FitOS backend hardening: pin trigger function search_path, optimize RLS evaluation,
-- and add indexes for foreign-key joins identified by Supabase advisors.
-- No user data is modified or deleted.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "Users manage their own planned activities" ON public.planned_activities;
CREATE POLICY "Users manage their own planned activities" ON public.planned_activities FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users manage their own runs" ON public.runs;
CREATE POLICY "Users manage their own runs" ON public.runs FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users manage their own session exercises" ON public.session_exercises;
CREATE POLICY "Users manage their own session exercises" ON public.session_exercises FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users manage their own template exercises" ON public.template_exercises;
CREATE POLICY "Users manage their own template exercises" ON public.template_exercises FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users manage their own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users manage their own workout sessions" ON public.workout_sessions FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users manage their own workout sets" ON public.workout_sets;
CREATE POLICY "Users manage their own workout sets" ON public.workout_sets FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users manage their own workout templates" ON public.workout_templates;
CREATE POLICY "Users manage their own workout templates" ON public.workout_templates FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS planned_activities_linked_run_owner_idx ON public.planned_activities (linked_run_id, user_id);
CREATE INDEX IF NOT EXISTS planned_activities_linked_session_owner_idx ON public.planned_activities (linked_session_id, user_id);
CREATE INDEX IF NOT EXISTS planned_activities_template_owner_idx ON public.planned_activities (template_id, user_id);
CREATE INDEX IF NOT EXISTS session_exercises_exercise_id_idx ON public.session_exercises (exercise_id);
CREATE INDEX IF NOT EXISTS session_exercises_session_owner_idx ON public.session_exercises (session_id, user_id);
CREATE INDEX IF NOT EXISTS session_exercises_user_id_idx ON public.session_exercises (user_id);
CREATE INDEX IF NOT EXISTS template_exercises_exercise_id_idx ON public.template_exercises (exercise_id);
CREATE INDEX IF NOT EXISTS template_exercises_template_owner_idx ON public.template_exercises (template_id, user_id);
CREATE INDEX IF NOT EXISTS template_exercises_user_id_idx ON public.template_exercises (user_id);
CREATE INDEX IF NOT EXISTS workout_sessions_template_owner_idx ON public.workout_sessions (template_id, user_id);
CREATE INDEX IF NOT EXISTS workout_sets_exercise_owner_idx ON public.workout_sets (session_exercise_id, user_id);
CREATE INDEX IF NOT EXISTS workout_sets_user_id_idx ON public.workout_sets (user_id);
