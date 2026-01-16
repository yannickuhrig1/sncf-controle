import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type NavigationStyle = 'bottom' | 'burger';

export type PageId = 'dashboard' | 'onboard' | 'station' | 'statistics' | 'history' | 'settings' | 'admin' | 'profile' | 'manager';

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  navigation_style: NavigationStyle;
  visible_pages: PageId[];
  show_bottom_bar: boolean;
  show_burger_menu: boolean;
  bottom_bar_pages: PageId[];
  notifications_push: boolean;
  notifications_email: boolean;
  notifications_fraud_alerts: boolean;
  notifications_new_controls: boolean;
  display_compact_mode: boolean;
  display_show_totals: boolean;
  default_page: string;
  data_auto_save: boolean;
  data_keep_history_days: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_VISIBLE_PAGES: PageId[] = ['dashboard', 'onboard', 'station', 'statistics', 'history'];
export const DEFAULT_BOTTOM_BAR_PAGES: PageId[] = ['dashboard', 'onboard', 'station', 'statistics', 'history'];

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  theme: 'system',
  navigation_style: 'bottom',
  visible_pages: DEFAULT_VISIBLE_PAGES,
  show_bottom_bar: true,
  show_burger_menu: false,
  bottom_bar_pages: DEFAULT_BOTTOM_BAR_PAGES,
  notifications_push: true,
  notifications_email: false,
  notifications_fraud_alerts: true,
  notifications_new_controls: false,
  display_compact_mode: false,
  display_show_totals: true,
  default_page: '/',
  data_auto_save: true,
  data_keep_history_days: 90,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as UserPreferences;
      }

      return data as UserPreferences;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserPreferences;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user-preferences', user?.id], data);
      
      // Apply theme immediately
      const root = document.documentElement;
      if (data.theme === 'dark') {
        root.classList.add('dark');
      } else if (data.theme === 'light') {
        root.classList.remove('dark');
      } else {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    },
    onError: (error) => {
      toast.error('Erreur lors de la sauvegarde: ' + error.message);
    },
  });

  // Helper to get effective preferences (with defaults fallback)
  const effectivePreferences: UserPreferences | null = preferences ? {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    visible_pages: Array.isArray(preferences.visible_pages) 
      ? preferences.visible_pages 
      : DEFAULT_VISIBLE_PAGES,
    bottom_bar_pages: Array.isArray(preferences.bottom_bar_pages)
      ? preferences.bottom_bar_pages
      : DEFAULT_BOTTOM_BAR_PAGES,
    show_bottom_bar: preferences.show_bottom_bar ?? true,
    show_burger_menu: preferences.show_burger_menu ?? false,
  } as UserPreferences : null;

  return {
    preferences: effectivePreferences,
    isLoading,
    error,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
