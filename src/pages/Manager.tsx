import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Loader2,
  Users,
  UserCheck,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Plus,
  X,
  UserPlus,
  Search,
} from 'lucide-react';
import { HourlyHeatmap } from '@/components/manager/HourlyHeatmap';
import { AuditTrailView } from '@/components/manager/AuditTrailView';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Control = Database['public']['Tables']['controls']['Row'];
type Team   = Database['public']['Tables']['teams']['Row'];

export default function ManagerPage() {
  const { user, profile, loading: authLoading, isManager, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const canAccess = isManager() || isAdmin();

  // ── Dialog state ───────────────────────────────────────────────────────────
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName]       = useState('');
  const [newTeamDesc, setNewTeamDesc]       = useState('');
  const [addAgentTeamId, setAddAgentTeamId] = useState<string | null>(null);
  const [agentSearch, setAgentSearch]       = useState('');

  // ── Fetch manager's teams ──────────────────────────────────────────────────
  const { data: managerTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['manager-teams', profile?.id],
    queryFn: async () => {
      const q = isAdmin()
        ? supabase.from('teams').select('*').order('name')
        : supabase.from('teams').select('*').eq('manager_id', profile!.id).order('name');
      const { data, error } = await q;
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!profile && canAccess,
  });

  const managerTeamIds = useMemo(() => managerTeams.map(t => t.id), [managerTeams]);

  // ── Fetch team members ─────────────────────────────────────────────────────
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['manager-team-members', managerTeamIds],
    queryFn: async () => {
      if (isAdmin()) {
        const { data, error } = await supabase.from('profiles').select('*').order('last_name');
        if (error) throw error;
        return data as Profile[];
      }
      if (managerTeamIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('team_id', managerTeamIds)
        .order('last_name');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!profile && canAccess && !teamsLoading,
  });

  // ── Fetch all profiles for agent search ───────────────────────────────────
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['all-profiles-for-manager'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('last_name');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!profile && canAccess,
  });

  // ── Fetch today's controls ─────────────────────────────────────────────────
  const { data: todayControls = [], isLoading: controlsLoading } = useQuery({
    queryKey: ['manager-today-controls', managerTeamIds],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase.from('controls').select('*').eq('control_date', today);
      if (!isAdmin()) {
        if (managerTeamIds.length === 0) return [];
        query = query.in('team_id', managerTeamIds);
      }
      const { data, error } = await query.order('control_time', { ascending: false });
      if (error) throw error;
      return data as Control[];
    },
    enabled: !!profile && canAccess && !teamsLoading,
  });

  // ── Fetch week's controls for heatmap ─────────────────────────────────────
  const { data: weekControls = [] } = useQuery({
    queryKey: ['manager-week-controls', managerTeamIds],
    queryFn: async () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const mondayStr = monday.toISOString().split('T')[0];

      let query = supabase.from('controls').select('*').gte('control_date', mondayStr);
      if (!isAdmin()) {
        if (managerTeamIds.length === 0) return [];
        query = query.in('team_id', managerTeamIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Control[];
    },
    enabled: !!profile && canAccess && !teamsLoading,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createTeamMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { error } = await supabase.from('teams').insert({
        name,
        description: description || null,
        manager_id: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-teams'] });
      setCreateTeamOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      toast.success('Équipe créée');
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });

  const addAgentMutation = useMutation({
    mutationFn: async ({ agentId, teamId }: { agentId: string; teamId: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: teamId })
        .eq('id', agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-team-members'] });
      queryClient.invalidateQueries({ queryKey: ['all-profiles-for-manager'] });
      toast.success("Agent ajouté à l'équipe");
      setAddAgentTeamId(null);
      setAgentSearch('');
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });

  const removeAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-team-members'] });
      queryClient.invalidateQueries({ queryKey: ['all-profiles-for-manager'] });
      toast.success("Agent retiré de l'équipe");
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!canAccess) return <Navigate to="/" replace />;

  // ── Computed ───────────────────────────────────────────────────────────────
  const isLoading      = membersLoading || controlsLoading || teamsLoading;
  const totalPassengers = todayControls.reduce((sum, c) => sum + c.nb_passagers, 0);
  const totalFraud      = todayControls.reduce((sum, c) => sum + c.tarifs_controle + c.pv, 0);
  const fraudRate       = totalPassengers > 0 ? ((totalFraud / totalPassengers) * 100).toFixed(1) : '0';

  const getAgentName = (agentId: string) => {
    const member = teamMembers.find(m => m.id === agentId);
    return member ? `${member.first_name} ${member.last_name}` : 'Inconnu';
  };

  const getMembersForTeam = (teamId: string) => teamMembers.filter(m => m.team_id === teamId);

  // Filtered list for "add agent" dialog
  const availableAgents = useMemo(() => {
    const q = agentSearch.toLowerCase();
    return allProfiles.filter(p => {
      if (p.id === profile?.id) return false;
      const fullName = `${p.first_name} ${p.last_name} ${p.matricule || ''}`.toLowerCase();
      return fullName.includes(q);
    });
  }, [allProfiles, agentSearch, profile?.id]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-5 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Espace Manager
            </h1>
            <p className="text-sm text-muted-foreground">
              Suivez les performances de votre équipe
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-white/20"><Users className="h-4 w-4" /></div>
                <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">équipe</span>
              </div>
              <div className="text-3xl font-bold tracking-tight">{teamMembers.length}</div>
              <p className="text-xs text-white/65 mt-1">membres actifs</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-white/20"><BarChart3 className="h-4 w-4" /></div>
                <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">contrôles</span>
              </div>
              <div className="text-3xl font-bold tracking-tight">{todayControls.length}</div>
              <p className="text-xs text-white/65 mt-1">aujourd'hui</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-white/20"><TrendingUp className="h-4 w-4" /></div>
                <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">passagers</span>
              </div>
              <div className="text-3xl font-bold tracking-tight">{totalPassengers}</div>
              <p className="text-xs text-white/65 mt-1">contrôlés aujourd'hui</p>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-0 shadow-md overflow-hidden text-white",
            parseFloat(fraudRate) >= 10 ? "bg-gradient-to-br from-red-500 to-rose-600"
              : parseFloat(fraudRate) >= 5  ? "bg-gradient-to-br from-amber-500 to-orange-500"
              : "bg-gradient-to-br from-emerald-500 to-green-600"
          )}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-white/20"><AlertTriangle className="h-4 w-4" /></div>
                <span className="text-[10px] font-medium text-white/60 uppercase tracking-wide">fraude</span>
              </div>
              <div className="text-3xl font-bold tracking-tight">{fraudRate}%</div>
              <p className="text-xs text-white/65 mt-1">taux du jour</p>
              <div className="mt-2.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/50 rounded-full" style={{ width: `${Math.min(parseFloat(fraudRate) * 5, 100)}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            <TabsTrigger value="teams">Équipes</TabsTrigger>
          </TabsList>

          {/* ── Vue d'ensemble ── */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
              <CardHeader className="py-3 px-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Membres de l'équipe
                  <Badge className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 text-xs">
                    {teamMembers.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs pl-8">
                  {isAdmin()
                    ? 'Tous les agents'
                    : `${managerTeams.length} équipe${managerTeams.length !== 1 ? 's' : ''}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun membre dans l'équipe
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Matricule</TableHead>
                          <TableHead>Rôle</TableHead>
                          {managerTeams.length > 1 && <TableHead>Équipe</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="font-medium">{member.first_name} {member.last_name}</div>
                              <div className="text-xs text-muted-foreground">{member.phone_number || 'N/A'}</div>
                            </TableCell>
                            <TableCell className="text-sm">{member.matricule || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={member.role === 'manager' ? 'secondary' : 'outline'}>
                                {member.role === 'manager' ? 'Manager' : 'Agent'}
                              </Badge>
                            </TableCell>
                            {managerTeams.length > 1 && (
                              <TableCell className="text-sm text-muted-foreground">
                                {managerTeams.find(t => t.id === member.team_id)?.name || '-'}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
              <CardHeader className="py-3 px-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <BarChart3 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  Contrôles du jour
                  <Badge className="ml-auto bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 hover:bg-violet-100 text-xs">
                    {todayControls.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {controlsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : todayControls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun contrôle enregistré aujourd'hui
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Heure</TableHead>
                          <TableHead>Agent</TableHead>
                          <TableHead>Lieu</TableHead>
                          <TableHead className="text-right">Passagers</TableHead>
                          <TableHead className="text-right">Fraude</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todayControls.slice(0, 10).map((control) => {
                          const fraud = control.tarifs_controle + control.pv;
                          const rate  = control.nb_passagers > 0
                            ? ((fraud / control.nb_passagers) * 100).toFixed(1)
                            : '0';
                          return (
                            <TableRow key={control.id}>
                              <TableCell className="font-mono text-sm">{control.control_time.slice(0, 5)}</TableCell>
                              <TableCell className="text-sm">{getAgentName(control.agent_id)}</TableCell>
                              <TableCell className="text-sm">{control.location}</TableCell>
                              <TableCell className="text-right">{control.nb_passagers}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={parseFloat(rate) > 5 ? 'destructive' : 'outline'}>
                                  {rate}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap">
            <HourlyHeatmap controls={weekControls} />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTrailView members={teamMembers} />
          </TabsContent>

          {/* ── Équipes ── */}
          <TabsContent value="teams" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {managerTeams.length} équipe{managerTeams.length !== 1 ? 's' : ''}
              </p>
              <Button size="sm" onClick={() => setCreateTeamOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Nouvelle équipe
              </Button>
            </div>

            {teamsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : managerTeams.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground space-y-2">
                <Users className="h-10 w-10 opacity-30 mx-auto" />
                <p className="text-sm">Aucune équipe</p>
                <p className="text-xs opacity-60">Créez votre première équipe pour commencer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {managerTeams.map(team => {
                  const members = getMembersForTeam(team.id);
                  return (
                    <Card key={team.id} className="border-0 shadow-sm overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-indigo-400 to-violet-500" />
                      <CardHeader className="py-3 px-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                            <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          {team.name}
                          <Badge className="ml-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 text-xs">
                            {members.length}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-auto h-7 gap-1 text-xs"
                            onClick={() => { setAddAgentTeamId(team.id); setAgentSearch(''); }}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Ajouter
                          </Button>
                        </CardTitle>
                        {team.description && (
                          <CardDescription className="text-xs pl-8">{team.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        {members.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Aucun membre</p>
                        ) : (
                          <div className="space-y-1">
                            {members.map(member => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {member.first_name} {member.last_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {member.matricule || 'Sans matricule'}
                                    {' · '}{member.role === 'manager' ? 'Manager' : 'Agent'}
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeAgentMutation.mutate(member.id)}
                                  disabled={removeAgentMutation.isPending}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Dialog : Créer une équipe ── */}
        <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle équipe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nom *</label>
                <Input
                  placeholder="Ex : Équipe Metz"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTeamName.trim())
                      createTeamMutation.mutate({ name: newTeamName.trim(), description: newTeamDesc.trim() });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Description (optionnel)</label>
                <Input
                  placeholder="Description courte…"
                  value={newTeamDesc}
                  onChange={e => setNewTeamDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateTeamOpen(false)}>Annuler</Button>
              <Button
                onClick={() => createTeamMutation.mutate({ name: newTeamName.trim(), description: newTeamDesc.trim() })}
                disabled={!newTeamName.trim() || createTeamMutation.isPending}
              >
                {createTeamMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog : Ajouter un agent ── */}
        <Dialog open={!!addAgentTeamId} onOpenChange={open => { if (!open) setAddAgentTeamId(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Ajouter un agent
                {addAgentTeamId && (
                  <span className="font-normal text-muted-foreground">
                    {' — '}{managerTeams.find(t => t.id === addAgentTeamId)?.name}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Rechercher par nom ou matricule…"
                  value={agentSearch}
                  onChange={e => setAgentSearch(e.target.value)}
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {availableAgents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun agent trouvé</p>
                ) : (
                  availableAgents.map(agent => {
                    const alreadyInThisTeam  = agent.team_id === addAgentTeamId;
                    const inAnotherTeam      = !!agent.team_id && !alreadyInThisTeam;
                    const otherTeamName      = inAnotherTeam
                      ? (managerTeams.find(t => t.id === agent.team_id)?.name ?? 'autre équipe')
                      : null;
                    return (
                      <div
                        key={agent.id}
                        className={cn(
                          'flex items-center justify-between py-2 px-3 rounded-md',
                          alreadyInThisTeam ? 'opacity-50' : 'hover:bg-muted/50',
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {agent.first_name} {agent.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {agent.matricule || 'Sans matricule'}
                            {alreadyInThisTeam && ' · Déjà dans cette équipe'}
                            {otherTeamName && ` · Équipe : ${otherTeamName}`}
                          </div>
                        </div>
                        {!alreadyInThisTeam && (
                          <Button
                            size="sm"
                            variant={inAnotherTeam ? 'outline' : 'default'}
                            className="h-7 text-xs shrink-0 ml-2"
                            onClick={() => addAgentMutation.mutate({ agentId: agent.id, teamId: addAgentTeamId! })}
                            disabled={addAgentMutation.isPending}
                          >
                            {inAnotherTeam ? 'Transférer' : 'Ajouter'}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddAgentTeamId(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
