import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

const AUTH_CACHE_KEY = 'sncf_auth_cache';

interface AuthCache {
  user: User;
  profile: Profile;
  timestamp: number;
}

function loadAuthCache(): AuthCache | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as AuthCache;
    // Cache valid for 30 days max
    if (Date.now() - cached.timestamp > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function saveAuthCache(user: User, profile: Profile) {
  try {
    const cache: AuthCache = { user, profile, timestamp: Date.now() };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full or unavailable */ }
}

function clearAuthCache() {
  try { localStorage.removeItem(AUTH_CACHE_KEY); } catch { /* ignore */ }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isOffline: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: { first_name: string; last_name: string; phone_number?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isAgent: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Try to restore from cache immediately (synchronous) to avoid blank screen
  const cached = loadAuthCache();

  const [user, setUser] = useState<User | null>(cached?.user ?? null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(cached?.profile ?? null);
  // If we have a cache, skip the loading state entirely — app renders immediately
  const [loading, setLoading] = useState(!cached);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    // Shorter timeout when offline or when we already have cached data
    const timeoutMs = !navigator.onLine ? 2000 : cached ? 4000 : 8000;

    const initTimeout = window.setTimeout(() => {
      console.warn('Auth init timeout: forcing loading=false');
      setLoading(false);
    }, timeoutMs);

    // IMPORTANT: subscribe first to avoid missing events during init
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.clearTimeout(initTimeout);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        if (!profile) setLoading(true); // only show loading if we don't have cached profile
        // Defer any additional Supabase calls to avoid deadlocks
        window.setTimeout(() => {
          fetchProfile(session.user);
        }, 0);
      } else {
        // User signed out — clear cache
        if (_event === 'SIGNED_OUT') {
          clearAuthCache();
        }
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
          if (!profile) setLoading(true);
          window.setTimeout(() => {
            fetchProfile(session.user);
          }, 0);
        } else {
          // No session from Supabase — but if we're offline and have cache, keep using it
          if (!navigator.onLine && cached) {
            // Stay with cached user/profile, don't reset
            setLoading(false);
          } else {
            setProfile(null);
            setUser(null);
            setLoading(false);
          }
        }
      })
      .catch((error) => {
        window.clearTimeout(initTimeout);
        console.error('Error getting session:', error);
        // If offline and we have cached auth, don't wipe it
        if (!navigator.onLine && cached) {
          setLoading(false);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      });

    return () => {
      window.clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const profileData = (data as Profile) ?? null;
      setProfile(profileData);

      // Cache auth data for offline use
      if (profileData) {
        saveAuthCache(authUser, profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // If offline, keep the cached profile instead of wiping it
      if (!navigator.onLine && cached?.profile) {
        // Keep existing profile from cache
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error as Error | null };

    // Check if user is approved
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .maybeSingle();

    if (profileData && !(profileData as any).is_approved) {
      await supabase.auth.signOut();
      return { error: new Error('Votre compte est en attente de validation par un administrateur ou manager.') };
    }

    return { error: null };
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
    clearAuthCache();
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
        isOffline,
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
