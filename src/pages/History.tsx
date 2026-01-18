import { useState, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useControls } from '@/hooks/useControls';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  Search,
  X,
  Filter,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationType | 'all'>('all');

  // Filter controls based on search and location type
  const filteredControls = useMemo(() => {
    return controls.filter(control => {
      // Location type filter
      if (locationFilter !== 'all' && control.location_type !== locationFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesLocation = control.location.toLowerCase().includes(query);
        const matchesTrainNumber = control.train_number?.toLowerCase().includes(query);
        const matchesOrigin = control.origin?.toLowerCase().includes(query);
        const matchesDestination = control.destination?.toLowerCase().includes(query);
        
        if (!matchesLocation && !matchesTrainNumber && !matchesOrigin && !matchesDestination) {
          return false;
        }
      }
      
      return true;
    });
  }, [controls, searchQuery, locationFilter]);

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

  // Group filtered controls by date
  const groupedControls = useMemo(() => {
    return filteredControls.reduce((groups, control) => {
      const date = control.control_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(control);
      return groups;
    }, {} as Record<string, Control[]>);
  }, [filteredControls]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedControls).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  }, [groupedControls]);

  const hasActiveFilters = searchQuery.trim() !== '' || locationFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setLocationFilter('all');
  };

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

        {/* Filters */}
        {controls.length > 0 && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par train, lieu, trajet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Location type filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <ToggleGroup 
                type="single" 
                value={locationFilter} 
                onValueChange={(v) => v && setLocationFilter(v as LocationType | 'all')}
                className="justify-start"
              >
                <ToggleGroupItem value="all" aria-label="Tous" size="sm">
                  Tous
                </ToggleGroupItem>
                <ToggleGroupItem value="train" aria-label="Train" size="sm" className="gap-1">
                  <Train className="h-3.5 w-3.5" />
                  Train
                </ToggleGroupItem>
                <ToggleGroupItem value="gare" aria-label="Gare" size="sm" className="gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Gare
                </ToggleGroupItem>
                <ToggleGroupItem value="quai" aria-label="Quai" size="sm" className="gap-1">
                  <TrainTrack className="h-3.5 w-3.5" />
                  Quai
                </ToggleGroupItem>
              </ToggleGroup>
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-muted-foreground">
                  <X className="h-3.5 w-3.5 mr-1" />
                  Effacer
                </Button>
              )}
            </div>
            
            {/* Results count */}
            {hasActiveFilters && (
              <p className="text-sm text-muted-foreground">
                {filteredControls.length} résultat{filteredControls.length !== 1 ? 's' : ''} sur {controls.length} contrôle{controls.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

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
        ) : filteredControls.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Aucun résultat</h2>
            <p className="text-muted-foreground mb-4">
              Aucun contrôle ne correspond à vos critères de recherche.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Effacer les filtres
            </Button>
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
