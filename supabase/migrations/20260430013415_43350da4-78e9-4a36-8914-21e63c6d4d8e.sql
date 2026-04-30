-- Normalize class_type names and add missing entries for all users
UPDATE public.user_custom_lists SET item_name = 'Cardio / Endurance' WHERE list_type='class_type' AND item_name='Cardio/Endurance';
UPDATE public.user_custom_lists SET item_name = 'Strength / Conditioning' WHERE list_type='class_type' AND item_name='Strength/Conditioning';
UPDATE public.user_custom_lists SET item_name = 'Sparring / Rolling' WHERE list_type='class_type' AND item_name='Sparring';

-- Insert "Fight Review" for any user who doesn't have it yet
INSERT INTO public.user_custom_lists (user_id, list_type, discipline_key, item_name, sort_order, is_active)
SELECT DISTINCT u.user_id, 'class_type', NULL, 'Fight Review',
       COALESCE((SELECT MAX(sort_order)+1 FROM public.user_custom_lists ucl2 WHERE ucl2.user_id=u.user_id AND ucl2.list_type='class_type'), 0),
       true
FROM public.user_custom_lists u
WHERE u.list_type='class_type'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_custom_lists x
    WHERE x.user_id=u.user_id AND x.list_type='class_type' AND x.item_name='Fight Review'
  );