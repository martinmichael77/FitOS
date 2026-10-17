BEGIN;

-- FitOS historical seed data for the existing account.
-- Safe to rerun: checks for existing templates, sessions, exercises, runs, and planned activities.
-- All workout timestamps are local India time (+05:30), set to 18:00 where the tracker has no time.

CREATE TEMP TABLE seed_exercises (
  name text, category text, equipment text, instructions text
) ON COMMIT DROP;

INSERT INTO seed_exercises VALUES
('Reverse Leg Curl','legs','Machine','Curl the heels toward the glutes with controlled movement.'),
('Adductor','legs','Adductor Machine','Bring the thighs inward against resistance with control.'),
('Abductor','legs','Abductor Machine','Move the thighs outward against resistance with control.'),
('Calf Raises','legs','Calf Raise Machine','Raise the heels through a comfortable range and lower slowly.'),
('Crunches','core','Bodyweight','Curl the upper torso gently without pulling the neck.'),
('Barbell Press','chest','Barbell','Press the bar from chest level with a stable torso; recorded load includes the bar.'),
('Shoulder Press (Smith)','shoulders','Smith Machine','Press overhead on the Smith machine with controlled movement.'),
('Lateral Raises','shoulders','Dumbbells','Raise dumbbells out to the sides with soft elbows.'),
('Rope Extension','triceps','Cable Machine','Extend the elbows with controlled movement.'),
('Chest-Supported Machine Row','back','Machine','Row with the chest supported; recorded load is per side.'),
('Hyperextension','back','Back Extension Bench','Extend at the hips without excessively arching the lower back.'),
('Cable Curl','biceps','Cable Machine','Curl the cable handle with steady tension.'),
('Hack Squat','legs','Hack Squat Machine','Lower under control while keeping the feet planted.'),
('Shrugs','shoulders','Dumbbells or Machine','Elevate the shoulders without rolling them.'),
('Dumbbell Row','back','Dumbbell','Row the dumbbell toward the hip while supporting the torso.'),
('Single Arm Lat Pull Down','back','Cable Machine','Pull the handle toward the upper chest with one arm.'),
('Shoulder Press','shoulders','Machine or Dumbbells','Press overhead with a stable torso and controlled lowering.'),
('Rope Pushdown','triceps','Cable Machine','Push the rope down and separate the ends slightly.'),
('Triceps Pushdown','triceps','Cable Machine','Push the cable handle down while keeping the upper arms still.'),
('Incline Dumbbell Press','chest','Dumbbells','Press dumbbells upward on an inclined bench.'),
('Pec Deck Fly','chest','Machine','Bring the pads together while maintaining a slight elbow bend.'),
('Leg Extension','legs','Machine','Extend the knees smoothly and lower the weight slowly.'),
('Leg Press','legs','Machine','Lower the platform under control without forcefully locking the knees.'),
('Cable Crunch','core','Cable Machine','Curl the torso downward while bracing the abdomen.'),
('Incline Dumbbell Curl','biceps','Dumbbells','Curl from an inclined position without moving the upper arms.');

INSERT INTO public.exercises (name, category, equipment, instructions)
SELECT s.name, s.category, s.equipment, s.instructions
FROM seed_exercises s
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises e WHERE lower(e.name) = lower(s.name)
);

CREATE TEMP TABLE seed_templates (name text, description text) ON COMMIT DROP;
INSERT INTO seed_templates VALUES
('Day 1 - Legs A','Historical split: quads, hamstrings, hip abduction/adduction, calves and core.'),
('Day 2 - Push','Historical split: chest, shoulders and triceps.'),
('Day 3 - Pull','Historical split: back, rear delts and biceps.'),
('Day 4 - Legs B','Historical split: squat pattern, hamstrings, calves, core and shrugs.'),
('Day 5 - Upper','Historical split: upper-body push and pull, shoulders and arms.');

INSERT INTO public.workout_templates (user_id, name, description, is_archived)
SELECT '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid, t.name, t.description, false
FROM seed_templates t
WHERE NOT EXISTS (
  SELECT 1 FROM public.workout_templates w
  WHERE w.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
    AND w.name = t.name
);

CREATE TEMP TABLE seed_template_exercises (
  template_name text, exercise_name text, sort_order int, target_sets int, target_reps_min int, target_reps_max int, notes text
) ON COMMIT DROP;
INSERT INTO seed_template_exercises VALUES
('Day 1 - Legs A','Leg Extension',1,3,10,15,NULL),
('Day 1 - Legs A','Leg Press',2,3,10,15,NULL),
('Day 1 - Legs A','Reverse Leg Curl',3,3,10,15,NULL),
('Day 1 - Legs A','Abductor',4,2,12,15,'Only 2 sets for adductor/abductor'),
('Day 1 - Legs A','Adductor',5,2,12,15,'Only 2 sets for adductor/abductor'),
('Day 1 - Legs A','Calf Raises',6,3,15,20,NULL),
('Day 1 - Legs A','Cable Crunch',7,3,10,15,NULL),
('Day 1 - Legs A','Crunches',8,3,10,15,NULL),
('Day 2 - Push','Incline Dumbbell Press',1,3,10,15,NULL),
('Day 2 - Push','Barbell Press',2,3,8,12,'Including bar weight'),
('Day 2 - Push','Pec Deck Fly',3,3,10,12,NULL),
('Day 2 - Push','Shoulder Press (Smith)',4,3,10,15,NULL),
('Day 2 - Push','Lateral Raises',5,3,12,15,'Last set superset with lower weights'),
('Day 2 - Push','Triceps Pushdown',6,3,10,15,NULL),
('Day 2 - Push','Rope Extension',7,3,10,15,NULL),
('Day 3 - Pull','Chest-Supported Machine Row',1,3,10,15,'Single side weight'),
('Day 3 - Pull','Lat Pulldown',2,3,10,15,NULL),
('Day 3 - Pull','Seated Cable Row',3,3,10,15,NULL),
('Day 3 - Pull','Reverse Pec Deck',4,3,10,12,'Reverse pec deck / rear delt fly'),
('Day 3 - Pull','Hyperextension',5,3,10,12,NULL),
('Day 3 - Pull','Cable Curl',6,3,10,15,NULL),
('Day 3 - Pull','Hammer Curl',7,3,10,13,NULL),
('Day 4 - Legs B','Hack Squat',1,3,10,15,NULL),
('Day 4 - Legs B','Leg Extension',2,3,10,15,NULL),
('Day 4 - Legs B','Romanian Deadlift',3,3,8,8,NULL),
('Day 4 - Legs B','Reverse Leg Curl',4,3,10,15,NULL),
('Day 4 - Legs B','Calf Raises',5,3,15,20,NULL),
('Day 4 - Legs B','Cable Crunch',6,3,10,12,NULL),
('Day 4 - Legs B','Shrugs',7,3,15,20,NULL),
('Day 5 - Upper','Barbell Press',1,3,8,15,'Including bar weight'),
('Day 5 - Upper','Cable Chest Fly',2,3,10,15,NULL),
('Day 5 - Upper','Dumbbell Row',3,3,10,15,NULL),
('Day 5 - Upper','Single Arm Lat Pull Down',4,3,10,15,'Cable'),
('Day 5 - Upper','Shoulder Press',5,3,8,12,NULL),
('Day 5 - Upper','Lateral Raises',6,3,12,15,'Last set superset with lower weights'),
('Day 5 - Upper','Incline Dumbbell Curl',7,3,8,8,'Incline dumbbell curl + hammer curl superset'),
('Day 5 - Upper','Rope Pushdown',8,3,12,12,NULL);

INSERT INTO public.template_exercises
(user_id, template_id, exercise_id, sort_order, target_sets, target_reps_min, target_reps_max, notes)
SELECT '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid, wt.id, e.id, ste.sort_order,
       ste.target_sets, ste.target_reps_min, ste.target_reps_max, ste.notes
FROM seed_template_exercises ste
JOIN public.workout_templates wt ON wt.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid AND wt.name = ste.template_name
JOIN public.exercises e ON lower(e.name) = lower(ste.exercise_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.template_exercises te
  WHERE te.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
    AND te.template_id = wt.id AND te.sort_order = ste.sort_order
);

CREATE TEMP TABLE seed_workouts (
  workout_name text, workout_date date, template_name text
) ON COMMIT DROP;
INSERT INTO seed_workouts VALUES
('Day 1 - Legs A','2026-09-21','Day 1 - Legs A'),
('Day 2 - Push','2026-09-22','Day 2 - Push'),
('Day 3 - Pull','2026-09-23','Day 3 - Pull'),
('Day 4 - Legs B','2026-09-25','Day 4 - Legs B'),
('Day 5 - Upper','2026-09-26','Day 5 - Upper');

INSERT INTO public.workout_sessions (user_id, template_id, name, status, started_at, completed_at, notes)
SELECT '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid, wt.id, sw.workout_name, 'completed',
       (sw.workout_date + time '18:00') AT TIME ZONE 'Asia/Kolkata',
       (sw.workout_date + time '19:15') AT TIME ZONE 'Asia/Kolkata',
       'Imported from historical workout tracker; time of day was not supplied.'
FROM seed_workouts sw
LEFT JOIN public.workout_templates wt ON wt.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid AND wt.name = sw.template_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.workout_sessions ws
  WHERE ws.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
    AND ws.name = sw.workout_name
    AND ws.started_at::date = sw.workout_date
);

CREATE TEMP TABLE seed_session_exercises (
  workout_name text, workout_date date, exercise_name text, sort_order int, exercise_notes text
) ON COMMIT DROP;
INSERT INTO seed_session_exercises VALUES
('Day 1 - Legs A','2026-09-21','Leg Extension',1,NULL),
('Day 1 - Legs A','2026-09-21','Leg Press',2,NULL),
('Day 1 - Legs A','2026-09-21','Reverse Leg Curl',3,NULL),
('Day 1 - Legs A','2026-09-21','Abductor',4,'Only 2 sets for adductor/abductor'),
('Day 1 - Legs A','2026-09-21','Adductor',5,'Only 2 sets for adductor/abductor'),
('Day 1 - Legs A','2026-09-21','Calf Raises',6,NULL),
('Day 1 - Legs A','2026-09-21','Cable Crunch',7,NULL),
('Day 1 - Legs A','2026-09-21','Crunches',8,NULL),
('Day 2 - Push','2026-09-22','Incline Dumbbell Press',1,NULL),
('Day 2 - Push','2026-09-22','Barbell Press',2,'Including bar weight'),
('Day 2 - Push','2026-09-22','Pec Deck Fly',3,NULL),
('Day 2 - Push','2026-09-22','Shoulder Press (Smith)',4,NULL),
('Day 2 - Push','2026-09-22','Lateral Raises',5,'Last set superset with lower weights'),
('Day 2 - Push','2026-09-22','Triceps Pushdown',6,NULL),
('Day 2 - Push','2026-09-22','Rope Extension',7,NULL),
('Day 3 - Pull','2026-09-23','Chest-Supported Machine Row',1,'Single side weight'),
('Day 3 - Pull','2026-09-23','Lat Pulldown',2,NULL),
('Day 3 - Pull','2026-09-23','Seated Cable Row',3,NULL),
('Day 3 - Pull','2026-09-23','Reverse Pec Deck',4,'Reverse pec deck / rear delt fly'),
('Day 3 - Pull','2026-09-23','Hyperextension',5,NULL),
('Day 3 - Pull','2026-09-23','Cable Curl',6,NULL),
('Day 3 - Pull','2026-09-23','Hammer Curl',7,NULL),
('Day 4 - Legs B','2026-09-25','Hack Squat',1,NULL),
('Day 4 - Legs B','2026-09-25','Leg Extension',2,NULL),
('Day 4 - Legs B','2026-09-25','Romanian Deadlift',3,NULL),
('Day 4 - Legs B','2026-09-25','Reverse Leg Curl',4,NULL),
('Day 4 - Legs B','2026-09-25','Calf Raises',5,NULL),
('Day 4 - Legs B','2026-09-25','Cable Crunch',6,NULL),
('Day 4 - Legs B','2026-09-25','Shrugs',7,NULL),
('Day 5 - Upper','2026-09-26','Barbell Press',1,'Including bar weight'),
('Day 5 - Upper','2026-09-26','Cable Chest Fly',2,NULL),
('Day 5 - Upper','2026-09-26','Dumbbell Row',3,NULL),
('Day 5 - Upper','2026-09-26','Single Arm Lat Pull Down',4,'Cable'),
('Day 5 - Upper','2026-09-26','Shoulder Press',5,NULL),
('Day 5 - Upper','2026-09-26','Lateral Raises',6,'Last set superset with lower weights'),
('Day 5 - Upper','2026-09-26','Incline Dumbbell Curl',7,'Incline dumbbell curl + hammer curl superset'),
('Day 5 - Upper','2026-09-26','Rope Pushdown',8,NULL);

INSERT INTO public.session_exercises (user_id, session_id, exercise_id, exercise_name, sort_order, notes, target_sets)
SELECT '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid, ws.id, e.id, sse.exercise_name,
       sse.sort_order, sse.exercise_notes, 3
FROM seed_session_exercises sse
JOIN public.workout_sessions ws ON ws.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
  AND ws.name = sse.workout_name AND ws.started_at::date = sse.workout_date
LEFT JOIN public.exercises e ON lower(e.name) = lower(sse.exercise_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.session_exercises se
  WHERE se.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
    AND se.session_id = ws.id AND se.exercise_name = sse.exercise_name
);

CREATE TEMP TABLE seed_sets (
  workout_name text, workout_date date, exercise_name text,
  set_number int, weight_kg numeric, reps int, notes text
) ON COMMIT DROP;
INSERT INTO seed_sets VALUES
-- Day 1 - Legs A
('Day 1 - Legs A','2026-09-21','Leg Extension',1,20,15,NULL),
('Day 1 - Legs A','2026-09-21','Leg Extension',2,25,12,NULL),
('Day 1 - Legs A','2026-09-21','Leg Extension',3,25,12,NULL),
('Day 1 - Legs A','2026-09-21','Leg Press',1,120,15,NULL),
('Day 1 - Legs A','2026-09-21','Leg Press',2,140,12,NULL),
('Day 1 - Legs A','2026-09-21','Leg Press',3,140,12,NULL),
('Day 1 - Legs A','2026-09-21','Reverse Leg Curl',1,15,12,NULL),
('Day 1 - Legs A','2026-09-21','Reverse Leg Curl',2,20,12,NULL),
('Day 1 - Legs A','2026-09-21','Reverse Leg Curl',3,20,10,NULL),
('Day 1 - Legs A','2026-09-21','Abductor',1,20,15,'Only 2 sets for adductor/abductor'),
('Day 1 - Legs A','2026-09-21','Abductor',2,20,15,'Only 2 sets for adductor/abductor'),
('Day 1 - Legs A','2026-09-21','Adductor',1,45,15,'Only 2 sets for adductor/abductor'),
('Day 1 - Legs A','2026-09-21','Adductor',2,45,15,'Only 2 sets for adductor/abductor'),
('Day 1 - Legs A','2026-09-21','Calf Raises',1,70,20,NULL),
('Day 1 - Legs A','2026-09-21','Calf Raises',2,70,20,NULL),
('Day 1 - Legs A','2026-09-21','Calf Raises',3,70,20,NULL),
('Day 1 - Legs A','2026-09-21','Cable Crunch',1,45,15,NULL),
('Day 1 - Legs A','2026-09-21','Cable Crunch',2,50,12,NULL),
('Day 1 - Legs A','2026-09-21','Cable Crunch',3,50,12,NULL),
('Day 1 - Legs A','2026-09-21','Crunches',1,0,12,NULL),
('Day 1 - Legs A','2026-09-21','Crunches',2,0,12,NULL),
('Day 1 - Legs A','2026-09-21','Crunches',3,0,12,NULL),
-- Day 2 - Push
('Day 2 - Push','2026-09-22','Incline Dumbbell Press',1,12.5,15,NULL),
('Day 2 - Push','2026-09-22','Incline Dumbbell Press',2,15,12,NULL),
('Day 2 - Push','2026-09-22','Incline Dumbbell Press',3,15,12,NULL),
('Day 2 - Push','2026-09-22','Barbell Press',1,40,12,'Including bar weight'),
('Day 2 - Push','2026-09-22','Barbell Press',2,40,10,'Including bar weight'),
('Day 2 - Push','2026-09-22','Barbell Press',3,40,9,'Including bar weight'),
('Day 2 - Push','2026-09-22','Pec Deck Fly',1,25,12,NULL),
('Day 2 - Push','2026-09-22','Pec Deck Fly',2,25,12,NULL),
('Day 2 - Push','2026-09-22','Pec Deck Fly',3,25,10,NULL),
('Day 2 - Push','2026-09-22','Shoulder Press (Smith)',1,20,15,NULL),
('Day 2 - Push','2026-09-22','Shoulder Press (Smith)',2,20,15,NULL),
('Day 2 - Push','2026-09-22','Shoulder Press (Smith)',3,20,12,NULL),
('Day 2 - Push','2026-09-22','Lateral Raises',1,5,15,'Last set superset with lower weights'),
('Day 2 - Push','2026-09-22','Lateral Raises',2,7.5,15,'Last set superset with lower weights'),
('Day 2 - Push','2026-09-22','Lateral Raises',3,7.5,15,'Last set superset with lower weights'),
('Day 2 - Push','2026-09-22','Triceps Pushdown',1,30,15,NULL),
('Day 2 - Push','2026-09-22','Triceps Pushdown',2,35,12,NULL),
('Day 2 - Push','2026-09-22','Triceps Pushdown',3,35,12,NULL),
('Day 2 - Push','2026-09-22','Rope Extension',1,15,15,NULL),
('Day 2 - Push','2026-09-22','Rope Extension',2,15,12,NULL),
('Day 2 - Push','2026-09-22','Rope Extension',3,15,12,NULL),
-- Day 3 - Pull
('Day 3 - Pull','2026-09-23','Chest-Supported Machine Row',1,15,15,'Single side weight'),
('Day 3 - Pull','2026-09-23','Chest-Supported Machine Row',2,17.5,10,'Single side weight'),
('Day 3 - Pull','2026-09-23','Chest-Supported Machine Row',3,15,12,'Single side weight'),
('Day 3 - Pull','2026-09-23','Lat Pulldown',1,40,15,NULL),
('Day 3 - Pull','2026-09-23','Lat Pulldown',2,45,12,NULL),
('Day 3 - Pull','2026-09-23','Lat Pulldown',3,45,12,NULL),
('Day 3 - Pull','2026-09-23','Seated Cable Row',1,25,15,NULL),
('Day 3 - Pull','2026-09-23','Seated Cable Row',2,30,12,NULL),
('Day 3 - Pull','2026-09-23','Seated Cable Row',3,25,12,NULL),
('Day 3 - Pull','2026-09-23','Reverse Pec Deck',1,25,12,NULL),
('Day 3 - Pull','2026-09-23','Reverse Pec Deck',2,25,12,NULL),
('Day 3 - Pull','2026-09-23','Reverse Pec Deck',3,25,12,NULL),
('Day 3 - Pull','2026-09-23','Hyperextension',1,10,12,NULL),
('Day 3 - Pull','2026-09-23','Hyperextension',2,10,12,NULL),
('Day 3 - Pull','2026-09-23','Hyperextension',3,10,10,NULL),
('Day 3 - Pull','2026-09-23','Cable Curl',1,35,15,NULL),
('Day 3 - Pull','2026-09-23','Cable Curl',2,35,15,NULL),
('Day 3 - Pull','2026-09-23','Cable Curl',3,40,10,NULL),
('Day 3 - Pull','2026-09-23','Hammer Curl',1,10,13,NULL),
('Day 3 - Pull','2026-09-23','Hammer Curl',2,10,12,NULL),
('Day 3 - Pull','2026-09-23','Hammer Curl',3,10,12,NULL),
-- Day 4 - Legs B
('Day 4 - Legs B','2026-09-25','Hack Squat',1,60,15,NULL),
('Day 4 - Legs B','2026-09-25','Hack Squat',2,70,12,NULL),
('Day 4 - Legs B','2026-09-25','Hack Squat',3,70,12,NULL),
('Day 4 - Legs B','2026-09-25','Leg Extension',1,25,15,NULL),
('Day 4 - Legs B','2026-09-25','Leg Extension',2,30,12,NULL),
('Day 4 - Legs B','2026-09-25','Leg Extension',3,30,12,NULL),
('Day 4 - Legs B','2026-09-25','Romanian Deadlift',1,12.5,8,NULL),
('Day 4 - Legs B','2026-09-25','Romanian Deadlift',2,12.5,8,NULL),
('Day 4 - Legs B','2026-09-25','Romanian Deadlift',3,12.5,8,NULL),
('Day 4 - Legs B','2026-09-25','Reverse Leg Curl',1,15,15,NULL),
('Day 4 - Legs B','2026-09-25','Reverse Leg Curl',2,15,13,NULL),
('Day 4 - Legs B','2026-09-25','Reverse Leg Curl',3,15,11,NULL),
('Day 4 - Legs B','2026-09-25','Calf Raises',1,80,20,NULL),
('Day 4 - Legs B','2026-09-25','Calf Raises',2,80,20,NULL),
('Day 4 - Legs B','2026-09-25','Calf Raises',3,80,20,NULL),
('Day 4 - Legs B','2026-09-25','Cable Crunch',1,50,12,NULL),
('Day 4 - Legs B','2026-09-25','Cable Crunch',2,50,12,NULL),
('Day 4 - Legs B','2026-09-25','Cable Crunch',3,50,12,NULL),
('Day 4 - Legs B','2026-09-25','Shrugs',1,40,20,NULL),
('Day 4 - Legs B','2026-09-25','Shrugs',2,40,20,NULL),
('Day 4 - Legs B','2026-09-25','Shrugs',3,40,15,NULL),
-- Day 5 - Upper
('Day 5 - Upper','2026-09-26','Barbell Press',1,40,15,'Including bar weight'),
('Day 5 - Upper','2026-09-26','Barbell Press',2,45,12,'Including bar weight'),
('Day 5 - Upper','2026-09-26','Barbell Press',3,45,9,'Including bar weight'),
('Day 5 - Upper','2026-09-26','Cable Chest Fly',1,15,15,NULL),
('Day 5 - Upper','2026-09-26','Cable Chest Fly',2,15,12,NULL),
('Day 5 - Upper','2026-09-26','Cable Chest Fly',3,15,12,NULL),
('Day 5 - Upper','2026-09-26','Dumbbell Row',1,12.5,15,NULL),
('Day 5 - Upper','2026-09-26','Dumbbell Row',2,15,12,NULL),
('Day 5 - Upper','2026-09-26','Dumbbell Row',3,15,12,NULL),
('Day 5 - Upper','2026-09-26','Single Arm Lat Pull Down',1,25,15,'Cable'),
('Day 5 - Upper','2026-09-26','Single Arm Lat Pull Down',2,30,12,'Cable'),
('Day 5 - Upper','2026-09-26','Single Arm Lat Pull Down',3,30,12,'Cable'),
('Day 5 - Upper','2026-09-26','Shoulder Press',1,12.5,12,NULL),
('Day 5 - Upper','2026-09-26','Shoulder Press',2,15,8,NULL),
('Day 5 - Upper','2026-09-26','Shoulder Press',3,15,8,NULL),
('Day 5 - Upper','2026-09-26','Lateral Raises',1,7.5,15,'Last set superset with lower weights'),
('Day 5 - Upper','2026-09-26','Lateral Raises',2,7.5,15,'Last set superset with lower weights'),
('Day 5 - Upper','2026-09-26','Lateral Raises',3,7.5,12,'Last set superset with lower weights'),
('Day 5 - Upper','2026-09-26','Incline Dumbbell Curl',1,7.5,8,'Incline dumbbell curl + hammer curl superset'),
('Day 5 - Upper','2026-09-26','Incline Dumbbell Curl',2,7.5,8,'Incline dumbbell curl + hammer curl superset'),
('Day 5 - Upper','2026-09-26','Incline Dumbbell Curl',3,7.5,8,'Incline dumbbell curl + hammer curl superset'),
('Day 5 - Upper','2026-09-26','Rope Pushdown',1,25,12,NULL),
('Day 5 - Upper','2026-09-26','Rope Pushdown',2,25,12,NULL),
('Day 5 - Upper','2026-09-26','Rope Pushdown',3,25,12,NULL);

INSERT INTO public.workout_sets (user_id, session_exercise_id, set_number, reps, weight_kg, is_warmup, is_completed, notes)
SELECT '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid, se.id, ss.set_number,
       ss.reps, ss.weight_kg, false, true, ss.notes
FROM seed_sets ss
JOIN public.workout_sessions ws ON ws.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
  AND ws.name = ss.workout_name AND ws.started_at::date = ss.workout_date
JOIN public.session_exercises se ON se.session_id = ws.id AND se.exercise_name = ss.exercise_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.workout_sets existing
  WHERE existing.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
    AND existing.session_exercise_id = se.id AND existing.set_number = ss.set_number
);

-- Two completed runs from the tracker. Times are mm:ss, converted to seconds.
INSERT INTO public.runs (user_id, started_at, distance_m, duration_seconds, run_type, notes)
SELECT '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid,
       ('2026-09-22 07:00:00'::timestamp AT TIME ZONE 'Asia/Kolkata'),
       5150, 2182, 'easy', 'Imported from tracker. Target: 20–25 min. Recorded pace: 7:03/km.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.runs r
  WHERE r.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
    AND r.started_at::date = DATE '2026-09-22' AND r.distance_m = 5150 AND r.duration_seconds = 2182
);

INSERT INTO public.runs (user_id, started_at, distance_m, duration_seconds, run_type, notes)
SELECT '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid,
       ('2026-09-24 07:00:00'::timestamp AT TIME ZONE 'Asia/Kolkata'),
       7000, 3022, 'tempo', 'Imported from tracker as Main Run. Target: 25–30 min. Recorded pace: 7:11/km.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.runs r
  WHERE r.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
    AND r.started_at::date = DATE '2026-09-24' AND r.distance_m = 7000 AND r.duration_seconds = 3022
);

-- Planner entries for the two completed runs and the skipped Sunday run.
INSERT INTO public.planned_activities
(user_id, activity_type, title, scheduled_for, status, target_duration_seconds, notes)
SELECT '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid, 'run', 'Easy Run', ('2026-09-22 07:00:00'::timestamp AT TIME ZONE 'Asia/Kolkata'),
       'completed', 1500, 'Target 20–25 min. Historical run imported.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.planned_activities p
  WHERE p.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid AND p.activity_type = 'run'
    AND p.scheduled_for::date = DATE '2026-09-22' AND p.title = 'Easy Run'
);

UPDATE public.planned_activities p
SET linked_run_id = r.id, status = 'completed', updated_at = now()
FROM public.runs r
WHERE p.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
  AND p.title = 'Easy Run' AND p.scheduled_for::date = DATE '2026-09-22'
  AND r.user_id = p.user_id AND r.started_at::date = DATE '2026-09-22' AND r.distance_m = 5150;

INSERT INTO public.planned_activities
(user_id, activity_type, title, scheduled_for, status, target_duration_seconds, notes)
SELECT '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid, 'run', 'Main Run', ('2026-09-24 07:00:00'::timestamp AT TIME ZONE 'Asia/Kolkata'),
       'completed', 1800, 'Target 25–30 min. Historical run imported.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.planned_activities p
  WHERE p.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid AND p.activity_type = 'run'
    AND p.scheduled_for::date = DATE '2026-09-24' AND p.title = 'Main Run'
);

UPDATE public.planned_activities p
SET linked_run_id = r.id, status = 'completed', updated_at = now()
FROM public.runs r
WHERE p.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid
  AND p.title = 'Main Run' AND p.scheduled_for::date = DATE '2026-09-24'
  AND r.user_id = p.user_id AND r.started_at::date = DATE '2026-09-24' AND r.distance_m = 7000;

INSERT INTO public.planned_activities
(user_id, activity_type, title, scheduled_for, status, target_duration_seconds, notes)
SELECT '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid, 'run', 'Easy/Long Run', ('2026-09-27 07:00:00'::timestamp AT TIME ZONE 'Asia/Kolkata'),
       'skipped', 2100, 'Skipped according to historical tracker; no completed run recorded.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.planned_activities p
  WHERE p.user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba'::uuid AND p.activity_type = 'run'
    AND p.scheduled_for::date = DATE '2026-09-27' AND p.title = 'Easy/Long Run'
);

COMMIT;

-- Verification queries (run separately after import if desired):
-- SELECT name, started_at, status FROM public.workout_sessions WHERE user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba' ORDER BY started_at;
-- SELECT started_at, distance_m, duration_seconds, run_type FROM public.runs WHERE user_id = '4480a661-3f0b-4e7d-af6a-ce03631affba' ORDER BY started_at;
