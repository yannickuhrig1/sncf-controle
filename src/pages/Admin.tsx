import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Loader2, 
  Users, 
  Building2, 
  Plus, 
  Pencil, 
  Trash2,
  Shield,
  ShieldCheck,
  UserCog,
  Settings,
  Database,
  Download,
  Palette,
  Info,
  Eye,
  EyeOff,
  Train,
  BarChart3,
  History,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { UserPlus, Phone } from 'lucide-react';
import type { Database as DbType } from '@/integrations/supabase/types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { FraudThresholdsSettings } from '@/components/admin/FraudThresholdsSettings';

type Profile = DbType['public']['Tables']['profiles']['Row'];
type Team = DbType['public']['Tables']['teams']['Row'];
type AppRole = DbType['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  agent: 'Agent',
};

const roleBadgeVariants: Record<AppRole, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  manager: 'secondary',
  agent: 'outline',
};

export default function AdminPage() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  
  // Team dialog state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  // User role dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('agent');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Create user dialog state
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserTeamId, setNewUserTeamId] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Page visibility states
  const [pageVisibility, setPageVisibility] = useState<Record<string, boolean>>({});

  // Fetch all profiles (admin only)
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('last_name');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!profile && isAdmin(),
  });

  // Fetch all teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!profile && isAdmin(),
  });

  // Fetch hide_infos_page setting
  const { data: adminSettings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings' as any)
        .select('*');
      if (error) throw error;
      return (data || []) as unknown as Array<{ id: string; key: string; value: any; description: string }>;
    },
    enabled: !!profile && isAdmin(),
  });

  // Load page visibility settings on mount
  useEffect(() => {
    const visibility: Record<string, boolean> = {};
    const pageKeys = ['hide_infos_page', 'hide_statistics_page', 'hide_history_page', 'hide_onboard_page', 'hide_station_page', 'hide_dashboard_page'];
    pageKeys.forEach(key => {
      const setting = adminSettings.find(s => s.key === key);
      visibility[key] = setting?.value === true;
    });
    setPageVisibility(visibility);
  }, [adminSettings]);

  // Toggle page visibility
  const togglePageVisibility = useMutation({
    mutationFn: async ({ key, hide, description }: { key: string; hide: boolean; description: string }) => {
      const existing = adminSettings.find(s => s.key === key);
      if (existing) {
        const { error } = await supabase
          .from('admin_settings' as any)
          .update({ value: hide })
          .eq('key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings' as any)
          .insert({ key, value: hide, description });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Visibilité mise à jour');
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    },
  });

  // Create team mutation
  const createTeam = useMutation({
    mutationFn: async (team: { name: string; description?: string }) => {
      const { error } = await supabase.from('teams').insert(team);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Équipe créée avec succès');
      resetTeamDialog();
    },
    onError: (error) => {
      toast.error('Erreur lors de la création: ' + error.message);
    },
  });

  // Update team mutation
  const updateTeam = useMutation({
    mutationFn: async ({ id, ...team }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase.from('teams').update(team).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Équipe mise à jour');
      resetTeamDialog();
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour: ' + error.message);
    },
  });

  // Delete team mutation
  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Équipe supprimée');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression: ' + error.message);
    },
  });

  // Update user role/team mutation
  const updateUserRole = useMutation({
    mutationFn: async ({ 
      userId, 
      role, 
      teamId 
    }: { 
      userId: string; 
      role: AppRole; 
      teamId: string | null;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role, team_id: teamId })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Utilisateur mis à jour');
      resetRoleDialog();
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour: ' + error.message);
    },
  });

  const resetTeamDialog = () => {
    setTeamDialogOpen(false);
    setEditingTeam(null);
    setTeamName('');
    setTeamDescription('');
  };

  const resetRoleDialog = () => {
    setRoleDialogOpen(false);
    setEditingUser(null);
    setSelectedRole('agent');
    setSelectedTeamId('');
  };

  const openEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description || '');
    setTeamDialogOpen(true);
  };

  const openEditUser = (user: Profile) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setSelectedTeamId(user.team_id || '');
    setRoleDialogOpen(true);
  };

  const handleTeamSubmit = () => {
    if (!teamName.trim()) {
      toast.error('Le nom de l\'équipe est requis');
      return;
    }

    if (editingTeam) {
      updateTeam.mutate({
        id: editingTeam.id,
        name: teamName,
        description: teamDescription || undefined,
      });
    } else {
      createTeam.mutate({
        name: teamName,
        description: teamDescription || undefined,
      });
    }
  };

  const handleRoleSubmit = () => {
    if (!editingUser) return;
    
    updateUserRole.mutate({
      userId: editingUser.user_id,
      role: selectedRole,
      teamId: selectedTeamId || null,
    });
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserFirstName || !newUserLastName) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (newUserPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsCreatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          first_name: newUserFirstName,
          last_name: newUserLastName,
          phone_number: newUserPhone || null,
          team_id: newUserTeamId || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la création');
      }
      
      const result = response.data;
      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success('Agent créé avec succès', {
        description: `${newUserFirstName} ${newUserLastName} (${newUserEmail})`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setCreateUserOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserPhone('');
      setNewUserTeamId('');
    } catch (error: any) {
      toast.error('Erreur: ' + (error.message || 'Impossible de créer le compte'));
    } finally {
      setIsCreatingUser(false);
    }
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return '-';
    const team = teams.find(t => t.id === teamId);
    return team?.name || '-';
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

  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  const isLoading = profilesLoading || teamsLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Administration
          </h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs et les équipes
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Équipes
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Affichage
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Données
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Gestion des utilisateurs
                </CardTitle>
                <Button size="sm" onClick={() => setCreateUserOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Créer un agent
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Rôle</TableHead>
                          <TableHead>Équipe</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles.map((p) => (
                          <TableRow key={p.id} className={!(p as any).is_approved ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                            <TableCell>
                              <div className="font-medium flex items-center gap-2">
                                {p.first_name} {p.last_name}
                                {!(p as any).is_approved && (
                                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                                    En attente
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {p.phone_number || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={roleBadgeVariants[p.role]}>
                                {roleLabels[p.role]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {getTeamName(p.team_id)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {!(p as any).is_approved && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={async () => {
                                      const { error } = await supabase
                                        .from('profiles')
                                        .update({ is_approved: true } as any)
                                        .eq('id', p.id);
                                      if (error) {
                                        toast.error('Erreur: ' + error.message);
                                      } else {
                                        toast.success(`${p.first_name} ${p.last_name} a été approuvé`);
                                        queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
                                      }
                                    }}
                                  >
                                    <ShieldCheck className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditUser(p)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Gestion des équipes
                </CardTitle>
                <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => {
                      setEditingTeam(null);
                      setTeamName('');
                      setTeamDescription('');
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle équipe
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingTeam ? 'Modifier l\'équipe' : 'Nouvelle équipe'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingTeam 
                          ? 'Modifiez les informations de l\'équipe'
                          : 'Créez une nouvelle équipe pour regrouper les agents'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="team-name">Nom de l'équipe</Label>
                        <Input
                          id="team-name"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="Ex: Équipe Paris Nord"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team-description">Description (optionnel)</Label>
                        <Input
                          id="team-description"
                          value={teamDescription}
                          onChange={(e) => setTeamDescription(e.target.value)}
                          placeholder="Description de l'équipe"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={resetTeamDialog}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleTeamSubmit}
                        disabled={createTeam.isPending || updateTeam.isPending}
                      >
                        {(createTeam.isPending || updateTeam.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {editingTeam ? 'Enregistrer' : 'Créer'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : teams.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune équipe créée. Cliquez sur "Nouvelle équipe" pour commencer.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teams.map((team) => (
                          <TableRow key={team.id}>
                            <TableCell className="font-medium">{team.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {team.description || '-'}
                            </TableCell>
                            <TableCell className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditTeam(team)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('Supprimer cette équipe ?')) {
                                    deleteTeam.mutate(team.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Display Settings Tab */}
          <TabsContent value="display" className="space-y-4">
            <FraudThresholdsSettings />
            
            {/* Page Visibility Toggles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Visibilité des pages
                </CardTitle>
                <CardDescription>
                  Activez ou désactivez chaque page de l'application (utile pour la maintenance)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'hide_dashboard_page', label: 'Accueil', icon: Eye, description: 'Page d\'accueil / tableau de bord' },
                  { key: 'hide_onboard_page', label: 'Contrôle à bord', icon: Train, description: 'Formulaire de contrôle en train' },
                  { key: 'hide_station_page', label: 'Contrôle en gare', icon: Building2, description: 'Formulaire de contrôle en gare/quai' },
                  { key: 'hide_statistics_page', label: 'Statistiques', icon: Database, description: 'Graphiques et analyses statistiques' },
                  { key: 'hide_history_page', label: 'Historique', icon: Settings, description: 'Historique et export des contrôles' },
                  { key: 'hide_infos_page', label: 'Infos utiles', icon: Info, description: 'Page d\'informations, FAQ et contacts' },
                ].map(page => (
                  <div key={page.key} className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <page.icon className="h-4 w-4" />
                        {page.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{page.description}</p>
                    </div>
                    <Switch
                      checked={!pageVisibility[page.key]}
                      onCheckedChange={(checked) => {
                        setPageVisibility(prev => ({ ...prev, [page.key]: !checked }));
                        togglePageVisibility.mutate({ key: page.key, hide: !checked, description: `Masquer la page ${page.label}` });
                      }}
                      disabled={togglePageVisibility.isPending}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data & Storage Tab */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Données et stockage
                </CardTitle>
                <CardDescription>
                  Gérez les données et le stockage de l'application
                </CardDescription>
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
                      <SelectItem value="730">2 ans</SelectItem>
                      <SelectItem value="1095">3 ans</SelectItem>
                      <SelectItem value="1825">5 ans</SelectItem>
                      <SelectItem value="3650">10 ans</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Durée de conservation des données de contrôle
                  </p>
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
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
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Role Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
              <DialogDescription>
                {editingUser && `${editingUser.first_name} ${editingUser.last_name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Agent
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Manager
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        Administrateur
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Équipe</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune équipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune équipe</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetRoleDialog}>
                Annuler
              </Button>
              <Button 
                onClick={handleRoleSubmit}
                disabled={updateUserRole.isPending}
              >
                {updateUserRole.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Créer un agent
              </DialogTitle>
              <DialogDescription>
                Créez un nouveau compte agent. L'utilisateur pourra se connecter immédiatement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-first-name">Prénom *</Label>
                  <Input
                    id="new-first-name"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-last-name">Nom *</Label>
                  <Input
                    id="new-last-name"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    placeholder="Dupont"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-phone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-phone"
                    type="tel"
                    className="pl-10"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">Email *</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="agent@sncf.fr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Mot de passe *</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                />
              </div>
              <div className="space-y-2">
                <Label>Équipe</Label>
                <Select value={newUserTeamId} onValueChange={setNewUserTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune équipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune équipe</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateUserOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                {isCreatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer le compte
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
