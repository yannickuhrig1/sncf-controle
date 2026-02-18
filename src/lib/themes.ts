// Theme variant system — matches CSS classes in index.css
export type ThemeVariant = 'sncf' | 'colore' | 'pro' | 'moderne';
export type ThemeMode = 'light' | 'dark' | 'system';

// Legacy Theme type alias kept for backward compatibility
export type Theme = ThemeVariant;

export interface ThemeConfig {
  id: ThemeVariant;
  name: string;
  description: string;
  cssClass?: string; // CSS class added to <html>
}

export const themes: Record<ThemeVariant, ThemeConfig> = {
  sncf: {
    id: 'sncf',
    name: 'SNCF Classique',
    description: 'Rouge officiel SNCF',
    cssClass: undefined,
  },
  colore: {
    id: 'colore',
    name: 'Coloré',
    description: 'Sections colorées pastel',
    cssClass: 'theme-colore',
  },
  pro: {
    id: 'pro',
    name: 'Professionnel',
    description: 'Bleu marine sobre',
    cssClass: 'theme-pro',
  },
  moderne: {
    id: 'moderne',
    name: 'Moderne',
    description: 'Violet vibrant',
    cssClass: 'theme-moderne',
  },
};

const ALL_THEME_CLASSES = ['theme-colore', 'theme-pro', 'theme-moderne'];

export function applyThemeVariant(variant: ThemeVariant): void {
  const root = document.documentElement;
  // Remove all theme variant classes
  root.classList.remove(...ALL_THEME_CLASSES);
  // Apply the new one if needed
  const cssClass = themes[variant]?.cssClass;
  if (cssClass) root.classList.add(cssClass);
  localStorage.setItem('app-theme-variant', variant);
}

export function getCurrentThemeVariant(): ThemeVariant {
  const stored = localStorage.getItem('app-theme-variant') as ThemeVariant;
  return stored && themes[stored] ? stored : 'sncf';
}

export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
  localStorage.setItem('app-theme-mode', mode);
}

export function getCurrentThemeMode(): ThemeMode {
  const stored = localStorage.getItem('app-theme-mode') as ThemeMode;
  return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
}

// ── Legacy shim (used by ThemeToggle.tsx + useTheme.ts) ──────────────────────
// Maps old theme names to the new variant+mode system so old callers keep working.

/** @deprecated Use applyThemeVariant / applyThemeMode instead */
export function applyTheme(theme: Theme): void {
  applyThemeVariant(theme as ThemeVariant);
}

/** @deprecated Use getCurrentThemeVariant instead */
export function getCurrentTheme(): Theme {
  return getCurrentThemeVariant();
}

export function getTheme(theme: Theme): ThemeConfig {
  return themes[theme as ThemeVariant] ?? themes.sncf;
}
