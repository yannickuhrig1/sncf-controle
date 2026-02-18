export type Theme = 'light' | 'dark' | 'pro' | 'modern';

export interface ThemeConfig {
  id: Theme;
  name: string;
  description: string;
  isPremium?: boolean;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    input: string;
    ring: string;
    destructive: string;
    destructiveForeground: string;
  };
}

export const themes: Record<Theme, ThemeConfig> = {
  light: {
    id: 'light',
    name: 'Clair',
    description: 'Thème clair classique',
    colors: {
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      card: '0 0% 100%',
      cardForeground: '222.2 84% 4.9%',
      primary: '221.2 83.2% 53.3%',
      primaryForeground: '210 40% 98%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      muted: '210 40% 96.1%',
      mutedForeground: '215.4 16.3% 46.9%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '221.2 83.2% 53.3%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '210 40% 98%',
    },
  },
  dark: {
    id: 'dark',
    name: 'Sombre',
    description: 'Thème sombre classique',
    colors: {
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      card: '222.2 84% 4.9%',
      cardForeground: '210 40% 98%',
      primary: '217.2 91.2% 59.8%',
      primaryForeground: '222.2 47.4% 11.2%',
      secondary: '217.2 32.6% 17.5%',
      secondaryForeground: '210 40% 98%',
      accent: '217.2 32.6% 17.5%',
      accentForeground: '210 40% 98%',
      muted: '217.2 32.6% 17.5%',
      mutedForeground: '215 20.2% 65.1%',
      border: '217.2 32.6% 17.5%',
      input: '217.2 32.6% 17.5%',
      ring: '224.3 76.3% 48%',
      destructive: '0 62.8% 30.6%',
      destructiveForeground: '210 40% 98%',
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Thème professionnel premium avec touches dorées',
    isPremium: true,
    colors: {
      background: '240 10% 6%',
      foreground: '0 0% 98%',
      card: '240 8% 10%',
      cardForeground: '0 0% 98%',
      primary: '43 96% 56%', // Or/doré
      primaryForeground: '240 10% 6%',
      secondary: '240 6% 15%',
      secondaryForeground: '0 0% 98%',
      accent: '43 74% 49%',
      accentForeground: '240 10% 6%',
      muted: '240 6% 15%',
      mutedForeground: '240 5% 64.9%',
      border: '240 6% 20%',
      input: '240 6% 20%',
      ring: '43 96% 56%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 98%',
    },
  },
  modern: {
    id: 'modern',
    name: 'Moderne',
    description: 'Thème moderne premium avec dégradés violets/bleus',
    isPremium: true,
    colors: {
      background: '250 24% 10%',
      foreground: '250 5% 95%',
      card: '252 24% 14%',
      cardForeground: '250 5% 95%',
      primary: '263 70% 60%', // Violet vibrant
      primaryForeground: '250 5% 95%',
      secondary: '252 20% 20%',
      secondaryForeground: '250 5% 95%',
      accent: '210 100% 60%', // Bleu cyan
      accentForeground: '250 24% 10%',
      muted: '252 20% 20%',
      mutedForeground: '250 10% 70%',
      border: '252 20% 25%',
      input: '252 20% 25%',
      ring: '263 70% 60%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '250 5% 95%',
    },
  },
};

export function getTheme(theme: Theme): ThemeConfig {
  return themes[theme];
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const themeConfig = getTheme(theme);

  Object.entries(themeConfig.colors).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });

  // Stocker le thème actuel
  localStorage.setItem('app-theme', theme);
}

export function getCurrentTheme(): Theme {
  const stored = localStorage.getItem('app-theme') as Theme;
  return stored && themes[stored] ? stored : 'light';
}
