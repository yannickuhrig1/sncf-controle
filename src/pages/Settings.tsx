import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Settings as SettingsIcon,
  Bell,
  Palette,
  Shield,
  Smartphone,
  Moon,
  Sun,
  Monitor,
  Save,
  RotateCcw,
  Database,
  Trash2,
  Download,
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

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    push: boolean;
    email: boolean;
    fraudAlerts: boolean;
    newControls: boolean;
  };
  display: {
    compactMode: boolean;
    showTotals: boolean;
    defaultPage: string;
  };
  data: {
    autoSave: boolean;
    keepHistoryDays: number;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  notifications: {
    push: true,
    email: false,
    fraudAlerts: true,
    newControls: false,
  },
  display: {
    compactMode: false,
    showTotals: true,
    defaultPage: '/',
  },
  data: {
    autoSave: true,
    keepHistoryDays: 90,
  },
};

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('user-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('user-settings', JSON.stringify(settings));
      
      // Apply theme
      const root = document.documentElement;
      if (settings.theme === 'dark') {
        root.classList.add('dark');
      } else if (settings.theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
      
      toast({
        title: 'Paramètres sauvegardés',
        description: 'Vos préférences ont été enregistrées',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('user-settings');
    toast({
      title: 'Paramètres réinitialisés',
      description: 'Les paramètres par défaut ont été restaurés',
    });
  };

  const handleClearCache = () => {
    // Clear form drafts
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('form-draft-') || key.startsWith('onboard-control')) {
        localStorage.removeItem(key);
      }
    });
    toast({
      title: 'Cache vidé',
      description: 'Les brouillons et données en cache ont été supprimés',
    });
  };

  const handleExportData = () => {
    const data = {
      settings,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sncf-controles-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Export réussi',
      description: 'Vos paramètres ont été exportés',
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
                value={settings.theme}
                onValueChange={(value: 'light' | 'dark' | 'system') =>
                  setSettings((s) => ({ ...s, theme: value }))
                }
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
                checked={settings.display.compactMode}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({
                    ...s,
                    display: { ...s.display, compactMode: checked },
                  }))
                }
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
                checked={settings.display.showTotals}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({
                    ...s,
                    display: { ...s.display, showTotals: checked },
                  }))
                }
              />
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
                checked={settings.notifications.push}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, push: checked },
                  }))
                }
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
                checked={settings.notifications.fraudAlerts}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, fraudAlerts: checked },
                  }))
                }
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
                checked={settings.notifications.newControls}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, newControls: checked },
                  }))
                }
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
                checked={settings.notifications.email}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({
                    ...s,
                    notifications: { ...s.notifications, email: checked },
                  }))
                }
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
                checked={settings.data.autoSave}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({
                    ...s,
                    data: { ...s.data, autoSave: checked },
                  }))
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Conservation de l'historique</Label>
              <Select
                value={String(settings.data.keepHistoryDays)}
                onValueChange={(value) =>
                  setSettings((s) => ({
                    ...s,
                    data: { ...s.data, keepHistoryDays: parseInt(value) },
                  }))
                }
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Réinitialiser
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Réinitialiser les paramètres ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tous vos paramètres seront remis aux valeurs par défaut.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>
                  Réinitialiser
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AppLayout>
  );
}
