import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useFighterProfile } from './useFighterProfile';

export type AppMode = 'athlete' | 'fighter' | 'coach';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  availableModes: AppMode[];
  isCoach: boolean;
  isFighter: boolean;
}

const AppModeContext = createContext<AppModeContextType>({
  mode: 'athlete',
  setMode: () => {},
  availableModes: ['athlete'],
  isCoach: false,
  isFighter: false,
});

export const useAppMode = () => useContext(AppModeContext);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { isFighterApproved } = useFighterProfile();
  const [mode, setModeState] = useState<AppMode>('athlete');

  const isCoach = !!profile?.coach_level;
  const isFighter = isFighterApproved;

  const availableModes: AppMode[] = ['athlete'];
  if (isFighter) availableModes.push('fighter');
  if (isCoach) availableModes.push('coach');

  // Restore saved mode
  useEffect(() => {
    const saved = localStorage.getItem('trg-app-mode') as AppMode | null;
    if (saved && availableModes.includes(saved)) {
      setModeState(saved);
    } else if (!availableModes.includes(mode)) {
      setModeState('athlete');
    }
  }, [isCoach, isFighter]);

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('trg-app-mode', newMode);
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode, availableModes, isCoach, isFighter }}>
      {children}
    </AppModeContext.Provider>
  );
}
