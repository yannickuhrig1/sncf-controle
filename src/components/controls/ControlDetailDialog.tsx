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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  CreditCard,
  UserCheck,
  IdCard,
  Copy,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  onDuplicate?: (control: Control) => void;
}

interface DetailRowProps {
  label: string;
  value: number;
  amount?: number | null;
  showAmount?: boolean;
}

function DetailRow({ label, value, amount, showAmount = true }: DetailRowProps) {
  if (value === 0 && (!amount || amount === 0)) return null;
  
  return (
    <div className="flex justify-between items-center py-1.5 px-2 rounded bg-muted/30">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{value}</span>
        {showAmount && amount !== null && amount !== undefined && amount > 0 && (
          <span className="text-xs text-muted-foreground">({amount.toFixed(2)} €)</span>
        )}
      </div>
    </div>
  );
}

export function ControlDetailDialog({ 
  control, 
  open, 
  onOpenChange,
  onEdit,
  onDelete,
  onDuplicate,
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

  // Check if there are any tarif bord entries
  const hasTarifBord = (control.tarif_bord_stt_50 || 0) > 0 ||
    (control.tarif_bord_stt_100 || 0) > 0 ||
    (control.tarif_bord_rnv || 0) > 0 ||
    (control.tarif_bord_titre_tiers || 0) > 0 ||
    (control.tarif_bord_doc_naissance || 0) > 0 ||
    (control.tarif_bord_autre || 0) > 0;

  // Check if there are any tarif contrôle entries
  const hasTarifControle = control.stt_50 > 0 ||
    control.rnv > 0 ||
    (control.titre_tiers || 0) > 0 ||
    (control.doc_naissance || 0) > 0 ||
    (control.autre_tarif || 0) > 0;

  // Check if there are any PV entries (stt_100 est un PV, pas une régularisation)
  const hasPV = (control.stt_100 || 0) > 0 ||
    (control.pv_stt100 || 0) > 0 ||
    (control.pv_rnv || 0) > 0 ||
    (control.pv_titre_tiers || 0) > 0 ||
    (control.pv_doc_naissance || 0) > 0 ||
    (control.pv_autre || 0) > 0 ||
    control.pv > 0;

  // Check if there are any RI entries
  const hasRI = control.ri_positive > 0 || control.ri_negative > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
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
          
          <ScrollArea className="max-h-[60vh] px-6">
            <div className="space-y-4 pb-4">
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

              {/* Platform */}
              {control.platform_number && (
                <div className="flex items-center gap-2 text-sm">
                  <TrainTrack className="h-4 w-4 text-muted-foreground" />
                  <span>Quai {control.platform_number}</span>
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
                    {fraudCount} ({fraudRate.toFixed(1)}%)
                  </div>
                  <p className="text-xs text-muted-foreground">Fraude</p>
                </div>
              </div>

              {/* Fraud types summary badges */}
              {fraudCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {((control.stt_50 ?? 0) > 0 || (control.stt_100 ?? 0) > 0) && (
                    <Badge variant="outline" className="bg-background">
                      STT: {(control.stt_50 ?? 0) + (control.stt_100 ?? 0)}
                    </Badge>
                  )}
                  {(control.rnv ?? 0) > 0 && (
                    <Badge variant="outline" className="bg-background">
                      RNV: {control.rnv}
                    </Badge>
                  )}
                  {(control.titre_tiers ?? 0) > 0 && (
                    <Badge variant="outline" className="bg-background">
                      Titre tiers: {control.titre_tiers}
                    </Badge>
                  )}
                  {(control.doc_naissance ?? 0) > 0 && (
                    <Badge variant="outline" className="bg-background">
                      Date naiss.: {control.doc_naissance}
                    </Badge>
                  )}
                  {(control.autre_tarif ?? 0) > 0 && (
                    <Badge variant="outline" className="bg-background">
                      Autre: {control.autre_tarif}
                    </Badge>
                  )}
                  {(control.pv ?? 0) > 0 && (
                    <Badge variant="destructive">
                      PV: {control.pv}
                    </Badge>
                  )}
                </div>
              )}

              <Separator />

              {/* Tarifs à bord (ventes) */}
              {hasTarifBord && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    Tarifs à bord (ventes)
                  </h4>
                  <div className="space-y-1">
                    <DetailRow label="STT 50€" value={control.tarif_bord_stt_50 || 0} amount={control.tarif_bord_stt_50_amount} />
                    <DetailRow label="STT 100€" value={control.tarif_bord_stt_100 || 0} amount={control.tarif_bord_stt_100_amount} />
                    <DetailRow label="RNV" value={control.tarif_bord_rnv || 0} amount={control.tarif_bord_rnv_amount} />
                    <DetailRow label="Titre tiers" value={control.tarif_bord_titre_tiers || 0} amount={control.tarif_bord_titre_tiers_amount} />
                    <DetailRow label="Doc. naissance" value={control.tarif_bord_doc_naissance || 0} amount={control.tarif_bord_doc_naissance_amount} />
                    <DetailRow label="Autre" value={control.tarif_bord_autre || 0} amount={control.tarif_bord_autre_amount} />
                  </div>
                </div>
              )}
              
              {/* Tarifs contrôle (régularisations) */}
              {hasTarifControle && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-500" />
                    Tarifs contrôle (régularisations)
                  </h4>
                  <div className="space-y-1">
                    <DetailRow label="STT 50€" value={control.stt_50} amount={control.stt_50_amount} />
                    <DetailRow label="RNV" value={control.rnv} amount={control.rnv_amount} />
                    <DetailRow label="Titre tiers" value={control.titre_tiers || 0} amount={control.titre_tiers_amount} />
                    <DetailRow label="Doc. naissance" value={control.doc_naissance || 0} amount={control.doc_naissance_amount} />
                    <DetailRow label="Autre tarif" value={control.autre_tarif || 0} amount={control.autre_tarif_amount} />
                  </div>
                </div>
              )}

              {/* PV (Procès-verbaux) */}
              {hasPV && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2 text-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    Procès-verbaux ({control.pv})
                  </h4>
                  <div className="space-y-1">
                    <DetailRow label="STT 100€" value={control.stt_100 || 0} amount={control.stt_100_amount} />
                    <DetailRow label="STT100" value={control.pv_stt100 || 0} amount={control.pv_stt100_amount} />
                    <DetailRow label="RNV" value={control.pv_rnv || 0} amount={control.pv_rnv_amount} />
                    <DetailRow label="Titre tiers" value={control.pv_titre_tiers || 0} amount={control.pv_titre_tiers_amount} />
                    <DetailRow label="D. naissance" value={control.pv_doc_naissance || 0} amount={control.pv_doc_naissance_amount} />
                    <DetailRow label="Autre" value={control.pv_autre || 0} amount={control.pv_autre_amount} />
                  </div>
                </div>
              )}

              {/* Relevés d'identité */}
              {hasRI && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2 text-purple-500">
                    <IdCard className="h-4 w-4" />
                    Relevés d'identité (RI)
                  </h4>
                  <div className="space-y-1">
                    <DetailRow label="RI Positive" value={control.ri_positive} showAmount={false} />
                    <DetailRow label="RI Négative" value={control.ri_negative} showAmount={false} />
                  </div>
                </div>
              )}
              
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
          </ScrollArea>
          
          <DialogFooter className="p-6 pt-4 gap-2 border-t">
            <div className="flex flex-wrap gap-2 w-full">
              {onDuplicate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="icon"
                      onClick={() => {
                        onDuplicate(control);
                        onOpenChange(false);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dupliquer ce contrôle</p>
                  </TooltipContent>
                </Tooltip>
              )}
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
            </div>
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
