import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  FileText,
  ChevronDown,
  Smartphone,
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
import { InstallAppButton } from '@/components/InstallAppButton';
import { useState } from 'react';

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

  const [openSections, setOpenSections] = useState({
    appearance: true,
    navigation: true,
    notifications: true,
    data: true,
    app: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isManager = profile?.role === 'manager' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  const availablePages = PAGE_OPTIONS.filter(page => {
    if (page.roleRequired === 'admin' && !isAdmin) return false;
    if (page.roleRequired === 'manager' && !isManager) return false;
    return true;
  });

  const visiblePages = preferences?.visible_pages || DEFAULT_VISIBLE_PAGES;
  const bottomBarPages = preferences?.bottom_bar_pages || DEFAULT_BOTTOM_BAR_PAGES;
  const showBottomBar = preferences?.show_bottom_bar ?? true;
  const showBurgerMenu = preferences?.show_burger_menu ?? false;

  const orderedBurgerPages = [...availablePages].sort((a, b) => {
    const indexA = visiblePages.indexOf(a.id);
    const indexB = visiblePages.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const orderedBottomBarPages = [...availablePages].sort((a, b) => {
    const indexA = bottomBarPages.indexOf(a.id);
    const indexB = bottomBarPages.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const handleToggleBottomBar = (checked: boolean) => {
    if (!checked && !showBurgerMenu) {
      toast.error('Au moins un mode de navigation doit être actif');
      return;
    }
    updatePreferences({ show_bottom_bar: checked });
  };

  const handleToggleBurgerMenu = (checked: boolean) => {
    if (!checked && !showBottomBar) {
      toast.error('Au moins un mode de navigation doit être actif');
      return;
    }
    updatePreferences({ show_burger_menu: checked });
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
      <div className="space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              Paramètres
            </h1>
            <p className="text-sm text-muted-foreground">
              Personnalisez l'application selon vos préférences
            </p>
          </div>
        </div>

        {/* Apparence */}
        <Collapsible open={openSections.appearance} onOpenChange={() => toggleSection('appearance')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Apparence
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${openSections.appearance ? 'rotate-180' : ''}`} />
                </CardTitle>
                <CardDescription>Personnalisez l'affichage de l'application</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Style de thème</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        value: 'sncf',
                        label: 'SNCF Classique',
                        primary: 'hsl(343,100%,38%)',
                        bg: 'hsl(220,20%,97%)',
                        card: '#fff',
                        desc: 'Rouge officiel',
                      },
                      {
                        value: 'colore',
                        label: 'Coloré',
                        primary: 'hsl(180,45%,45%)',
                        bg: 'hsl(210,20%,96%)',
                        card: '#fff',
                        desc: 'Teal pastel',
                      },
                      {
                        value: 'pro',
                        label: 'Professionnel',
                        primary: 'hsl(214,90%,42%)',
                        bg: 'hsl(214,18%,93%)',
                        card: '#fff',
                        desc: 'Acier électrique',
                      },
                      {
                        value: 'moderne',
                        label: 'Moderne',
                        primary: 'hsl(239,68%,60%)',
                        bg: 'hsl(240,15%,97%)',
                        card: '#fff',
                        desc: 'Violet vibrant',
                      },
                    ].map((t) => {
                      const isSelected = (preferences?.theme_variant || 'sncf') === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          disabled={isUpdating}
                          onClick={() => {
                            const root = document.documentElement;
                            root.classList.remove('theme-colore', 'theme-pro', 'theme-moderne');
                            if (t.value === 'colore') root.classList.add('theme-colore');
                            else if (t.value === 'pro') root.classList.add('theme-pro');
                            else if (t.value === 'moderne') root.classList.add('theme-moderne');
                            updatePreferences({ theme_variant: t.value as 'sncf' | 'colore' | 'pro' | 'moderne' });
                          }}
                          className={cn(
                            'relative flex flex-col items-start rounded-xl border-2 p-3 text-left transition-all',
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:border-muted-foreground/30'
                          )}
                        >
                          {/* Mini preview */}
                          <div
                            className="w-full h-8 rounded-md mb-2 flex items-center px-2 gap-1.5"
                            style={{ background: t.bg }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ background: t.primary }} />
                            <div className="flex-1 h-1.5 rounded-full bg-black/8" />
                            <div className="w-4 h-2 rounded" style={{ background: t.primary, opacity: 0.7 }} />
                          </div>
                          <span className="text-xs font-semibold leading-tight">{t.label}</span>
                          <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                          {isSelected && (
                            <div
                              className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ background: t.primary }}
                            >
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
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

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Orientation des exports PDF
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Définit l'orientation par défaut pour les exports PDF
                  </p>
                  <Select
                    value={preferences?.pdf_orientation || 'auto'}
                    onValueChange={(value: 'portrait' | 'landscape' | 'auto') =>
                      updatePreferences({ pdf_orientation: value })
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Automatique
                        </div>
                      </SelectItem>
                      <SelectItem value="portrait">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-3 border border-foreground/50 rounded-sm" />
                          Portrait
                        </div>
                      </SelectItem>
                      <SelectItem value="landscape">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-4 border border-foreground/50 rounded-sm" />
                          Paysage
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Navigation */}
        <Collapsible open={openSections.navigation} onOpenChange={() => toggleSection('navigation')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Navigation
                  <div className="flex gap-1 ml-auto mr-2">
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
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSections.navigation ? 'rotate-180' : ''}`} />
                </CardTitle>
                <CardDescription>Configurez les navigations et les pages visibles</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <PanelBottom className="h-4 w-4" />
                      Barre de navigation en bas
                      {showBottomBar && <Check className="h-4 w-4 text-green-500" />}
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

                {showBottomBar && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      <Label>Pages dans la barre du bas</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Glissez pour réordonner, utilisez les toggles pour afficher/masquer
                    </p>
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleBottomBarDragEnd}>
                      <SortableContext items={orderedBottomBarPages.map(p => p.id)} strategy={verticalListSortingStrategy}>
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

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Menu className="h-4 w-4" />
                      Menu burger
                      {showBurgerMenu && <Check className="h-4 w-4 text-green-500" />}
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

                {showBurgerMenu && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <Label>Pages dans le menu burger</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Glissez pour réordonner, utilisez les toggles pour afficher/masquer
                    </p>
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleBurgerDragEnd}>
                      <SortableContext items={orderedBurgerPages.map(p => p.id)} strategy={verticalListSortingStrategy}>
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
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Notifications */}
        <Collapsible open={openSections.notifications} onOpenChange={() => toggleSection('notifications')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${openSections.notifications ? 'rotate-180' : ''}`} />
                </CardTitle>
                <CardDescription>Gérez vos alertes et notifications</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
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
                    onCheckedChange={(checked) => updatePreferences({ notifications_push: checked })}
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
                    onCheckedChange={(checked) => updatePreferences({ notifications_fraud_alerts: checked })}
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
                    onCheckedChange={(checked) => updatePreferences({ notifications_new_controls: checked })}
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
                    onCheckedChange={(checked) => updatePreferences({ notifications_email: checked })}
                    disabled={isUpdating}
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Données */}
        <Collapsible open={openSections.data} onOpenChange={() => toggleSection('data')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Données et stockage
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${openSections.data ? 'rotate-180' : ''}`} />
                </CardTitle>
                <CardDescription>Gérez le cache et les exports</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sauvegarde automatique</Label>
                    <p className="text-xs text-muted-foreground">
                      Sauvegarde les brouillons automatiquement
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.data_auto_save ?? true}
                    onCheckedChange={(checked) => updatePreferences({ data_auto_save: checked })}
                    disabled={isUpdating}
                  />
                </div>
                <Separator />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const data = { preferences, exportDate: new Date().toISOString() };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `sncf-controles-settings-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Paramètres exportés');
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Vider le cache
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Vider le cache ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action supprimera tous les brouillons et données en cache.
                          Vos contrôles enregistrés ne seront pas affectés.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                          Object.keys(localStorage).forEach(key => {
                            if (key.startsWith('form-draft-') || key.startsWith('onboard-control')) {
                              localStorage.removeItem(key);
                            }
                          });
                          toast.success('Cache vidé avec succès');
                        }}>
                          Vider
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Application */}
        <Collapsible open={openSections.app} onOpenChange={() => toggleSection('app')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Application
                  <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${openSections.app ? 'rotate-180' : ''}`} />
                </CardTitle>
                <CardDescription>Installation et informations</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Installer l'application
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez l'app à votre écran d'accueil
                    </p>
                  </div>
                  <InstallAppButton variant="outline" size="sm" />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

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
