import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme from localStorage before React renders to prevent flash
const initializeTheme = () => {
  try {
    // Try to get theme preference from localStorage cache
    const cachedPrefs = localStorage.getItem('user_preferences_cache');
    if (cachedPrefs) {
      const prefs = JSON.parse(cachedPrefs);
      const root = document.documentElement;
      
      // Apply theme variant
      root.classList.remove('theme-colore', 'theme-pro', 'theme-moderne');
      if (prefs.theme_variant === 'colore') {
        root.classList.add('theme-colore');
      } else if (prefs.theme_variant === 'pro') {
        root.classList.add('theme-pro');
      } else if (prefs.theme_variant === 'moderne') {
        root.classList.add('theme-moderne');
      }
      
      // Apply dark/light mode
      if (prefs.theme === 'dark') {
        root.classList.add('dark');
      } else if (prefs.theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        }
      }
    }
  } catch {
    // Silently fail if localStorage is not available
  }
};

initializeTheme();

// Initialize brightness from user settings
try {
  const bg   = parseInt(localStorage.getItem('sncf_bg_brightness')   || '100');
  const card = parseInt(localStorage.getItem('sncf_card_brightness') || '100');
  if (bg !== 100 || card !== 100) {
    const el = document.createElement('style');
    el.id = 'user-brightness-style';
    const bgF   = bg / 100;
    const cardF = card / bg;
    const parts: string[] = [];
    if (bgF !== 1)                   parts.push(`#root{filter:brightness(${bgF})}`);
    if (Math.abs(cardF - 1) > 0.001) parts.push(`#root .bg-card{filter:brightness(${cardF.toFixed(4)})!important}`);
    el.textContent = parts.join('');
    document.head.appendChild(el);
  }
} catch { /* silently ignore */ }

createRoot(document.getElementById("root")!).render(<App />);
