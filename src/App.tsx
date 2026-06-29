import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import { Login } from './pages/Login';
import { Pending } from './pages/Pending';
import { Home } from './pages/Home';
import { ConfigNeeded } from './pages/ConfigNeeded';
import { GuestPortal } from './pages/GuestPortal';
import { Loader2 } from 'lucide-react';

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return hash;
}

function AppRoutes() {
  const { session, profile, loading, isApproved } = useAuth();

  if (!isSupabaseConfigured) return <ConfigNeeded />;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!session) return <Login />;

  // Signed in but not yet approved by an admin (or profile not created yet)
  if (!profile || !isApproved) return <Pending />;

  return <Home />;
}

function App() {
  const hash = useHashRoute();

  useEffect(() => {
    if (hash === '#guest') {
      document.body.classList.add('guest-body');
    } else {
      document.body.classList.remove('guest-body');
    }
  }, [hash]);

  // Guest portal — no auth required
  if (hash === '#guest') {
    return <GuestPortal />;
  }

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;

