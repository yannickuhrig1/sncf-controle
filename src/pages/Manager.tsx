import { useState, useMemo, useEffect } from 'react';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
  Clock,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  LogIn,
  Check,
  KeyRound,
} from 'lucide-react';
import { useWantedPersons, type WantedPerson } from '@/hooks/useWantedPersons';
import { HourlyHeatmap } from '@/components/manager/HourlyHeatmap';
import { AuditTrailView } from '@/components/manager/AuditTrailView';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Control = Database['public']['Tables']['controls']['Row'];
type Team   = Database['public']['Tables']['teams']['Row'];
type JoinRequest = Database['public']['Tables']['team_join_requests']['Row'];

export default function ManagerPage() {
  const { user, profile, loading: authLoading, isManager, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const canAccess = isManager() || isAdmin();

  // Real-time online presence
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  useEffect(() => {
    const channel = supabase.channel('sncf-presence');
    const syncState = () => {
      const state = channel.presenceState<{ user_id: string }>();
      const ids = new Set(Object.values(state).flatMap(p => p.map((u: { user_id: string }) => u.user_id)));
      setOnlineUsers(ids);
    };
    channel
      .on('presence', { event: 'sync' },  syncState)
      .on('presence', { event: 'join' },  syncState)
      .on('presence', { event: 'leave' }, syncState)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Personnes recherchées ──────────────────────────────────────────────────
  const { persons: wantedPersons, isLoading: wantedLoading, addPerson, updatePerson, deletePerson, toggleActive } = useWantedPersons(false);
  const [wantedDialogOpen, setWantedDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<WantedPerson | null>(null);
  const [wantedForm, setWantedForm] = useState({ nom: '', prenom: '', date_naissance: '', notes: '' });
  const [wantedPhotoFile, setWantedPhotoFile] = useState<File | null>(null);
  const [wantedPhotoPreview, setWantedPhotoPreview] = useState<string | null>(null);
  const [wantedSaving, setWantedSaving] = useState(false);

  const openAddWanted = () => {
    setEditingPerson(null);
    setWantedForm({ nom: '', prenom: '', date_naissance: '', notes: '' });
    setWantedPhotoFile(null);
    setWantedPhotoPreview(null);
    setWantedDialogOpen(true);
  };

  const openEditWanted = (p: WantedPerson) => {
    setEditingPerson(p);
    setWantedForm({ nom: p.nom, prenom: p.prenom, date_naissance: p.date_naissance || '', notes: p.notes || '' });
    setWantedPhotoFile(null);
    setWantedPhotoPreview(p.photo_url);
    setWantedDialogOpen(true);
  };

  const handleWantedPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWantedPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setWantedPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleWantedSave = async () => {
    if (!wantedForm.nom.trim() || !wantedForm.prenom.trim()) return;
    setWantedSaving(true);
    let ok: boolean;
    if (editingPerson) {
      ok = await updatePerson(editingPerson.id, {
        nom: wantedForm.nom.trim(), prenom: wantedForm.prenom.trim(),
        date_naissance: wantedForm.date_naissance || null,
        notes: wantedForm.notes || null,
        ...(wantedPhotoFile ? { photoFile: wantedPhotoFile } : {}),
      });
    } else {
      ok = await addPerson({
        nom: wantedForm.nom.trim(), prenom: wantedForm.prenom.trim(),
        date_naissance: wantedForm.date_naissance || null,
        photo_url: null, notes: wantedForm.notes || null,
        ...(wantedPhotoFile ? { photoFile: wantedPhotoFile } : {}),
      });
    }
    setWantedSaving(false);
    if (ok) {
      setWantedDialogOpen(false);
      toast.success(editingPerson ? 'Fiche mise à jour' : 'Personne ajoutée');
    } else {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // ── Dialog state ───────────────────────────────────────────────────────────
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName]       = useState('');
  const [newTeamDesc, setNewTeamDesc]       = useState('');
  const [addAgentTeamId, setAddAgentTeamId] = useState<string | null>(null);
  const [agentSearch, setAgentSearch]       = useState('');

  // ── Edit member account dialog ─────────────────────────────────────────────
  const [editMemberOpen,     setEditMemberOpen]     = useState(false);
  const [editingMember,      setEditingMember]      = useState<Profile | null>(null);
  const [editMemberEmail,    setEditMemberEmail]    = useState('');
  const [editMemberPassword, setEditMemberPassword] = useState('');
  const [isSavingMember,     setIsSavingMember]     = useState(false);

  const openEditMember = (member: Profile) => {
    setEditingMember(member);
    setEditMemberEmail('');
    setEditMemberPassword('');
    setEditMemberOpen(true);
  };

  const resetEditMember = () => {
    setEditMemberOpen(false);
    setEditingMember(null);
    setEditMemberEmail('');
    setEditMemberPassword('');
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;
    if (!editMemberEmail && !editMemberPassword) {
      toast.error('Remplissez au moins un champ à modifier');
      return;
    }
    if (editMemberPassword && editMemberPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setIsSavingMember(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('update-user', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        body: {
          userId: editingMember.user_id,
          email: editMemberEmail || undefined,
          password: editMemberPassword || undefined,
        },
      });
      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || response.error?.message || 'Erreur');
      }
      toast.success('Compte mis à jour');
      resetEditMember();
    } catch (error: any) {
      toast.error('Erreur: ' + (error.message || 'Impossible de mettre à jour'));
    } finally {
      setIsSavingMember(false);
    }
  };

  // ── Fetch all teams (managers see all, to allow join requests) ────────────
  const { data: allTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['all-teams', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!profile && canAccess,
  });

  // Teams the current user manages (as primary or co-manager)
  const managerTeams = useMemo(() =>
    isAdmin()
      ? allTeams
      : allTeams.filter(t =>
          t.manager_id === profile?.id ||
          (t.co_manager_ids ?? []).includes(profile?.id ?? '')
        ),
    [allTeams, profile?.id]
  );

  // Teams the current user can request to join
  const joinableTeams = useMemo(() =>
    isAdmin()
      ? []
      : allTeams.filter(t =>
          t.manager_id !== profile?.id &&
          !(t.co_manager_ids ?? []).includes(profile?.id ?? '')
        ),
    [allTeams, profile?.id]
  );

  const managerTeamIds = useMemo(() => managerTeams.map(t => t.id), [managerTeams]);

  // ── Fetch my outgoing join requests ───────────────────────────────────────
  const { data: myJoinRequests = [] } = useQuery({
    queryKey: ['my-join-requests', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_join_requests')
        .select('*')
        .eq('requester_id', profile!.id);
      if (error) throw error;
      return data as JoinRequest[];
    },
    enabled: !!profile && canAccess,
  });

  // ── Fetch incoming pending join requests for my teams ─────────────────────
  const { data: incomingRequests = [] } = useQuery({
    queryKey: ['incoming-join-requests', managerTeamIds],
    queryFn: async () => {
      if (!isAdmin() && managerTeamIds.length === 0) return [];
      const q = isAdmin()
        ? supabase.from('team_join_requests').select('*, requester:requester_id(id,first_name,last_name,matricule), team:team_id(id,name)').eq('status', 'pending')
        : supabase.from('team_join_requests').select('*, requester:requester_id(id,first_name,last_name,matricule), team:team_id(id,name)').eq('status', 'pending').in('team_id', managerTeamIds);
      const { data, error } = await q;
      if (error) throw error;
      return data as (JoinRequest & { requester: Pick<Profile, 'id'|'first_name'|'last_name'|'matricule'>; team: Pick<Team, 'id'|'name'> })[];
    },
    enabled: !!profile && canAccess,
  });

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

  // ── Fetch last sign-in dates ───────────────────────────────────────────────
  const { data: lastSignInMap = {} } = useQuery({
    queryKey: ['manager-last-sign-in'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_users_last_sign_in');
      if (error) return {} as Record<string, string>;
      return Object.fromEntries((data as { user_id: string; last_sign_in_at: string }[]).map(r => [r.user_id, r.last_sign_in_at]));
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

  const requestJoinMutation = useMutation({
    mutationFn: async ({ teamId, teamName }: { teamId: string; teamName: string }) => {
      const { data, error } = await supabase
        .from('team_join_requests')
        .insert({ team_id: teamId, requester_id: profile!.id })
        .select()
        .single();
      if (error) throw error;
      // Notify team manager + admins
      const requesterName = `${profile!.first_name} ${profile!.last_name}`;
      await supabase.functions.invoke('notify-team-join-request', {
        body: {
          request_id: data.id,
          team_id: teamId,
          requester_id: profile!.id,
          requester_name: requesterName,
          team_name: teamName,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-join-requests'] });
      toast.success('Demande envoyée — en attente de validation');
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });

  const reviewJoinMutation = useMutation({
    mutationFn: async ({ requestId, status, requesterId, teamId }: { requestId: string; status: 'approved' | 'rejected'; requesterId: string; teamId: string }) => {
      const { error } = await supabase
        .from('team_join_requests')
        .update({ status, reviewed_by: profile!.id, reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
      // If approved, add requester as co-manager
      if (status === 'approved') {
        const team = allTeams.find(t => t.id === teamId);
        const current = team?.co_manager_ids ?? [];
        if (!current.includes(requesterId)) {
          const { error: e2 } = await supabase
            .from('teams')
            .update({ co_manager_ids: [...current, requesterId] })
            .eq('id', teamId);
          if (e2) throw e2;
        }
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['incoming-join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-teams'] });
      queryClient.invalidateQueries({ queryKey: ['manager-teams'] });
      toast.success(vars.status === 'approved' ? 'Demande approuvée' : 'Demande refusée');
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
          <TabsList className="flex w-full overflow-x-auto gap-1 h-auto p-1 justify-start">
            <TabsTrigger value="overview" className="shrink-0 text-xs px-2.5 py-1.5">Aperçu</TabsTrigger>
            <TabsTrigger value="heatmap" className="shrink-0 text-xs px-2.5 py-1.5">Heatmap</TabsTrigger>
            <TabsTrigger value="audit" className="shrink-0 text-xs px-2.5 py-1.5">Audit</TabsTrigger>
            <TabsTrigger value="teams" className="shrink-0 text-xs px-2.5 py-1.5 gap-1">
              Équipes
              {incomingRequests.length > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-bold">
                  {incomingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="wanted" className="shrink-0 text-xs px-2.5 py-1.5 gap-1 data-[state=active]:bg-red-600 data-[state=active]:text-white text-red-600 dark:text-red-400 font-semibold">
              <AlertTriangle className="h-3 w-3" />
              Recherchées
              {wantedPersons.length > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[10px] font-bold">
                  {wantedPersons.length}
                </span>
              )}
            </TabsTrigger>
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
                          <TableHead>Dernière connexion</TableHead>
                          {managerTeams.length > 1 && <TableHead>Équipe</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => {
                          const raw = lastSignInMap[member.user_id];
                          let lastSeenLabel = '—';
                          let lastSeenTitle = '';
                          if (raw) {
                            const d = new Date(raw);
                            const now = new Date();
                            const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
                            const diffH = Math.floor(diffMin / 60);
                            const diffD = Math.floor(diffH / 24);
                            if (diffMin < 1) lastSeenLabel = "À l'instant";
                            else if (diffMin < 60) lastSeenLabel = `il y a ${diffMin} min`;
                            else if (diffH < 24) lastSeenLabel = `il y a ${diffH} h`;
                            else if (diffD < 7) lastSeenLabel = `il y a ${diffD} j`;
                            else lastSeenLabel = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                            lastSeenTitle = d.toLocaleString('fr-FR');
                          }
                          return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="font-medium flex items-center gap-2">
                                {onlineUsers.has(member.user_id) && (
                                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" title="En ligne" />
                                )}
                                {member.first_name} {member.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">{member.phone_number || 'N/A'}</div>
                            </TableCell>
                            <TableCell className="text-sm">{member.matricule || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={member.role === 'manager' ? 'secondary' : 'outline'}>
                                {member.role === 'manager' ? 'Manager' : 'Agent'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span title={lastSeenTitle}>{lastSeenLabel}</span>
                              </div>
                            </TableCell>
                            {managerTeams.length > 1 && (
                              <TableCell className="text-sm text-muted-foreground">
                                {managerTeams.find(t => t.id === member.team_id)?.name || '-'}
                              </TableCell>
                            )}
                            <TableCell>
                              {member.role === 'agent' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title="Modifier email / mot de passe"
                                  onClick={() => openEditMember(member)}
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                </Button>
                              )}
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

            {/* ── Demandes en attente (incoming) ── */}
            {incomingRequests.length > 0 && (
              <Card className="border-0 shadow-sm overflow-hidden border-amber-200 dark:border-amber-800">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                <CardHeader className="py-3 px-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <UserPlus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    Demandes à valider
                    <Badge className="ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 text-xs">
                      {incomingRequests.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {incomingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-amber-50 dark:bg-amber-900/10">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {req.requester.first_name} {req.requester.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {req.requester.matricule || 'Sans matricule'} · souhaite rejoindre <span className="font-medium">{req.team.name}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50 dark:text-green-400"
                          onClick={() => reviewJoinMutation.mutate({ requestId: req.id, status: 'approved', requesterId: req.requester_id, teamId: req.team_id })}
                          disabled={reviewJoinMutation.isPending}
                        >
                          <Check className="h-3 w-3" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:text-red-400"
                          onClick={() => reviewJoinMutation.mutate({ requestId: req.id, status: 'rejected', requesterId: req.requester_id, teamId: req.team_id })}
                          disabled={reviewJoinMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ── Mes équipes ── */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {managerTeams.length} équipe{managerTeams.length !== 1 ? 's' : ''} gérée{managerTeams.length !== 1 ? 's' : ''}
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
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <Users className="h-10 w-10 opacity-30 mx-auto" />
                <p className="text-sm">Aucune équipe gérée</p>
                <p className="text-xs opacity-60">Créez votre première équipe ou rejoignez-en une</p>
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

            {/* ── Autres équipes (rejoindre) ── */}
            {!isAdmin() && joinableTeams.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground pt-2 border-t">Autres équipes</p>
                {joinableTeams.map(team => {
                  const myReq = myJoinRequests.find(r => r.team_id === team.id);
                  return (
                    <Card key={team.id} className="border-0 shadow-sm overflow-hidden opacity-80">
                      <CardContent className="py-3 px-4 flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-muted">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{team.name}</div>
                          {team.description && (
                            <div className="text-xs text-muted-foreground truncate">{team.description}</div>
                          )}
                        </div>
                        {myReq ? (
                          <Badge
                            className={cn(
                              'text-xs shrink-0',
                              myReq.status === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                              myReq.status === 'approved' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                              myReq.status === 'rejected' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                            )}
                          >
                            {myReq.status === 'pending' ? 'En attente' : myReq.status === 'approved' ? 'Approuvé' : 'Refusé'}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 shrink-0"
                            onClick={() => requestJoinMutation.mutate({ teamId: team.id, teamName: team.name })}
                            disabled={requestJoinMutation.isPending}
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            Rejoindre
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Personnes recherchées ── */}
          <TabsContent value="wanted" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Personnes recherchées</h3>
                <p className="text-xs text-muted-foreground">Visible par tous les agents dans Infos utiles</p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={openAddWanted}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </div>

            {wantedLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : wantedPersons.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Aucune fiche. Cliquez sur "Ajouter" pour créer la première.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {wantedPersons.map(p => (
                  <Card key={p.id} className={cn('border-0 shadow-sm overflow-hidden', !p.active && 'opacity-50')}>
                    <div className={cn('h-1', p.active ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-muted')} />
                    <CardContent className="p-3 flex gap-3">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" className="w-14 h-18 object-cover rounded border shrink-0" style={{ height: '4.5rem' }} />
                      ) : (
                        <div className="w-14 bg-muted rounded border flex items-center justify-center shrink-0" style={{ height: '4.5rem' }}>
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{p.prenom} {p.nom}</p>
                        {p.date_naissance && (
                          <p className="text-xs text-muted-foreground">
                            Né(e) le {new Date(p.date_naissance).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        {p.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">{p.notes}</p>}
                        <div className="flex gap-1.5 mt-2">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditWanted(p)} title="Modifier">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleActive(p.id, !p.active)} title={p.active ? 'Désactiver' : 'Réactiver'}>
                            {p.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Supprimer cette fiche ?')) deletePerson(p.id); }} title="Supprimer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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

        {/* ── Dialog : Personne recherchée ── */}
        <Dialog open={wantedDialogOpen} onOpenChange={setWantedDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPerson ? 'Modifier la fiche' : 'Nouvelle personne recherchée'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Prénom *</label>
                  <Input placeholder="Jean" value={wantedForm.prenom} onChange={e => setWantedForm(p => ({ ...p, prenom: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nom *</label>
                  <Input placeholder="DUPONT" value={wantedForm.nom} onChange={e => setWantedForm(p => ({ ...p, nom: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Date de naissance</label>
                <Input type="date" value={wantedForm.date_naissance} onChange={e => setWantedForm(p => ({ ...p, date_naissance: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Photo</label>
                <div className="flex items-center gap-3">
                  {wantedPhotoPreview && (
                    <img src={wantedPhotoPreview} alt="preview" className="w-14 h-18 object-cover rounded border" style={{ height: '4.5rem' }} />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer bg-muted hover:bg-muted/70 text-sm px-3 py-2 rounded-md border transition-colors">
                    <Upload className="h-4 w-4" />
                    {wantedPhotoPreview ? 'Changer la photo' : 'Importer une photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleWantedPhotoChange} />
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Notes / Signalement</label>
                <Input placeholder="Ex : Fraude récurrente ligne Metz-Thionville…" value={wantedForm.notes} onChange={e => setWantedForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWantedDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleWantedSave} disabled={wantedSaving || !wantedForm.nom.trim() || !wantedForm.prenom.trim()}>
                {wantedSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {editingPerson ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog : Modifier email / mot de passe d'un agent ── */}
        <Dialog open={editMemberOpen} onOpenChange={(open) => { if (!open) resetEditMember(); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Modifier le compte
              </DialogTitle>
              {editingMember && (
                <DialogDescription>
                  {editingMember.first_name} {editingMember.last_name}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nouvel email</Label>
                <Input
                  type="email"
                  value={editMemberEmail}
                  onChange={(e) => setEditMemberEmail(e.target.value)}
                  placeholder="Laisser vide pour ne pas modifier"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={editMemberPassword}
                  onChange={(e) => setEditMemberPassword(e.target.value)}
                  placeholder="Laisser vide pour ne pas modifier"
                  autoComplete="new-password"
                />
                {editMemberPassword && editMemberPassword.length < 6 && (
                  <p className="text-xs text-destructive">6 caractères minimum</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetEditMember}>Annuler</Button>
              <Button onClick={handleSaveMember} disabled={isSavingMember}>
                {isSavingMember && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
