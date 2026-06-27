import { Home as HomeIcon, LayoutDashboard, Sliders, Shield } from 'lucide-react';
import { NavigationProvider, useNavigation } from '../contexts/NavigationContext';
import type { TabName } from '../contexts/NavigationContext';
import { HomeScreen } from '../screens/HomeScreen';
import { AllocationsScreen } from '../screens/AllocationsScreen';
import { ConfigScreen } from '../screens/ConfigScreen';
import { LodgesScreen } from '../screens/LodgesScreen';
import { LodgeDetailScreen } from '../screens/LodgeDetailScreen';
import { RoomDetailScreen } from '../screens/RoomDetailScreen';
import { GuestsScreen } from '../screens/GuestsScreen';
import { GuestDetailScreen } from '../screens/GuestDetailScreen';
import { AdminScreen } from '../screens/AdminScreen';

const TABS: { id: TabName; icon: React.ElementType; label: string }[] = [
  { id: 'home', icon: HomeIcon, label: 'Home' },
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'config', icon: Sliders, label: 'Config' },
  { id: 'admin', icon: Shield, label: 'Admin' },
];

function screenKey(screen: ReturnType<typeof useNavigation>['screen']) {
  if (screen.name === 'lodge') return `lodge-${screen.lodgeId}`;
  if (screen.name === 'room') return `room-${screen.roomId}`;
  if (screen.name === 'guest') return `guest-${screen.guestId}`;
  return screen.name;
}

function AppShell() {
  const { screen, switchTab, activeTab } = useNavigation();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div key={screenKey(screen)} className="screen-in flex-1 flex flex-col overflow-hidden">
        {screen.name === 'home' && <HomeScreen />}
        {screen.name === 'allocations' && <AllocationsScreen />}
        {screen.name === 'config' && <ConfigScreen />}
        {screen.name === 'lodges' && <LodgesScreen />}
        {screen.name === 'lodge' && <LodgeDetailScreen lodgeId={screen.lodgeId} />}
        {screen.name === 'room' && <RoomDetailScreen roomId={screen.roomId} />}
        {screen.name === 'guests' && <GuestsScreen />}
        {screen.name === 'guest' && <GuestDetailScreen guestId={screen.guestId} />}
        {screen.name === 'admin' && <AdminScreen />}
      </div>

      <div className="bottom-nav">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <tab.icon strokeWidth={2} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Home() {
  return (
    <NavigationProvider>
      <AppShell />
    </NavigationProvider>
  );
}
