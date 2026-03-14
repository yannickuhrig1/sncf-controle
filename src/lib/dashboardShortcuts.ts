export interface DashboardShortcut {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface ShortcutOption {
  id: string;
  defaultLabel: string;
  defaultDescription: string;
  href: string;
  iconName: string;
  /** If set, only show this option to users with this role or above */
  roleRequired?: 'manager' | 'admin';
}

export const SHORTCUT_OPTIONS: ShortcutOption[] = [
  { id: 'onboard',    defaultLabel: 'Contrôle à bord',       defaultDescription: 'Nouveau contrôle en train',      href: '/onboard',               iconName: 'Train' },
  { id: 'station',    defaultLabel: 'Contrôle en gare',      defaultDescription: 'Nouveau contrôle en gare',       href: '/station',               iconName: 'Building2' },
  { id: 'embarkment', defaultLabel: 'Départs / Arrivées',     defaultDescription: 'Infos départs & arrivées en gare', href: '/infos?tile=departures',   iconName: 'ArrowUpFromLine' },
  { id: 'history',    defaultLabel: 'Historique',            defaultDescription: 'Consulter les contrôles passés', href: '/history',               iconName: 'Clock' },
  { id: 'statistics', defaultLabel: 'Statistiques',          defaultDescription: 'Voir les statistiques',          href: '/statistics',            iconName: 'BarChart3' },
  { id: 'infos',      defaultLabel: 'Infos utiles',          defaultDescription: 'Informations et ressources',     href: '/infos',                 iconName: 'Info' },
  { id: 'manager',    defaultLabel: 'Manager',               defaultDescription: 'Espace manager',                 href: '/manager',               iconName: 'Shield', roleRequired: 'manager' },
];

export const DEFAULT_SHORTCUTS: DashboardShortcut[] = [
  { id: 'onboard', label: 'Contrôle à bord',  description: 'Nouveau contrôle en train', enabled: true },
  { id: 'station', label: 'Contrôle en gare', description: 'Nouveau contrôle en gare',  enabled: true },
];

const STORAGE_KEY = 'sncf_dashboard_shortcuts';
const CHANGE_EVENT = 'sncf-shortcuts-changed';

export function loadShortcuts(): DashboardShortcut[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SHORTCUTS;
    return parsed;
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcuts(shortcuts: DashboardShortcut[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function resetShortcuts(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export { CHANGE_EVENT as SHORTCUTS_CHANGE_EVENT };
