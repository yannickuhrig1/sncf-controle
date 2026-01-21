import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences, PageId, DEFAULT_VISIBLE_PAGES, DEFAULT_BOTTOM_BAR_PAGES } from '@/hooks/useUserPreferences';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2,
  Settings as SettingsIcon,
  Bell,
  Palette,
  Moon,
  Sun,
  Monitor,
  Database,
  Trash2,
  Download,
  Navigation,
  Menu,
  LayoutGrid,
  Eye,
  PanelBottom,
  Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortablePageItem } from '@/components/settings/SortablePageItem';

const PAGE_OPTIONS: { id: PageId; label: string; canDisable: boolean; roleRequired?: 'manager' | 'admin' }[] = [
  { id: 'dashboard', label: 'Accueil', canDisable: false },
  { id: 'onboard', label: 'Contrôle à bord', canDisable: true },
  { id: 'station', label: 'Contrôle en gare', canDisable: true },
  { id: 'statistics', label: 'Statistiques', canDisable: true },
  { id: 'history', label: 'Historique', canDisable: true },
  { id: 'manager', label: 'Manager', canDisable: true, roleRequired: 'manager' },
  { id: 'profile', label: 'Profil', canDisable: true },
  { id: 'settings', label: 'Paramètres', canDisable: true },
  { id: 'admin', label: 'Administration', canDisable: true, roleRequired: 'admin' },
];

export default function Settings() {
  const { user, profile, loading: authLoading } = useAuth();
  const {
    preferences,
    isLoading: prefsLoading,
    updatePreferences,
    isUpdating,
  } = useUserPreferences();

  const isManager = profile?.role === 'manager' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  // Filter pages based on user role
  const availablePages = PAGE_OPTIONS.filter(page => {
    if (page.roleRequired === 'admin' && !isAdmin) return false;
    if (page.roleRequired === 'manager' && !isManager) return false;
    return true;
  });

  const visiblePages = preferences?.visible_pages || DEFAULT_VISIBLE_PAGES;
  const bottomBarPages = preferences?.bottom_bar_pages || DEFAULT_BOTTOM_BAR_PAGES;
  const showBottomBar = preferences?.show_bottom_bar ?? true;
  const showBurgerMenu = preferences?.show_burger_menu ?? false;

  // Order available pages based on current visible_pages order (for burger menu)
  const orderedBurgerPages = [...availablePages].sort((a, b) => {
    const indexA = visiblePages.indexOf(a.id);
    const indexB = visiblePages.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Order available pages based on current bottom_bar_pages order
  const orderedBottomBarPages = [...availablePages].sort((a, b) => {
    const indexA = bottomBarPages.indexOf(a.id);
    const indexB = bottomBarPages.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Handler for toggling navigation modes with constraint
  const handleToggleBottomBar = (checked: boolean) => {
    // Can't disable both - if burger is off and trying to turn off bottom bar, prevent it
    if (!checked && !showBurgerMenu) {
      toast.error('Au moins un mode de navigation doit être actif');
      return;
    }
    updatePreferences({ show_bottom_bar: checked });
  };

  const handleToggleBurgerMenu = (checked: boolean) => {
    // Can't disable both - if bottom bar is off and trying to turn off burger, prevent it
    if (!checked && !showBottomBar) {
      toast.error('Au moins un mode de navigation doit être actif');
      return;
    }
    updatePreferences({ show_burger_menu: checked });
  };

  const handleClearCache = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('form-draft-') || key.startsWith('onboard-control')) {
        localStorage.removeItem(key);
      }
    });
    toast.success('Cache vidé avec succès');
  };

  const handleExportData = () => {
    const data = {
      preferences,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sncf-controles-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Paramètres exportés');
  };

  const toggleBurgerPage = (pageId: PageId) => {
    if (!preferences) return;
    
    const currentPages = preferences.visible_pages || DEFAULT_VISIBLE_PAGES;
    const newPages = currentPages.includes(pageId)
      ? currentPages.filter(p => p !== pageId)
      : [...currentPages, pageId];
    
    updatePreferences({ visible_pages: newPages });
  };

  const toggleBottomBarPage = (pageId: PageId) => {
    if (!preferences) return;

    const currentPages = Array.isArray(preferences.bottom_bar_pages)
      ? [...preferences.bottom_bar_pages]
      : [...DEFAULT_BOTTOM_BAR_PAGES];

    const newPages = currentPages.includes(pageId)
      ? currentPages.filter(p => p !== pageId)
      : [...currentPages, pageId];

    updatePreferences({ bottom_bar_pages: newPages });
  };

  const handleBurgerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const currentPages = visiblePages.length > 0 ? [...visiblePages] : [...DEFAULT_VISIBLE_PAGES];
      
      const oldIndex = currentPages.indexOf(active.id as PageId);
      const newIndex = currentPages.indexOf(over.id as PageId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(currentPages, oldIndex, newIndex);
        updatePreferences({ visible_pages: newOrder });
      }
    }
  };

  const handleBottomBarDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const currentPages = bottomBarPages.length > 0 ? [...bottomBarPages] : [...DEFAULT_BOTTOM_BAR_PAGES];
      
      const oldIndex = currentPages.indexOf(active.id as PageId);
      const newIndex = currentPages.indexOf(over.id as PageId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(currentPages, oldIndex, newIndex);
        updatePreferences({ bottom_bar_pages: newOrder });
      }
    }
  };

  if (authLoading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const currentTheme = preferences?.theme || 'system';

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Paramètres</h1>
            <p className="text-sm text-muted-foreground">
              Personnalisez l'application selon vos préférences
            </p>
          </div>
        </div>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Apparence
            </CardTitle>
            <CardDescription>Personnalisez l'affichage de l'application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Style de thème</Label>
              <Select
                value={preferences?.theme_variant || 'sncf'}
                onValueChange={(value: 'sncf' | 'colore') => {
                  const root = document.documentElement;
                  root.classList.remove('theme-colore');
                  if (value === 'colore') {
                    root.classList.add('theme-colore');
                  }
                  updatePreferences({ theme_variant: value });
                }}
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sncf">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-[hsl(343,100%,38%)]" />
                      SNCF Classique
                    </div>
                  </SelectItem>
                  <SelectItem value="colore">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-[hsl(180,45%,45%)]" />
                      Coloré
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Mode d'affichage</Label>
              <Select
                value={currentTheme}
                onValueChange={(value: 'light' | 'dark' | 'system') =>
                  updatePreferences({ theme: value })
                }
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Clair
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Sombre
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Système
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mode compact</Label>
                <p className="text-xs text-muted-foreground">
                  Réduit l'espacement pour afficher plus d'informations
                </p>
              </div>
              <Switch
                checked={preferences?.display_compact_mode || false}
                onCheckedChange={(checked) =>
                  updatePreferences({ display_compact_mode: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Afficher les totaux</Label>
                <p className="text-xs text-muted-foreground">
                  Affiche les totaux en euros dans les listes
                </p>
              </div>
              <Switch
                checked={preferences?.display_show_totals ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ display_show_totals: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Graphique évolution fraude</Label>
                <p className="text-xs text-muted-foreground">
                  Affiche le graphique d'évolution du taux de fraude sur la page "Contrôle à bord"
                </p>
              </div>
              <Switch
                checked={preferences?.show_onboard_fraud_chart ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ show_onboard_fraud_chart: checked })
                }
                disabled={isUpdating}
              />
            </div>
          </CardContent>
        </Card>

        {/* Navigation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Navigation
              <div className="flex gap-1 ml-auto">
                {showBottomBar && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <PanelBottom className="h-3 w-3" />
                    Barre
                  </Badge>
                )}
                {showBurgerMenu && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Menu className="h-3 w-3" />
                    Menu
                  </Badge>
                )}
              </div>
            </CardTitle>
            <CardDescription>Configurez les navigations et les pages visibles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bottom Bar Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <PanelBottom className="h-4 w-4" />
                  Barre de navigation en bas
                  {showBottomBar && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Affiche une barre de navigation fixe en bas de l'écran
                </p>
              </div>
              <Switch
                checked={showBottomBar}
                onCheckedChange={handleToggleBottomBar}
                disabled={isUpdating}
              />
            </div>

            {/* Bottom Bar Pages - Only show if bottom bar is enabled */}
            {showBottomBar && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <Label>Pages dans la barre du bas</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Glissez pour réordonner, utilisez les toggles pour afficher/masquer
                </p>
                
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleBottomBarDragEnd}
                >
                  <SortableContext
                    items={orderedBottomBarPages.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {orderedBottomBarPages.map((page) => (
                        <SortablePageItem
                          key={page.id}
                          id={page.id}
                          label={page.label}
                          isVisible={bottomBarPages.includes(page.id)}
                          canDisable={page.canDisable}
                          isUpdating={isUpdating}
                          onToggle={() => toggleBottomBarPage(page.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            <Separator />

            {/* Burger Menu Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  Menu burger
                  {showBurgerMenu && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Affiche un menu hamburger dans le header
                </p>
              </div>
              <Switch
                checked={showBurgerMenu}
                onCheckedChange={handleToggleBurgerMenu}
                disabled={isUpdating}
              />
            </div>

            {/* Burger Menu Pages - Only show if burger menu is enabled */}
            {showBurgerMenu && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <Label>Pages dans le menu burger</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Glissez pour réordonner, utilisez les toggles pour afficher/masquer
                </p>
                
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleBurgerDragEnd}
                >
                  <SortableContext
                    items={orderedBurgerPages.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {orderedBurgerPages.map((page) => (
                        <SortablePageItem
                          key={page.id}
                          id={page.id}
                          label={page.label}
                          isVisible={visiblePages.includes(page.id)}
                          canDisable={page.canDisable}
                          isUpdating={isUpdating}
                          onToggle={() => toggleBurgerPage(page.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
            <CardDescription>Gérez vos alertes et notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications push</Label>
                <p className="text-xs text-muted-foreground">
                  Recevez des notifications sur votre appareil
                </p>
              </div>
              <Switch
                checked={preferences?.notifications_push ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ notifications_push: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertes fraude</Label>
                <p className="text-xs text-muted-foreground">
                  Alertes quand le taux de fraude dépasse le seuil
                </p>
              </div>
              <Switch
                checked={preferences?.notifications_fraud_alerts ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences({ notifications_fraud_alerts: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Nouveaux contrôles</Label>
                <p className="text-xs text-muted-foreground">
                  Notifications pour les contrôles de l'équipe
                </p>
              </div>
              <Switch
                checked={preferences?.notifications_new_controls ?? false}
                onCheckedChange={(checked) =>
                  updatePreferences({ notifications_new_controls: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications email</Label>
                <p className="text-xs text-muted-foreground">
                  Recevez un résumé par email
                </p>
              </div>
              <Switch
                checked={preferences?.notifications_email ?? false}
                onCheckedChange={(checked) =>
                  updatePreferences({ notifications_email: checked })
                }
                disabled={isUpdating}
              />
            </div>
          </CardContent>
        </Card>

        {/* Removed Data & Storage - moved to Admin */}

        {/* Sync indicator */}
        {isUpdating && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Synchronisation...
          </div>
        )}
      </div>
    </AppLayout>
  );
}
