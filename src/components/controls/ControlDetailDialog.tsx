import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Train, 
  Building2, 
  TrainTrack, 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  Edit,
  Trash2,
  MapPin,
  FileText,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Control = Database['public']['Tables']['controls']['Row'];
type LocationType = Database['public']['Enums']['location_type'];

const locationIcons: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  train: Train,
  gare: Building2,
  quai: TrainTrack,
};

const locationLabels: Record<LocationType, string> = {
  train: 'Train',
  gare: 'Gare',
  quai: 'Quai',
};

interface ControlDetailDialogProps {
  control: Control | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (control: Control) => void;
  onDelete?: (control: Control) => void;
}

export function ControlDetailDialog({ 
  control, 
  open, 
  onOpenChange,
  onEdit,
  onDelete,
}: ControlDetailDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  if (!control) return null;
  
  const Icon = locationIcons[control.location_type];
  const fraudCount = control.tarifs_controle + control.pv;
  const fraudRate = control.nb_passagers > 0 
    ? ((fraudCount / control.nb_passagers) * 100)
    : 0;
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(control);
    }
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg">{control.location}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={control.location_type === 'train' ? 'default' : 'secondary'}>
                      {locationLabels[control.location_type]}
                    </Badge>
                    {control.train_number && (
                      <span className="text-sm text-muted-foreground">N° {control.train_number}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Date & Time */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(control.control_date), 'EEEE d MMMM yyyy', { locale: fr })}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {control.control_time.slice(0, 5)}
              </div>
            </div>
            
            {/* Route */}
            {(control.origin || control.destination) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{control.origin || '?'}</span>
                <span className="text-muted-foreground">→</span>
                <span>{control.destination || '?'}</span>
              </div>
            )}
            
            {/* Main stats */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-lg font-semibold">
                  <Users className="h-4 w-4" />
                  {control.nb_passagers}
                </div>
                <p className="text-xs text-muted-foreground">Voyageurs</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-lg font-semibold text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {control.nb_en_regle}
                </div>
                <p className="text-xs text-muted-foreground">En règle</p>
              </div>
              <div className="text-center">
                <div className={`flex items-center justify-center gap-1.5 text-lg font-semibold ${
                  fraudRate > 10 ? 'text-red-600' : fraudRate > 5 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                  {fraudRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Fraude</p>
              </div>
            </div>
            
            {/* Detailed breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Détail des infractions</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-sm text-muted-foreground">Tarifs contrôle</span>
                  <span className="font-semibold">{control.tarifs_controle}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-sm text-muted-foreground">PV</span>
                  <span className="font-semibold">{control.pv}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-sm text-muted-foreground">STT 50%</span>
                  <span className="font-semibold">{control.stt_50}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-sm text-muted-foreground">STT 100%</span>
                  <span className="font-semibold">{control.stt_100}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-sm text-muted-foreground">RNV</span>
                  <span className="font-semibold">{control.rnv}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-sm text-muted-foreground">RI (+/-)</span>
                  <span className="font-semibold">{control.ri_positive}/{control.ri_negative}</span>
                </div>
              </div>
            </div>
            
            {/* Notes */}
            {control.notes && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h4>
                <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 italic">
                  {control.notes}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-row gap-2">
            {onEdit && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  onEdit(control);
                  onOpenChange(false);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce contrôle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contrôle du {format(new Date(control.control_date), 'dd/MM/yyyy', { locale: fr })} 
              {control.train_number && ` (Train ${control.train_number})`} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
