import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  UserCheck,
  BarChart3,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Control = Database['public']['Tables']['controls']['Row'];

export default function ManagerPage() {
  const { user, profile, loading: authLoading, isManager, isAdmin } = useAuth();

  const canAccess = isManager() || isAdmin();

  // Fetch team members (for managers: their team, for admins: all)
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['manager-team-members', profile?.team_id],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*');
      
      // Managers see their team, admins see all
      if (!isAdmin() && profile?.team_id) {
        query = query.eq('team_id', profile.team_id);
      }
      
      const { data, error } = await query.order('last_name');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!profile && canAccess,
  });

  // Fetch team controls (today)
  const { data: todayControls = [], isLoading: controlsLoading } = useQuery({
    queryKey: ['manager-today-controls', profile?.team_id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('controls')
        .select('*')
        .eq('control_date', today);
      
      // Filter by team if manager
      if (!isAdmin() && profile?.team_id) {
        query = query.eq('team_id', profile.team_id);
      }
      
      const { data, error } = await query.order('control_time', { ascending: false });
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  const isLoading = membersLoading || controlsLoading;

  // Calculate team stats
  const totalPassengers = todayControls.reduce((sum, c) => sum + c.nb_passagers, 0);
  const totalFraud = todayControls.reduce((sum, c) => sum + c.tarifs_controle + c.pv, 0);
  const fraudRate = totalPassengers > 0 ? ((totalFraud / totalPassengers) * 100).toFixed(1) : '0';

  const getAgentName = (agentId: string) => {
    const member = teamMembers.find(m => m.id === agentId);
    return member ? `${member.first_name} ${member.last_name}` : 'Inconnu';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Espace Manager
          </h1>
          <p className="text-muted-foreground">
            Suivez les performances de votre équipe
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Équipe</span>
              </div>
              <p className="text-2xl font-bold">{teamMembers.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Contrôles aujourd'hui</span>
              </div>
              <p className="text-2xl font-bold">{todayControls.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Passagers</span>
              </div>
              <p className="text-2xl font-bold">{totalPassengers}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Taux fraude</span>
              </div>
              <p className="text-2xl font-bold">{fraudRate}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membres de l'équipe
            </CardTitle>
            <CardDescription>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Contrôles du jour
            </CardTitle>
            <CardDescription>
              Activité de l'équipe aujourd'hui
            </CardDescription>
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
      </div>
    </AppLayout>
  );
}
