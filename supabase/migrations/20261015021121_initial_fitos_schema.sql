
-- =========================================================
-- FitOS: Initial database schema
-- =========================================================

-- 1. EXERCISE LIBRARY
-- Shared, built-in exercises. Seed data can be added later.
CREATE TABLE public.exercises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category text NOT NULL
        CHECK (category IN (
            'chest', 'back', 'shoulders', 'biceps',
            'triceps', 'legs', 'core', 'cardio', 'full_body', 'other'
        )),
    equipment text,
    instructions text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT exercises_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT exercises_name_category_unique UNIQUE (name, category)
);

-- 2. WORKOUT TEMPLATES
CREATE TABLE public.workout_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT workout_templates_name_not_empty
        CHECK (length(trim(name)) > 0),
    CONSTRAINT workout_templates_id_user_unique UNIQUE (id, user_id)
);

-- 3. EXERCISES INSIDE TEMPLATES
CREATE TABLE public.template_exercises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id uuid NOT NULL,
    exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
    sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    target_sets integer CHECK (target_sets > 0),
    target_reps_min integer CHECK (target_reps_min > 0),
    target_reps_max integer CHECK (target_reps_max > 0),
    target_weight_kg numeric(7,2) CHECK (target_weight_kg >= 0),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT template_exercises_template_owner_fk
        FOREIGN KEY (template_id, user_id)
        REFERENCES public.workout_templates(id, user_id)
        ON DELETE CASCADE,
    CONSTRAINT template_exercises_rep_range_check
        CHECK (
            target_reps_min IS NULL
            OR target_reps_max IS NULL
            OR target_reps_min <= target_reps_max
        )
);

-- 4. COMPLETED / IN-PROGRESS WORKOUT SESSIONS
CREATE TABLE public.workout_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id uuid,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT workout_sessions_name_not_empty
        CHECK (length(trim(name)) > 0),
    CONSTRAINT workout_sessions_id_user_unique UNIQUE (id, user_id),
    CONSTRAINT workout_sessions_template_owner_fk
        FOREIGN KEY (template_id, user_id)
        REFERENCES public.workout_templates(id, user_id)
        ON DELETE SET NULL (template_id)
);

-- 5. EXERCISES RECORDED IN ACTUAL SESSIONS
-- exercise_name preserves history if the library changes later.
CREATE TABLE public.session_exercises (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id uuid NOT NULL,
    exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
    exercise_name text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT session_exercises_name_not_empty
        CHECK (length(trim(exercise_name)) > 0),
    CONSTRAINT session_exercises_session_owner_fk
        FOREIGN KEY (session_id, user_id)
        REFERENCES public.workout_sessions(id, user_id)
        ON DELETE CASCADE,
    CONSTRAINT session_exercises_id_user_unique UNIQUE (id, user_id)
);

-- 6. SETS WITHIN EACH SESSION EXERCISE
CREATE TABLE public.workout_sets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_exercise_id uuid NOT NULL,
    set_number integer NOT NULL CHECK (set_number > 0),
    reps integer CHECK (reps > 0),
    weight_kg numeric(7,2) CHECK (weight_kg >= 0),
    is_warmup boolean NOT NULL DEFAULT false,
    is_completed boolean NOT NULL DEFAULT true,
    rpe numeric(3,1) CHECK (rpe >= 1 AND rpe <= 10),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT workout_sets_exercise_owner_fk
        FOREIGN KEY (session_exercise_id, user_id)
        REFERENCES public.session_exercises(id, user_id)
        ON DELETE CASCADE,
    CONSTRAINT workout_sets_number_unique
        UNIQUE (session_exercise_id, set_number)
);

-- 7. RUNNING RECORDS
CREATE TABLE public.runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at timestamptz NOT NULL,
    distance_m integer NOT NULL CHECK (distance_m > 0),
    duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
    run_type text NOT NULL DEFAULT 'easy'
        CHECK (run_type IN (
            'easy', 'long', 'tempo', 'intervals',
            'race', 'recovery', 'other'
        )),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT runs_id_user_unique UNIQUE (id, user_id)
);

-- 8. PLANNED ACTIVITIES
CREATE TABLE public.planned_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type text NOT NULL CHECK (activity_type IN ('strength', 'run')),
    title text NOT NULL,
    scheduled_for timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'completed', 'skipped')),
    template_id uuid,
    linked_session_id uuid,
    linked_run_id uuid,
    target_distance_m integer CHECK (target_distance_m > 0),
    target_duration_seconds integer CHECK (target_duration_seconds > 0),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT planned_activities_title_not_empty
        CHECK (length(trim(title)) > 0),
    CONSTRAINT planned_activities_template_owner_fk
        FOREIGN KEY (template_id, user_id)
        REFERENCES public.workout_templates(id, user_id)
        ON DELETE SET NULL (template_id),
    CONSTRAINT planned_activities_session_owner_fk
        FOREIGN KEY (linked_session_id, user_id)
        REFERENCES public.workout_sessions(id, user_id)
        ON DELETE SET NULL (linked_session_id),
    CONSTRAINT planned_activities_run_owner_fk
        FOREIGN KEY (linked_run_id, user_id)
        REFERENCES public.runs(id, user_id)
        ON DELETE SET NULL (linked_run_id),
    CONSTRAINT planned_activities_type_links_check CHECK (
        (activity_type = 'strength' AND linked_run_id IS NULL)
        OR
        (activity_type = 'run' AND linked_session_id IS NULL
            AND template_id IS NULL)
    )
);


-- =========================================================
-- Indexes for common queries
-- =========================================================

CREATE INDEX workout_templates_user_created_idx
    ON public.workout_templates (user_id, created_at DESC);

CREATE INDEX template_exercises_template_order_idx
    ON public.template_exercises (template_id, sort_order);

CREATE INDEX workout_sessions_user_started_idx
    ON public.workout_sessions (user_id, started_at DESC);

CREATE INDEX workout_sessions_user_status_idx
    ON public.workout_sessions (user_id, status, started_at DESC);

CREATE INDEX session_exercises_session_order_idx
    ON public.session_exercises (session_id, sort_order);

CREATE INDEX workout_sets_exercise_number_idx
    ON public.workout_sets (session_exercise_id, set_number);

CREATE INDEX runs_user_started_idx
    ON public.runs (user_id, started_at DESC);

CREATE INDEX planned_activities_user_schedule_idx
    ON public.planned_activities (user_id, scheduled_for);

CREATE INDEX planned_activities_user_status_idx
    ON public.planned_activities (user_id, status, scheduled_for);

CREATE INDEX exercises_active_name_idx
    ON public.exercises (name)
    WHERE is_active = true;

-- =========================================================
-- Maintain updated_at on mutable records
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER workout_templates_updated_at
    BEFORE UPDATE ON public.workout_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER workout_sessions_updated_at
    BEFORE UPDATE ON public.workout_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER runs_updated_at
    BEFORE UPDATE ON public.runs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER planned_activities_updated_at
    BEFORE UPDATE ON public.planned_activities
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();



-- =========================================================
-- Row Level Security
-- =========================================================

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_activities ENABLE ROW LEVEL SECURITY;

-- Signed-in users can read active shared exercises.
-- No client-side write policies are created for this shared catalog.
CREATE POLICY "Authenticated users can read active exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (is_active = true);

-- Users can access only their own templates.
CREATE POLICY "Users manage their own workout templates"
ON public.workout_templates
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can access only their own template exercises.
CREATE POLICY "Users manage their own template exercises"
ON public.template_exercises
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can access only their own workout sessions.
CREATE POLICY "Users manage their own workout sessions"
ON public.workout_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can access only their own session exercises.
CREATE POLICY "Users manage their own session exercises"
ON public.session_exercises
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can access only their own sets.
CREATE POLICY "Users manage their own workout sets"
ON public.workout_sets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can access only their own runs.
CREATE POLICY "Users manage their own runs"
ON public.runs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can access only their own planned activities.
CREATE POLICY "Users manage their own planned activities"
ON public.planned_activities
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Explicit SQL privileges for the application role.
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON public.exercises TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.workout_templates,
   public.template_exercises,
   public.workout_sessions,
   public.session_exercises,
   public.workout_sets,
   public.runs,
   public.planned_activities
TO authenticated;
