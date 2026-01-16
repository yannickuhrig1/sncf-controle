import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: { first_name: string; last_name: string; phone_number?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isAgent: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety net: if auth init hangs for any reason, don't block the whole app forever.
    const initTimeout = window.setTimeout(() => {
      console.warn('Auth init timeout: forcing loading=false');
      setLoading(false);
    }, 8000);

    // IMPORTANT: subscribe first to avoid missing events during init
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.clearTimeout(initTimeout);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        // Defer any additional Supabase calls to avoid deadlocks
        window.setTimeout(() => {
          fetchProfile(session.user);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Then fetch initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        window.clearTimeout(initTimeout);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setLoading(true);
          window.setTimeout(() => {
            fetchProfile(session.user);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })
      .catch((error) => {
        window.clearTimeout(initTimeout);
        console.error('Error getting session:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      });

    return () => {
      window.clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (authUser: User) => {
    const userId = authUser.id;

    try {
      // 1) Primary lookup by user_id
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile (user_id):', error);
      }

      // 2) Fallback lookup by id (legacy schema / older users)
      if (!data) {
        const res = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        data = res.data;
        if (res.error) {
          console.error('Error fetching profile (id):', res.error);
        }
      }

      // 3) If still missing, create a minimal profile (user can edit it later)
      if (!data) {
        const meta = (authUser.user_metadata ?? {}) as Record<string, any>;
        const emailPrefix = (authUser.email ?? '').split('@')[0] || 'Utilisateur';

        const insertRes = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            first_name: (meta.first_name as string | undefined) ?? emailPrefix,
            last_name: (meta.last_name as string | undefined) ?? 'Profil',
            phone_number: (meta.phone_number as string | undefined) ?? null,
          })
          .select('*')
          .single();

        if (insertRes.error) {
          console.error('Error creating profile:', insertRes.error);
        } else {
          data = insertRes.data;
        }
      }

      setProfile((data as Profile) ?? null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: { first_name: string; last_name: string; phone_number?: string }
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAdmin = () => profile?.role === 'admin';
  const isManager = () => profile?.role === 'manager';
  const isAgent = () => profile?.role === 'agent';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isManager,
        isAgent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
