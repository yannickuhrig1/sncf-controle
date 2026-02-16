import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useControl } from '@/hooks/useControl';
import { useControls } from '@/hooks/useControls';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { getFraudRateColor } from '@/lib/stats';
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
import {
  Train, Building2, TrainTrack,
  Calendar, Clock, Users,
  AlertTriangle, CheckCircle2,
  Edit, Trash2, MapPin, FileText,
  CreditCard, UserCheck, IdCard,
  Copy, ArrowLeft, Loader2,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

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

function DetailRow({ label, value, amount, showAmount = true }: {
  label: string;
  value: number;
  amount?: number | null;
  showAmount?: boolean;
}) {
  if (value === 0 && (!amount || amount === 0)) return null;
  return (
    <div className="flex justify-between items-center py-1.5 px-2 rounded bg-muted/30">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{value}</span>
        {showAmount && amount != null && amount > 0 && (
          <span className="text-xs text-muted-foreground">({amount.toFixed(2)} €)</span>
        )}
      </div>
    </div>
  );
}

export default function ControlDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { control, isLoading } = useControl(id);
  const { deleteControl } = useControls();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!control) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-muted-foreground">Contrôle introuvable.</p>
          <Button variant="outline" onClick={() => navigate('/history')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'historique
          </Button>
        </div>
      </AppLayout>
    );
  }

  const Icon = locationIcons[control.location_type];
  const fraudCount = control.tarifs_controle + control.pv;
  const fraudRate = control.nb_passagers > 0
    ? (fraudCount / control.nb_passagers) * 100
    : 0;

  const hasTarifBord =
    (control.tarif_bord_stt_50 || 0) > 0 ||
    (control.tarif_bord_stt_100 || 0) > 0 ||
    (control.tarif_bord_rnv || 0) > 0 ||
    (control.tarif_bord_titre_tiers || 0) > 0 ||
    (control.tarif_bord_doc_naissance || 0) > 0 ||
    (control.tarif_bord_autre || 0) > 0;

  const hasTarifControle =
    control.stt_50 > 0 || control.stt_100 > 0 || control.rnv > 0 ||
    (control.titre_tiers || 0) > 0 ||
    (control.doc_naissance || 0) > 0 ||
    (control.autre_tarif || 0) > 0;

  const hasPV =
    (control.pv_stt100 || 0) > 0 || (control.pv_rnv || 0) > 0 ||
    (control.pv_titre_tiers || 0) > 0 || (control.pv_doc_naissance || 0) > 0 ||
    (control.pv_autre || 0) > 0 || control.pv > 0;

  const hasRI = control.ri_positive > 0 || control.ri_negative > 0;

  const handleEdit = () => {
    navigate(control.location_type === 'train'
      ? `/onboard?edit=${control.id}`
      : `/station?edit=${control.id}`);
  };

  const handleDuplicate = () => {
    navigate(control.location_type === 'train'
      ? `/onboard?duplicate=${control.id}`
      : `/station?duplicate=${control.id}`);
  };

  const handleDelete = async () => {
    try {
      await deleteControl(control.id);
      toast.success('Contrôle supprimé');
      navigate('/history');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
    setShowDeleteConfirm(false);
  };

  return (
    <AppLayout>
      <div className="space-y-4 pb-6 max-w-lg mx-auto">

        {/* Back button + title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{control.location}</h1>
              <div className="flex items-center gap-2 mt-0.5">
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

        {/* Date / time / route */}
        <Card>
          <CardContent className="pt-4 space-y-2">
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
            {(control.origin || control.destination) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{control.origin || '?'}</span>
                <span className="text-muted-foreground">→</span>
                <span>{control.destination || '?'}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main stats */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1.5 text-xl font-bold">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {control.nb_passagers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Voyageurs</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 text-xl font-bold text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {control.nb_en_regle}
                </div>
                <p className="text-xs text-muted-foreground mt-1">En règle</p>
              </div>
              <div>
                <div className={`flex items-center justify-center gap-1.5 text-xl font-bold ${getFraudRateColor(fraudRate)}`}>
                  <AlertTriangle className="h-4 w-4" />
                  {fraudCount}
                </div>
                <p className={`text-xs mt-1 font-semibold ${getFraudRateColor(fraudRate)}`}>
                  {fraudRate.toFixed(1)}% fraude
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fraud badges summary */}
        {fraudCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {((control.stt_50 ?? 0) + (control.stt_100 ?? 0)) > 0 && (
              <Badge variant="outline">STT: {(control.stt_50 ?? 0) + (control.stt_100 ?? 0)}</Badge>
            )}
            {(control.rnv ?? 0) > 0 && <Badge variant="outline">RNV: {control.rnv}</Badge>}
            {(control.titre_tiers ?? 0) > 0 && <Badge variant="outline">Titre tiers: {control.titre_tiers}</Badge>}
            {(control.doc_naissance ?? 0) > 0 && <Badge variant="outline">D. naiss.: {control.doc_naissance}</Badge>}
            {(control.autre_tarif ?? 0) > 0 && <Badge variant="outline">Autre TC: {control.autre_tarif}</Badge>}
            {(control.pv ?? 0) > 0 && <Badge variant="destructive">PV: {control.pv}</Badge>}
          </div>
        )}

        <Separator />

        {/* Tarifs à bord */}
        {hasTarifBord && (
          <Card>
            <CardContent className="pt-4 space-y-2">
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
            </CardContent>
          </Card>
        )}

        {/* Tarifs contrôle */}
        {hasTarifControle && (
          <Card>
            <CardContent className="pt-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                Tarifs contrôle (régularisations)
              </h4>
              <div className="space-y-1">
                <DetailRow label="STT 50€" value={control.stt_50} amount={control.stt_50_amount} />
                <DetailRow label="STT 100€" value={control.stt_100} amount={control.stt_100_amount} />
                <DetailRow label="RNV" value={control.rnv} amount={control.rnv_amount} />
                <DetailRow label="Titre tiers" value={control.titre_tiers || 0} amount={control.titre_tiers_amount} />
                <DetailRow label="Doc. naissance" value={control.doc_naissance || 0} amount={control.doc_naissance_amount} />
                <DetailRow label="Autre tarif" value={control.autre_tarif || 0} amount={control.autre_tarif_amount} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* PV */}
        {hasPV && (
          <Card>
            <CardContent className="pt-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-4 w-4" />
                Procès-verbaux ({control.pv})
              </h4>
              <div className="space-y-1">
                <DetailRow label="STT100" value={control.pv_stt100 || 0} amount={control.pv_stt100_amount} />
                <DetailRow label="RNV" value={control.pv_rnv || 0} amount={control.pv_rnv_amount} />
                <DetailRow label="Titre tiers" value={control.pv_titre_tiers || 0} amount={control.pv_titre_tiers_amount} />
                <DetailRow label="D. naissance" value={control.pv_doc_naissance || 0} amount={control.pv_doc_naissance_amount} />
                <DetailRow label="Autre" value={control.pv_autre || 0} amount={control.pv_autre_amount} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* RI */}
        {hasRI && (
          <Card>
            <CardContent className="pt-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2 text-purple-500">
                <IdCard className="h-4 w-4" />
                Relevés d'identité (RI)
              </h4>
              <div className="space-y-1">
                <DetailRow label="RI Positive" value={control.ri_positive} showAmount={false} />
                <DetailRow label="RI Négative" value={control.ri_negative} showAmount={false} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {control.notes && (
          <Card>
            <CardContent className="pt-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </h4>
              <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 italic">
                {control.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" onClick={handleDuplicate}>
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Dupliquer</p></TooltipContent>
          </Tooltip>
          <Button variant="outline" className="flex-1" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button variant="destructive" className="flex-1" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce contrôle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contrôle du{' '}
              {format(new Date(control.control_date), 'dd/MM/yyyy', { locale: fr })}
              {control.train_number && ` (Train ${control.train_number})`} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
