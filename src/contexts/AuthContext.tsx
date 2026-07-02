import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'coordinator';
  status: 'pending' | 'approved';
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, status')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching profile from users table:', error);
        setProfile(null);
      } else {
        setProfile((data as Profile) ?? null);
      }
    } catch (err) {
      console.error('Unhandled error in loadProfile:', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;

    // Use onAuthStateChange as the single source of truth for both initial session and subsequent changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          await loadProfile(session.user.id);
        } catch (err) {
          console.error('Error loading profile in auth listener:', err);
        }
      } else {
        setProfile(null);
      }
      
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        await loadProfile(user.id);
      } catch (err) {
        console.error('Error refreshing profile:', err);
      }
    }
  }, [user, loadProfile]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during signout:', err);
    }
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        isApproved: profile?.status === 'approved',
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
