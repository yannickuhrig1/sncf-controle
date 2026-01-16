import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useControls } from '@/hooks/useControls';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, History, Train, Building2, TrainTrack, Calendar, Clock, Users, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type LocationType = Database['public']['Enums']['location_type'];

const locationIcons: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  train: Train,
  gare: Building2,
  quai: TrainTrack,
};

function ControlCard({ control }: { control: Control }) {
  const Icon = locationIcons[control.location_type];
  const fraudCount = control.tarifs_controle + control.pv;
  const fraudRate = control.nb_passagers > 0 
    ? ((fraudCount / control.nb_passagers) * 100).toFixed(1)
    : '0';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{control.location}</CardTitle>
              {control.train_number && (
                <p className="text-xs text-muted-foreground">N° {control.train_number}</p>
              )}
            </div>
          </div>
          <Badge variant={control.location_type === 'train' ? 'default' : 'secondary'}>
            {control.location_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(control.control_date), 'dd MMM yyyy', { locale: fr })}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {control.control_time.slice(0, 5)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm font-medium">
              <Users className="h-3.5 w-3.5" />
              {control.nb_passagers}
            </div>
            <p className="text-xs text-muted-foreground">Voyageurs</p>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-green-600">{control.nb_en_regle}</div>
            <p className="text-xs text-muted-foreground">En règle</p>
          </div>
          <div className="text-center">
            <div className={`flex items-center justify-center gap-1 text-sm font-medium ${parseFloat(fraudRate) > 5 ? 'text-red-600' : 'text-orange-600'}`}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {fraudRate}%
            </div>
            <p className="text-xs text-muted-foreground">Fraude</p>
          </div>
        </div>

        {(control.pv > 0 || control.tarifs_controle > 0) && (
          <div className="flex gap-2 pt-2 border-t">
            {control.pv > 0 && (
              <Badge variant="destructive" className="text-xs">
                {control.pv} PV
              </Badge>
            )}
            {control.tarifs_controle > 0 && (
              <Badge variant="outline" className="text-xs">
                {control.tarifs_controle} Tarifs
              </Badge>
            )}
            {control.stt_50 > 0 && (
              <Badge variant="outline" className="text-xs">
                {control.stt_50} STT50
              </Badge>
            )}
            {control.stt_100 > 0 && (
              <Badge variant="outline" className="text-xs">
                {control.stt_100} STT100
              </Badge>
            )}
          </div>
        )}

        {control.notes && (
          <p className="text-sm text-muted-foreground pt-2 border-t italic">
            {control.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { controls, isLoading } = useControls();

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

  // Group controls by date
  const groupedControls = controls.reduce((groups, control) => {
    const date = control.control_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(control);
    return groups;
  }, {} as Record<string, Control[]>);

  const sortedDates = Object.keys(groupedControls).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Historique</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : controls.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Aucun contrôle</h2>
            <p className="text-muted-foreground mb-4">
              Vous n'avez pas encore enregistré de contrôles.
            </p>
            <Link to="/control/new" className={buttonVariants({})}>
              Nouveau contrôle
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2">
                  {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
                </h2>
                <div className="space-y-3">
                  {groupedControls[date].map((control) => (
                    <ControlCard key={control.id} control={control} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
