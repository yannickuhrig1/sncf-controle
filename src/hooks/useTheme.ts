import { useEffect } from 'react';
import { getCurrentTheme, applyTheme } from '@/lib/themes';

export function useTheme() {
  useEffect(() => {
    // Appliquer le thème au chargement de l'application
    const theme = getCurrentTheme();
    applyTheme(theme);
  }, []);
}
