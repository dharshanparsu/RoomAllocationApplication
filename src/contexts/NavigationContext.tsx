import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export type Screen =
  | { name: 'home' }
  | { name: 'allocations' }
  | { name: 'lodges' }
  | { name: 'lodge'; lodgeId: string }
  | { name: 'room'; roomId: string }
  | { name: 'guests' }
  | { name: 'guest'; guestId: string }
  | { name: 'admin' };

export type TabName = 'home' | 'allocations' | 'lodges' | 'guests' | 'admin';

interface NavContextType {
  screen: Screen;
  navigate: (screen: Screen) => void;
  switchTab: (tab: TabName) => void;
  goBack: () => void;
  canGoBack: boolean;
  activeTab: TabName;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

function screenToTab(name: string): TabName {
  if (name === 'allocations') return 'allocations';
  if (name === 'lodges' || name === 'lodge' || name === 'room') return 'lodges';
  if (name === 'guests' || name === 'guest') return 'guests';
  if (name === 'admin') return 'admin';
  return 'home';
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }]);

  const navigate = useCallback((screen: Screen) => {
    setStack(s => [...s, screen]);
  }, []);

  const switchTab = useCallback((tab: TabName) => {
    const root: Screen =
      tab === 'home' ? { name: 'home' }
      : tab === 'allocations' ? { name: 'allocations' }
      : tab === 'lodges' ? { name: 'lodges' }
      : tab === 'guests' ? { name: 'guests' }
      : { name: 'admin' };
    setStack([root]);
  }, []);

  const goBack = useCallback(() => {
    setStack(s => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const screen = stack[stack.length - 1];
  const canGoBack = stack.length > 1;
  const activeTab = screenToTab(screen.name);

  return (
    <NavContext.Provider value={{ screen, navigate, switchTab, goBack, canGoBack, activeTab }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}
