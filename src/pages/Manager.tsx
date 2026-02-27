import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Users,
  UserCheck,
  BarChart3,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { AgentRanking } from '@/components/manager/AgentRanking';
import { HourlyHeatmap } from '@/components/manager/HourlyHeatmap';
import { AuditTrailView } from '@/components/manager/AuditTrailView';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Control = Database['public']['Tables']['controls']['Row'];

export default function ManagerPage() {
  const { user, profile, loading: authLoading, isManager, isAdmin } = useAuth();

  const canAccess = isManager() || isAdmin();

  // Fetch team members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['manager-team-members', profile?.team_id],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*');
      if (!isAdmin() && profile?.team_id) {
        query = query.eq('team_id', profile.team_id);
      }
      const { data, error } = await query.order('last_name');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!profile && canAccess,
  });

  // Fetch today's controls
  const { data: todayControls = [], isLoading: controlsLoading } = useQuery({
    queryKey: ['manager-today-controls', profile?.team_id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase.from('controls').select('*').eq('control_date', today);
      if (!isAdmin() && profile?.team_id) {
        query = query.eq('team_id', profile.team_id);
      }
      const { data, error } = await query.order('control_time', { ascending: false });
      if (error) throw error;
      return data as Control[];
    },
    enabled: !!profile && canAccess,
  });

  // Fetch week's controls for heatmap
  const { data: weekControls = [] } = useQuery({
    queryKey: ['manager-week-controls', profile?.team_id],
    queryFn: async () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const mondayStr = monday.toISOString().split('T')[0];

      let query = supabase.from('controls').select('*').gte('control_date', mondayStr);
      if (!isAdmin() && profile?.team_id) {
        query = query.eq('team_id', profile.team_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Control[];
    },
    enabled: !!profile && canAccess,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!canAccess) return <Navigate to="/" replace />;

  const isLoading = membersLoading || controlsLoading;
  const totalPassengers = todayControls.reduce((sum, c) => sum + c.nb_passagers, 0);
  const totalFraud = todayControls.reduce((sum, c) => sum + c.tarifs_controle + c.pv, 0);
  const fraudRate = totalPassengers > 0 ? ((totalFraud / totalPassengers) * 100).toFixed(1) : '0';

  const getAgentName = (agentId: string) => {
    const member = teamMembers.find(m => m.id === agentId);
    return member ? `${member.first_name} ${member.last_name}` : 'Inconnu';
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-5xl">
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

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Agent Ranking */}
            <AgentRanking controls={todayControls} members={teamMembers} />

            {/* Team Members */}
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
                  {isAdmin() ? 'Tous les agents' : 'Agents de votre équipe'}
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="font-medium">
                                {member.first_name} {member.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {member.phone_number || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {member.matricule || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.role === 'manager' ? 'secondary' : 'outline'}>
                                {member.role === 'manager' ? 'Manager' : 'Agent'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Controls */}
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
                          const rate = control.nb_passagers > 0
                            ? ((fraud / control.nb_passagers) * 100).toFixed(1)
                            : '0';
                          return (
                            <TableRow key={control.id}>
                              <TableCell className="font-mono text-sm">
                                {control.control_time.slice(0, 5)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {getAgentName(control.agent_id)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {control.location}
                              </TableCell>
                              <TableCell className="text-right">
                                {control.nb_passagers}
                              </TableCell>
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
        </Tabs>
      </div>
    </AppLayout>
  );
}
