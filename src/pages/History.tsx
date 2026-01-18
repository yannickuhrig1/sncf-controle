import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useControls } from '@/hooks/useControls';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ControlDetailDialog } from '@/components/controls/ControlDetailDialog';
import { ExportDialog } from '@/components/controls/ExportDialog';
import { 
  Loader2, 
  History, 
  Train, 
  Building2, 
  TrainTrack, 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle,
  Download,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type LocationType = Database['public']['Enums']['location_type'];

const locationIcons: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  train: Train,
  gare: Building2,
  quai: TrainTrack,
};

interface ControlRowProps {
  control: Control;
  onClick: () => void;
}

function ControlRow({ control, onClick }: ControlRowProps) {
  const Icon = locationIcons[control.location_type];
  const fraudCount = control.tarifs_controle + control.pv;
  const fraudRate = control.nb_passagers > 0 
    ? ((fraudCount / control.nb_passagers) * 100)
    : 0;

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          
          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{control.location}</span>
              {control.train_number && (
                <Badge variant="outline" className="text-xs shrink-0">
                  N° {control.train_number}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {control.control_time.slice(0, 5)}
              </span>
              {control.origin && control.destination && (
                <span className="truncate">
                  {control.origin} → {control.destination}
                </span>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center hidden sm:block">
              <div className="flex items-center gap-1 text-sm font-medium">
                <Users className="h-3 w-3" />
                {control.nb_passagers}
              </div>
            </div>
            <div className={`text-center ${
              fraudRate > 10 ? 'text-red-600' : fraudRate > 5 ? 'text-orange-600' : 'text-green-600'
            }`}>
              <div className="flex items-center gap-1 text-sm font-semibold">
                <AlertTriangle className="h-3 w-3" />
                {fraudRate.toFixed(1)}%
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { controls, isLoading, deleteControl } = useControls();
  const navigate = useNavigate();
  
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

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

  const handleControlClick = (control: Control) => {
    setSelectedControl(control);
    setDetailOpen(true);
  };

  const handleEdit = (control: Control) => {
    // Navigate to edit page based on location type
    if (control.location_type === 'train') {
      navigate(`/control/onboard?edit=${control.id}`);
    } else {
      navigate(`/control/station?edit=${control.id}`);
    }
  };

  const handleDelete = async (control: Control) => {
    try {
      await deleteControl(control.id);
      toast.success('Contrôle supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Historique</h1>
          </div>
          {controls.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          )}
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
              <div key={date} className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
                  <Badge variant="secondary" className="ml-auto">
                    {groupedControls[date].length} contrôle{groupedControls[date].length > 1 ? 's' : ''}
                  </Badge>
                </h2>
                <div className="space-y-2">
                  {groupedControls[date].map((control) => (
                    <ControlRow 
                      key={control.id} 
                      control={control} 
                      onClick={() => handleControlClick(control)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Detail Dialog */}
      <ControlDetailDialog
        control={selectedControl}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
      {/* Export Dialog */}
      <ExportDialog
        controls={controls}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </AppLayout>
  );
}
