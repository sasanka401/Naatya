import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isDirector: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isDirector: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function applySession(session: Session | null) {
      if (!mounted) return;
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (mounted) setProfile((data as Profile) ?? null);
      } else {
        setProfile(null);
      }

      if (mounted) setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const isDirector = profile?.role === 'Director';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isDirector }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
