import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Settings
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Équipes
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Gestion des utilisateurs
                </CardTitle>
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
                          <TableRow key={p.id}>
                            <TableCell>
                              <div className="font-medium">
                                {p.first_name} {p.last_name}
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditUser(p)}
                              >
                                <Pencil className="h-4 w-4" />
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
      </div>
    </AppLayout>
  );
}
