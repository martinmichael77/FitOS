-- Preserve the planned targets when a workout session starts.
ALTER TABLE public.session_exercises
	ADD COLUMN target_sets integer,
	ADD COLUMN target_reps_min integer,
	ADD COLUMN target_reps_max integer,
	ADD COLUMN target_weight_kg numeric(7,2);

ALTER TABLE public.session_exercises
	ADD CONSTRAINT session_exercises_target_sets_check
		CHECK (target_sets IS NULL OR target_sets > 0),
	ADD CONSTRAINT session_exercises_target_reps_min_check
		CHECK (target_reps_min IS NULL OR target_reps_min > 0),
	ADD CONSTRAINT session_exercises_target_reps_max_check
		CHECK (target_reps_max IS NULL OR target_reps_max > 0),
	ADD CONSTRAINT session_exercises_target_weight_check
		CHECK (target_weight_kg IS NULL OR target_weight_kg >= 0),
	ADD CONSTRAINT session_exercises_target_rep_range_check
		CHECK (
			target_reps_min IS NULL
			OR target_reps_max IS NULL
			OR target_reps_min <= target_reps_max
		);
