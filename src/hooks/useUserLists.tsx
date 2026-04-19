import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { techniquesByDiscipline } from '@/config/dropdownOptions';
import { MartialArtsDiscipline } from '@/types/training';

export type ListType = 'technique' | 'class_type' | 'emotion' | 'mindset';

export interface CustomListItem {
  id: string;
  user_id: string;
  list_type: ListType;
  discipline_key: string | null;
  item_name: string;
  sort_order: number;
  is_active: boolean;
}

export const DEFAULT_CLASS_TYPES = [
  'Cardio/Endurance',
  'Strength/Conditioning',
  'Technical Skills',
  'Sparring',
  '1o1 PT',
];

export const DEFAULT_EMOTIONS = [
  'Excited', 'Motivated', 'Confidence', 'Resilient', 'Determined',
  'Relief', 'Frustration', 'Anxiety', 'Fear', 'Self-doubt',
];

export const DEFAULT_MINDSETS = [
  'Focus', 'Positive Thinking', 'Mind–Body Link',
  'Stressed', 'Unfocused', 'Mentally Tired', 'Mind–Body Disconnected',
];

const SEED_FLAG_KEY = (uid: string) => `trg_lists_seeded_v1_${uid}`;

export function useUserLists() {
  const { user } = useAuth();
  const [items, setItems] = useState<CustomListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_custom_lists' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });
    setItems((data as any) || []);
    setLoading(false);
  }, [user]);

  const seedDefaults = useCallback(async () => {
    if (!user) return;
    // Check if user already has any rows — only seed if empty
    const { count } = await supabase
      .from('user_custom_lists' as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if ((count || 0) > 0) return;

    const rows: any[] = [];

    // Techniques per discipline
    Object.entries(techniquesByDiscipline).forEach(([disc, techs]) => {
      techs.forEach((t, i) => {
        rows.push({
          user_id: user.id,
          list_type: 'technique',
          discipline_key: disc,
          item_name: t,
          sort_order: i,
          is_active: true,
        });
      });
    });

    DEFAULT_CLASS_TYPES.forEach((name, i) => {
      rows.push({ user_id: user.id, list_type: 'class_type', discipline_key: null, item_name: name, sort_order: i, is_active: true });
    });
    DEFAULT_EMOTIONS.forEach((name, i) => {
      rows.push({ user_id: user.id, list_type: 'emotion', discipline_key: null, item_name: name, sort_order: i, is_active: true });
    });
    DEFAULT_MINDSETS.forEach((name, i) => {
      rows.push({ user_id: user.id, list_type: 'mindset', discipline_key: null, item_name: name, sort_order: i, is_active: true });
    });

    // Insert in batches to be safe
    const batchSize = 200;
    for (let i = 0; i < rows.length; i += batchSize) {
      await supabase.from('user_custom_lists' as any).insert(rows.slice(i, i + batchSize));
    }
    localStorage.setItem(SEED_FLAG_KEY(user.id), '1');
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await seedDefaults();
      await fetchAll();
    })();
  }, [user, seedDefaults, fetchAll]);

  const getActive = (type: ListType, discipline?: string) => {
    return items.filter(i =>
      i.list_type === type &&
      i.is_active &&
      (type === 'technique' ? (discipline ? i.discipline_key === discipline : true) : true)
    );
  };

  const addItem = async (type: ListType, name: string, discipline?: string) => {
    if (!user || !name.trim()) return;
    const max = items.filter(i => i.list_type === type && (type !== 'technique' || i.discipline_key === (discipline || null)))
      .reduce((m, i) => Math.max(m, i.sort_order), -1);
    const { error } = await supabase.from('user_custom_lists' as any).insert({
      user_id: user.id,
      list_type: type,
      discipline_key: type === 'technique' ? (discipline || null) : null,
      item_name: name.trim(),
      sort_order: max + 1,
      is_active: true,
    });
    if (!error) await fetchAll();
    return error;
  };

  const updateItem = async (id: string, name: string) => {
    const { error } = await supabase.from('user_custom_lists' as any)
      .update({ item_name: name.trim() })
      .eq('id', id);
    if (!error) await fetchAll();
    return error;
  };

  const softDelete = async (id: string) => {
    const { error } = await supabase.from('user_custom_lists' as any)
      .update({ is_active: false })
      .eq('id', id);
    if (!error) await fetchAll();
    return error;
  };

  return { items, loading, getActive, addItem, updateItem, softDelete, refresh: fetchAll };
}
