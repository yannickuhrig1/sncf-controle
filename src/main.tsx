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
      if (prefs.theme_variant === 'colore') {
        root.classList.add('theme-colore');
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

createRoot(document.getElementById("root")!).render(<App />);
