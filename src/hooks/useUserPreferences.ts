import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type NavigationStyle = 'bottom' | 'burger';

export type PageId = 'dashboard' | 'onboard' | 'station' | 'statistics' | 'history' | 'settings' | 'admin' | 'profile' | 'manager';

export type HistoryViewMode = 'list' | 'table';

export type PdfOrientation = 'portrait' | 'landscape' | 'auto';

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  theme_variant: 'sncf' | 'colore';
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
  show_onboard_fraud_chart: boolean;
  history_view_mode: HistoryViewMode;
  pdf_orientation: PdfOrientation;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_VISIBLE_PAGES: PageId[] = ['dashboard', 'onboard', 'station', 'statistics', 'history', 'profile', 'settings'];
export const DEFAULT_BOTTOM_BAR_PAGES: PageId[] = ['dashboard', 'onboard', 'station', 'statistics', 'history'];

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  theme: 'system',
  theme_variant: 'sncf',
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
  show_onboard_fraud_chart: true,
  history_view_mode: 'list',
  pdf_orientation: 'auto',
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
        
        // Apply theme for new preferences
        applyTheme(newPrefs as UserPreferences);
        return newPrefs as UserPreferences;
      }

      // Apply theme when preferences are loaded
      applyTheme(data as UserPreferences);
      return data as UserPreferences;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Helper function to apply theme
  const applyTheme = (prefs: UserPreferences) => {
    const root = document.documentElement;
    
    // Apply dark/light mode
    if (prefs.theme === 'dark') {
      root.classList.add('dark');
    } else if (prefs.theme === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Apply theme variant
    root.classList.remove('theme-colore');
    if (prefs.theme_variant === 'colore') {
      root.classList.add('theme-colore');
    }

    // Cache preferences for initial load
    try {
      localStorage.setItem('user_preferences_cache', JSON.stringify({
        theme: prefs.theme,
        theme_variant: prefs.theme_variant,
      }));
    } catch {
      // Silently fail if localStorage is not available
    }
  };

  const updatePreferences = useMutation({
    mutationFn: async (
      updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
    ) => {
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
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['user-preferences', user?.id] });

      const previous = queryClient.getQueryData<UserPreferences | null>([
        'user-preferences',
        user?.id,
      ]);

      // Optimistic merge
      if (previous) {
        queryClient.setQueryData(['user-preferences', user?.id], {
          ...previous,
          ...updates,
        });
      }

      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user-preferences', user?.id], data);
      applyTheme(data);
    },
    onError: (error, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['user-preferences', user?.id], context.previous);
      }
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
    theme_variant: preferences.theme_variant ?? 'sncf',
    show_onboard_fraud_chart: preferences.show_onboard_fraud_chart ?? true,
    history_view_mode: (preferences as any).history_view_mode ?? 'list',
    pdf_orientation: (preferences as any).pdf_orientation ?? 'auto',
  } as UserPreferences : null;

  return {
    preferences: effectivePreferences,
    isLoading,
    error,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
