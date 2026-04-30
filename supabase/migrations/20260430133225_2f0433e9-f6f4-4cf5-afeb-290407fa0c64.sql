-- Migrate existing class_type rows to the new 6-label session-type system.
-- New labels: Technical Skills, Sparring & Rolling, Cardio & Endurance,
-- Strength & Conditioning, Stretching & Mobility, My Fight Review.
-- "1o1 PT" is removed (now a checkbox inside Technical Skills).

-- 1) Rename legacy labels in place
UPDATE public.user_custom_lists
SET item_name = 'Cardio & Endurance'
WHERE list_type = 'class_type' AND item_name = 'Cardio / Endurance';

UPDATE public.user_custom_lists
SET item_name = 'Strength & Conditioning'
WHERE list_type = 'class_type' AND item_name = 'Strength / Conditioning';

UPDATE public.user_custom_lists
SET item_name = 'Sparring & Rolling'
WHERE list_type = 'class_type' AND item_name = 'Sparring / Rolling';

UPDATE public.user_custom_lists
SET item_name = 'My Fight Review'
WHERE list_type = 'class_type' AND item_name = 'Fight Review';

-- 2) Soft-delete the old "1o1 PT" row (now a checkbox inside Technical Skills)
UPDATE public.user_custom_lists
SET is_active = false
WHERE list_type = 'class_type' AND item_name = '1o1 PT';

-- 3) Insert "Stretching & Mobility" for every user that doesn't have it yet
INSERT INTO public.user_custom_lists (user_id, list_type, discipline_key, item_name, sort_order, is_active)
SELECT DISTINCT ucl.user_id, 'class_type', NULL, 'Stretching & Mobility', 4, true
FROM public.user_custom_lists ucl
WHERE ucl.list_type = 'class_type'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_custom_lists existing
    WHERE existing.user_id = ucl.user_id
      AND existing.list_type = 'class_type'
      AND existing.item_name = 'Stretching & Mobility'
  );

-- 4) Re-number sort_order so chips display in the canonical order
UPDATE public.user_custom_lists SET sort_order = 0 WHERE list_type='class_type' AND item_name='Technical Skills';
UPDATE public.user_custom_lists SET sort_order = 1 WHERE list_type='class_type' AND item_name='Sparring & Rolling';
UPDATE public.user_custom_lists SET sort_order = 2 WHERE list_type='class_type' AND item_name='Cardio & Endurance';
UPDATE public.user_custom_lists SET sort_order = 3 WHERE list_type='class_type' AND item_name='Strength & Conditioning';
UPDATE public.user_custom_lists SET sort_order = 4 WHERE list_type='class_type' AND item_name='Stretching & Mobility';
UPDATE public.user_custom_lists SET sort_order = 5 WHERE list_type='class_type' AND item_name='My Fight Review';