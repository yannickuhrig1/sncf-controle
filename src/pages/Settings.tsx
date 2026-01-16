import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences, PageId, DEFAULT_VISIBLE_PAGES } from '@/hooks/useUserPreferences';
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
} from 'lucide-react';
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
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortablePageItem } from '@/components/settings/SortablePageItem';

const PAGE_OPTIONS: { id: PageId; label: string; canDisable: boolean }[] = [
  { id: 'dashboard', label: 'Accueil', canDisable: false },
  { id: 'onboard', label: 'Contrôle à bord', canDisable: true },
  { id: 'station', label: 'Contrôle en gare', canDisable: true },
  { id: 'statistics', label: 'Statistiques', canDisable: true },
  { id: 'history', label: 'Historique', canDisable: true },
];

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const {
    preferences,
    isLoading: prefsLoading,
    updatePreferences,
    isUpdating,
  } = useUserPreferences();

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  
  // Order PAGE_OPTIONS based on current visible_pages order
  const orderedPageOptions = [...PAGE_OPTIONS].sort((a, b) => {
    const indexA = visiblePages.indexOf(a.id);
    const indexB = visiblePages.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

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

  const togglePage = (pageId: PageId) => {
    if (!preferences) return;
    
    const currentPages = preferences.visible_pages || DEFAULT_VISIBLE_PAGES;
    const newPages = currentPages.includes(pageId)
      ? currentPages.filter(p => p !== pageId)
      : [...currentPages, pageId];
    
    updatePreferences({ visible_pages: newPages });
  };

  const handleDragEnd = (event: DragEndEvent) => {
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
  const currentNavStyle = preferences?.navigation_style || 'bottom';

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
              <Label>Thème</Label>
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
          </CardContent>
        </Card>

        {/* Navigation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Navigation
            </CardTitle>
            <CardDescription>Configurez le style et les pages visibles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Style de navigation</Label>
              <Select
                value={currentNavStyle}
                onValueChange={(value: 'bottom' | 'burger') =>
                  updatePreferences({ navigation_style: value })
                }
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      Barre en bas
                    </div>
                  </SelectItem>
                  <SelectItem value="burger">
                    <div className="flex items-center gap-2">
                      <Menu className="h-4 w-4" />
                      Menu burger
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <Label>Pages visibles</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Glissez pour réordonner, utilisez les toggles pour afficher/masquer
              </p>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedPageOptions.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {orderedPageOptions.map((page) => (
                      <SortablePageItem
                        key={page.id}
                        id={page.id}
                        label={page.label}
                        isVisible={visiblePages.includes(page.id)}
                        canDisable={page.canDisable}
                        isUpdating={isUpdating}
                        onToggle={() => togglePage(page.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
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

        {/* Data & Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Données et stockage
            </CardTitle>
            <CardDescription>Gérez vos données locales</CardDescription>
          </CardHeader>
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
                onCheckedChange={(checked) =>
                  updatePreferences({ data_auto_save: checked })
                }
                disabled={isUpdating}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Conservation de l'historique</Label>
              <Select
                value={String(preferences?.data_keep_history_days || 90)}
                onValueChange={(value) =>
                  updatePreferences({ data_keep_history_days: parseInt(value) })
                }
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="60">60 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                  <SelectItem value="180">6 mois</SelectItem>
                  <SelectItem value="365">1 an</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" onClick={handleExportData}>
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
                    <AlertDialogAction onClick={handleClearCache}>
                      Vider
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

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
