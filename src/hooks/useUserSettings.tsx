import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserSettings {
  input_text_color: string;
  discipline_colors: Record<string, string>;
}

const DEFAULT_DISCIPLINE_COLORS: Record<string, string> = {
  MMA: '#8B0000',
  'Muay Thai': '#FF7F11',
  K1: '#FFB703',
  Wrestling: '#1D3557',
  Grappling: '#2A9D8F',
  BJJ: '#6A4C93',
};

const DEFAULT_SETTINGS: UserSettings = {
  input_text_color: '#FFFFFF',
  discipline_colors: DEFAULT_DISCIPLINE_COLORS,
};

const INPUT_COLOR_PRESETS = [
  { label: 'White', value: '#FFFFFF' },
  { label: 'Red', value: '#E63946' },
  { label: 'Gold', value: '#FFB703' },
  { label: 'Blue', value: '#3A86FF' },
  { label: 'Green', value: '#2EC4B6' },
];

interface UserSettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  getDisciplineColor: (discipline: string) => string;
}

const UserSettingsContext = createContext<UserSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  updateSettings: async () => {},
  getDisciplineColor: () => '#8B0000',
});

export const useUserSettings = () => useContext(UserSettingsContext);
export { DEFAULT_DISCIPLINE_COLORS, INPUT_COLOR_PRESETS, DEFAULT_SETTINGS };

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [rowExists, setRowExists] = useState(false);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    fetchSettings(user.id);
  }, [user]);

  const fetchSettings = async (userId: string) => {
    const { data } = await supabase
      .from('user_settings' as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setRowExists(true);
      setSettings({
        input_text_color: (data as any).input_text_color || '#FFFFFF',
        discipline_colors: (data as any).discipline_colors || DEFAULT_DISCIPLINE_COLORS,
      });
    }
    setLoading(false);
  };

  const updateSettings = useCallback(async (partial: Partial<UserSettings>) => {
    if (!user) return;
    const newSettings = { ...settings, ...partial };
    setSettings(newSettings);

    const payload = {
      user_id: user.id,
      input_text_color: newSettings.input_text_color,
      discipline_colors: newSettings.discipline_colors,
      updated_at: new Date().toISOString(),
    };

    if (rowExists) {
      await supabase
        .from('user_settings' as any)
        .update(payload)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('user_settings' as any)
        .insert(payload);
      setRowExists(true);
    }
  }, [user, settings, rowExists]);

  const getDisciplineColor = useCallback((discipline: string) => {
    return settings.discipline_colors[discipline] || DEFAULT_DISCIPLINE_COLORS[discipline] || '#8B0000';
  }, [settings.discipline_colors]);

  return (
    <UserSettingsContext.Provider value={{ settings, loading, updateSettings, getDisciplineColor }}>
      {children}
    </UserSettingsContext.Provider>
  );
}
