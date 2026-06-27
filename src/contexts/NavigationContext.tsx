import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export type Screen =
  | { name: 'home' }
  | { name: 'allocations' }
  | { name: 'config' }
  | { name: 'lodges' }
  | { name: 'lodge'; lodgeId: string }
  | { name: 'room'; roomId: string }
  | { name: 'guests' }
  | { name: 'guest'; guestId: string }
  | { name: 'admin' };

export type TabName = 'home' | 'dashboard' | 'config' | 'admin';

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
  if (name === 'allocations') return 'home';
  if (name === 'home') return 'dashboard';
  if (name === 'config' || name === 'lodges' || name === 'lodge' || name === 'room' || name === 'guests' || name === 'guest') return 'config';
  if (name === 'admin') return 'admin';
  return 'home';
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([{ name: 'allocations' }]);

  const navigate = useCallback((screen: Screen) => {
    setStack(s => [...s, screen]);
  }, []);

  const switchTab = useCallback((tab: TabName) => {
    const root: Screen =
      tab === 'home' ? { name: 'allocations' }
      : tab === 'dashboard' ? { name: 'home' }
      : tab === 'config' ? { name: 'config' }
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
