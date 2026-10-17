INSERT INTO public.exercises (name, category, equipment, instructions)
VALUES
-- CHEST
('Barbell Bench Press', 'chest', 'Barbell', 'Press the bar from chest level to full extension with control.'),
('Incline Barbell Bench Press', 'chest', 'Barbell', 'Press from an inclined bench while keeping shoulders stable.'),
('Dumbbell Bench Press', 'chest', 'Dumbbells', 'Lower dumbbells to chest level and press upward.'),
('Incline Dumbbell Press', 'chest', 'Dumbbells', 'Press dumbbells upward on an inclined bench.'),
('Decline Bench Press', 'chest', 'Barbell', 'Press from a decline bench with controlled movement.'),
('Machine Chest Press', 'chest', 'Machine', 'Press the handles forward without locking the elbows forcefully.'),
('Cable Chest Fly', 'chest', 'Cable', 'Bring the handles together in a controlled arc.'),
('Pec Deck Fly', 'chest', 'Machine', 'Bring the pads together while maintaining a slight elbow bend.'),
('Push-Up', 'chest', 'Bodyweight', 'Lower your chest toward the floor while keeping your body straight.'),
('Dips', 'chest', 'Parallel Bars', 'Lower your body with control and press back up.'),

-- BACK
('Pull-Up', 'back', 'Pull-Up Bar', 'Pull your chin above the bar without swinging.'),
('Assisted Pull-Up', 'back', 'Assisted Machine', 'Use assistance to pull your chin toward bar height.'),
('Lat Pulldown', 'back', 'Cable Machine', 'Pull the bar toward your upper chest without leaning excessively.'),
('Seated Cable Row', 'back', 'Cable Machine', 'Pull the handle toward your torso while keeping your back neutral.'),
('Barbell Bent-Over Row', 'back', 'Barbell', 'Hinge at the hips and row the bar toward your lower ribs.'),
('One-Arm Dumbbell Row', 'back', 'Dumbbell', 'Pull the dumbbell toward your hip while supporting your torso.'),
('Chest-Supported Row', 'back', 'Machine', 'Row with your chest supported and avoid shrugging.'),
('T-Bar Row', 'back', 'T-Bar Machine', 'Pull the handle toward your torso with controlled movement.'),
('Straight-Arm Pulldown', 'back', 'Cable Machine', 'Pull the cable down while keeping your elbows slightly bent.'),
('Back Extension', 'back', 'Back Extension Bench', 'Extend at the hips without excessively arching your lower back.'),

-- SHOULDERS
('Seated Dumbbell Shoulder Press', 'shoulders', 'Dumbbells', 'Press overhead while keeping your ribs controlled.'),
('Barbell Overhead Press', 'shoulders', 'Barbell', 'Press the bar overhead while maintaining a stable torso.'),
('Dumbbell Lateral Raise', 'shoulders', 'Dumbbells', 'Raise the dumbbells out to the sides with soft elbows.'),
('Cable Lateral Raise', 'shoulders', 'Cable', 'Raise one arm sideways against cable resistance.'),
('Reverse Pec Deck', 'shoulders', 'Machine', 'Move your arms outward to target the rear deltoids.'),
('Dumbbell Rear Delt Fly', 'shoulders', 'Dumbbells', 'Hinge forward and raise the dumbbells outward.'),
('Face Pull', 'shoulders', 'Cable', 'Pull the rope toward your face with elbows high.'),
('Arnold Press', 'shoulders', 'Dumbbells', 'Rotate the dumbbells as you press overhead.'),

-- BICEPS
('Barbell Biceps Curl', 'biceps', 'Barbell', 'Curl the bar without swinging your torso.'),
('Dumbbell Biceps Curl', 'biceps', 'Dumbbells', 'Curl the dumbbells while keeping your elbows near your sides.'),
('Hammer Curl', 'biceps', 'Dumbbells', 'Curl with a neutral grip and controlled lowering.'),
('Incline Dumbbell Curl', 'biceps', 'Dumbbells', 'Curl from an inclined position without moving your upper arms.'),
('Preacher Curl', 'biceps', 'Preacher Bench', 'Curl over the pad while avoiding forceful elbow locking.'),
('Cable Biceps Curl', 'biceps', 'Cable Machine', 'Curl the cable handle with steady tension.'),

-- TRICEPS
('Cable Triceps Pushdown', 'triceps', 'Cable Machine', 'Extend your elbows while keeping your upper arms still.'),
('Rope Triceps Pushdown', 'triceps', 'Cable Machine', 'Push the rope down and separate the ends slightly.'),
('Overhead Triceps Extension', 'triceps', 'Dumbbell', 'Lower the weight behind your head and extend your elbows.'),
('Lying Triceps Extension', 'triceps', 'EZ Bar', 'Bend your elbows to lower the bar, then extend them.'),
('Close-Grip Bench Press', 'triceps', 'Barbell', 'Use a comfortable narrow grip and keep elbows controlled.'),
('Bench Dip', 'triceps', 'Bench', 'Lower your body with control within a comfortable shoulder range.'),

-- QUADRICEPS
('Barbell Back Squat', 'legs', 'Barbell', 'Squat to a comfortable depth while keeping your feet planted.'),
('Front Squat', 'legs', 'Barbell', 'Keep your torso upright and knees tracking with your toes.'),
('Goblet Squat', 'legs', 'Dumbbell', 'Hold a dumbbell at your chest and squat with control.'),
('Leg Press', 'legs', 'Machine', 'Lower the platform under control without locking your knees forcefully.'),
('Leg Extension', 'legs', 'Machine', 'Extend your knees smoothly and lower the weight slowly.'),
('Bulgarian Split Squat', 'legs', 'Dumbbells', 'Use a split stance and lower under control.'),
('Walking Lunge', 'legs', 'Dumbbells', 'Step forward and lower with your knee aligned over your foot.'),

-- HAMSTRINGS AND GLUTES
('Romanian Deadlift', 'legs', 'Barbell', 'Hinge at the hips with a neutral back and slight knee bend.'),
('Conventional Deadlift', 'legs', 'Barbell', 'Lift from the floor with a braced torso and stable spine.'),
('Lying Leg Curl', 'legs', 'Machine', 'Curl your heels toward your glutes and lower slowly.'),
('Seated Leg Curl', 'legs', 'Machine', 'Bend your knees against resistance with controlled movement.'),
('Hip Thrust', 'legs', 'Barbell', 'Extend your hips while keeping your ribs down.'),
('Glute Bridge', 'legs', 'Bodyweight', 'Raise your hips by squeezing your glutes.'),
('Cable Glute Kickback', 'legs', 'Cable Machine', 'Extend your hip without arching your lower back.'),
('Hip Abduction', 'legs', 'Machine', 'Move your knees outward with controlled resistance.'),

-- CALVES
('Standing Calf Raise', 'legs', 'Machine', 'Rise onto your toes and lower through a comfortable range.'),
('Seated Calf Raise', 'legs', 'Machine', 'Raise your heels while seated and lower slowly.'),

-- CORE
('Plank', 'core', 'Bodyweight', 'Hold a straight body position while bracing your abdomen.'),
('Side Plank', 'core', 'Bodyweight', 'Keep your hips elevated and body aligned on your side.'),
('Crunch', 'core', 'Bodyweight', 'Curl your upper torso gently without pulling your neck.'),
('Hanging Knee Raise', 'core', 'Pull-Up Bar', 'Raise your knees while controlling swinging.'),
('Cable Crunch', 'core', 'Cable Machine', 'Curl your torso downward while bracing your abdomen.'),
('Dead Bug', 'core', 'Bodyweight', 'Extend opposite arm and leg while keeping your lower back controlled.'),

-- FULL BODY AND CONDITIONING
('Kettlebell Swing', 'full_body', 'Kettlebell', 'Drive the movement with a hip hinge rather than a squat.'),
('Dumbbell Farmer Carry', 'full_body', 'Dumbbells', 'Walk upright with weights at your sides and a braced torso.'),
('Burpee', 'full_body', 'Bodyweight', 'Move between a squat, plank position, and standing with control.'),
('Box Jump', 'cardio', 'Box', 'Jump onto a stable box and step down carefully.'),
('Mountain Climber', 'core', 'Bodyweight', 'Alternate knee drives while keeping your torso stable.')
ON CONFLICT DO NOTHING;

SELECT category, COUNT(*) AS exercise_count
FROM public.exercises
GROUP BY category
ORDER BY category;
