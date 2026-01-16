import { useState, useMemo, useCallback, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardControls, type OnboardControl as OnboardControlType } from '@/hooks/useOnboardControls';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { AppLayout } from '@/components/layout/AppLayout';
import { TarifTypeToggle } from '@/components/controls/TarifTypeToggle';
import { CounterInput } from '@/components/controls/CounterInput';
import { TarifListItem, TarifEntry } from '@/components/controls/TarifListItem';
import { FraudSummaryCard } from '@/components/controls/FraudSummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Train,
  Ticket,
  FileText,
  AlertTriangle,
  User,
  MessageSquare,
  Save,
  RotateCcw,
  Download,
  Search,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Types
const TARIF_TYPES = [
  { value: 'stt', label: 'STT' },
  { value: 'rnv', label: 'RNV' },
  { value: 'titre_tiers', label: 'Titre tiers' },
  { value: 'd_naissance', label: 'D. naissance' },
  { value: 'autre', label: 'Autre' },
];

interface FormState {
  trainNumber: string;
  origin: string;
  destination: string;
  controlDate: string;
  controlTime: string;
  passengers: number;
  tarifsBord: TarifEntry[];
  tarifMode: 'bord' | 'exceptionnel';
  tarifsControle: TarifEntry[];
  stt50Count: number;
  pvList: TarifEntry[];
  stt100Count: number;
  riPositif: number;
  riNegatif: number;
  commentaire: string;
}

const INITIAL_FORM_STATE: FormState = {
  trainNumber: '',
  origin: '',
  destination: '',
  controlDate: format(new Date(), 'yyyy-MM-dd'),
  controlTime: format(new Date(), 'HH:mm'),
  passengers: 0,
  tarifsBord: [],
  tarifMode: 'bord',
  tarifsControle: [],
  stt50Count: 0,
  pvList: [],
  stt100Count: 0,
  riPositif: 0,
  riNegatif: 0,
  commentaire: '',
};

export default function OnboardControl() {
  const { user, loading: authLoading, profile } = useAuth();
  const { controls, isLoading, createControl, updateControl, deleteControl, isCreating } =
    useOnboardControls();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const { clearDraft } = useFormPersistence('onboard-control', formState, setFormState, INITIAL_FORM_STATE);

  // Tarif input states
  const [bordTarifMontant, setBordTarifMontant] = useState('');
  const [controleTarifType, setControleTarifType] = useState('stt');
  const [controleTarifMontant, setControleTarifMontant] = useState('');
  const [pvTarifType, setPvTarifType] = useState('stt');
  const [pvTarifMontant, setPvTarifMontant] = useState('');

  // History filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Dialog states
  const [viewControl, setViewControl] = useState<OnboardControlType | null>(null);
  const [editControl, setEditControl] = useState<OnboardControlType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Recent trains for autocomplete
  const recentTrains = useMemo(() => {
    const trains = controls.map((c) => c.train_number).filter(Boolean);
    return [...new Set(trains)].slice(0, 5);
  }, [controls]);

  // Fraud calculation
  const fraudStats = useMemo(() => {
    const tarifsControleCount = formState.tarifsControle.length + formState.stt50Count;
    const pvCount = formState.pvList.length + formState.stt100Count;
    const fraudCount = tarifsControleCount + pvCount;
    const fraudRate = formState.passengers > 0 ? (fraudCount / formState.passengers) * 100 : 0;
    return { fraudCount, fraudRate, tarifsControleCount, pvCount };
  }, [formState.tarifsControle, formState.stt50Count, formState.pvList, formState.stt100Count, formState.passengers]);

  // Filter history
  const filteredControls = useMemo(() => {
    return controls.filter((control) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTrain = control.train_number?.toLowerCase().includes(query);
        const matchesOrigin = control.origin?.toLowerCase().includes(query);
        const matchesDest = control.destination?.toLowerCase().includes(query);
        if (!matchesTrain && !matchesOrigin && !matchesDest) return false;
      }
      // Date range filter
      if (dateFrom && control.control_date < dateFrom) return false;
      if (dateTo && control.control_date > dateTo) return false;
      return true;
    });
  }, [controls, searchQuery, dateFrom, dateTo]);

  // Add tarif handlers
  const addTarifBord = useCallback(() => {
    const montant = parseFloat(bordTarifMontant);
    if (!montant || montant <= 0) return;
    const newEntry: TarifEntry = {
      id: crypto.randomUUID(),
      type: formState.tarifMode,
      typeLabel: formState.tarifMode === 'bord' ? 'Bord' : 'Exceptionnel',
      montant,
      category: formState.tarifMode,
    };
    setFormState((prev) => ({ ...prev, tarifsBord: [...prev.tarifsBord, newEntry] }));
    setBordTarifMontant('');
  }, [bordTarifMontant, formState.tarifMode]);

  const addTarifControle = useCallback(() => {
    const montant = parseFloat(controleTarifMontant);
    if (!montant || montant <= 0) return;
    const typeLabel = TARIF_TYPES.find((t) => t.value === controleTarifType)?.label || controleTarifType;
    const newEntry: TarifEntry = {
      id: crypto.randomUUID(),
      type: controleTarifType,
      typeLabel,
      montant,
      category: 'controle',
    };
    setFormState((prev) => ({ ...prev, tarifsControle: [...prev.tarifsControle, newEntry] }));
    setControleTarifMontant('');
  }, [controleTarifType, controleTarifMontant]);

  const addPv = useCallback(() => {
    const montant = parseFloat(pvTarifMontant);
    if (!montant || montant <= 0) return;
    const typeLabel = TARIF_TYPES.find((t) => t.value === pvTarifType)?.label || pvTarifType;
    const newEntry: TarifEntry = {
      id: crypto.randomUUID(),
      type: pvTarifType,
      typeLabel,
      montant,
      category: 'pv',
    };
    setFormState((prev) => ({ ...prev, pvList: [...prev.pvList, newEntry] }));
    setPvTarifMontant('');
  }, [pvTarifType, pvTarifMontant]);

  // Remove handlers
  const removeTarifBord = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      tarifsBord: prev.tarifsBord.filter((t) => t.id !== id),
    }));
  };

  const removeTarifControle = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      tarifsControle: prev.tarifsControle.filter((t) => t.id !== id),
    }));
  };

  const removePv = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      pvList: prev.pvList.filter((t) => t.id !== id),
    }));
  };

  // Haptic feedback
  const triggerHaptic = (type: 'success' | 'error') => {
    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'success' ? [100] : [50, 50, 50]);
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!formState.trainNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez indiquer le numéro de train',
      });
      triggerHaptic('error');
      return;
    }

    if (formState.passengers <= 0) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez indiquer le nombre de passagers',
      });
      triggerHaptic('error');
      return;
    }

    try {
      const locationName =
        formState.origin && formState.destination
          ? `${formState.origin} → ${formState.destination}`
          : formState.trainNumber;

      await createControl({
        location: locationName,
        train_number: formState.trainNumber.trim(),
        origin: formState.origin.trim() || null,
        destination: formState.destination.trim() || null,
        control_date: formState.controlDate,
        control_time: formState.controlTime,
        nb_passagers: formState.passengers,
        nb_en_regle: formState.passengers - fraudStats.fraudCount,
        tarifs_controle: fraudStats.tarifsControleCount,
        pv: fraudStats.pvCount,
        stt_50: formState.stt50Count,
        stt_100: formState.stt100Count,
        rnv: formState.tarifsControle.filter((t) => t.type === 'rnv').length,
        ri_positive: formState.riPositif,
        ri_negative: formState.riNegatif,
        notes: formState.commentaire.trim() || null,
      } as any);

      toast({
        title: 'Contrôle enregistré',
        description: 'Le contrôle à bord a été ajouté avec succès',
      });
      triggerHaptic('success');
      clearDraft();
      setFormState(INITIAL_FORM_STATE);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || "Impossible d'enregistrer le contrôle",
      });
      triggerHaptic('error');
    }
  };

  // Reset handler
  const handleReset = () => {
    clearDraft();
    setFormState(INITIAL_FORM_STATE);
    toast({
      title: 'Formulaire réinitialisé',
      description: 'Toutes les données ont été effacées',
    });
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteControl(deleteId);
      setDeleteId(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le contrôle',
      });
    }
  };

  // Calculate fraud rate color
  const getFraudRateColor = (rate: number) => {
    if (rate < 5) return 'text-green-600 dark:text-green-400';
    if (rate < 10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getFraudBadgeVariant = (rate: number): 'default' | 'secondary' | 'destructive' => {
    if (rate < 5) return 'default';
    if (rate < 10) return 'secondary';
    return 'destructive';
  };

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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Train className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Contrôle à bord</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Saisissez les données du contrôle et consultez l'historique
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>

        {/* Main Content - 3 Column Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form (2/3 on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Card 1: Train Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Train className="h-4 w-4" />
                  Informations du contrôle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="trainNumber">Numéro de train *</Label>
                  <Input
                    id="trainNumber"
                    placeholder="TGV 6201"
                    value={formState.trainNumber}
                    onChange={(e) => setFormState((p) => ({ ...p, trainNumber: e.target.value }))}
                    list="recent-trains"
                    required
                  />
                  <datalist id="recent-trains">
                    {recentTrains.map((train) => (
                      <option key={train} value={train} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origine</Label>
                    <Input
                      id="origin"
                      placeholder="Paris"
                      value={formState.origin}
                      onChange={(e) => setFormState((p) => ({ ...p, origin: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        id="destination"
                        placeholder="Lyon"
                        value={formState.destination}
                        onChange={(e) => setFormState((p) => ({ ...p, destination: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="controlDate">Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="controlDate"
                        type="date"
                        className="pl-10"
                        value={formState.controlDate}
                        onChange={(e) => setFormState((p) => ({ ...p, controlDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="controlTime">Heure</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="controlTime"
                        type="time"
                        className="pl-10"
                        value={formState.controlTime}
                        onChange={(e) => setFormState((p) => ({ ...p, controlTime: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <CounterInput
                  label="Nombre de passagers *"
                  value={formState.passengers}
                  onChange={(v) => setFormState((p) => ({ ...p, passengers: v }))}
                  min={0}
                  max={9999}
                  steps={[1, 10]}
                />
              </CardContent>
            </Card>

            {/* Card 2: Tarifs à bord */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Tarif à bord / exceptionnel
                </CardTitle>
                <CardDescription>Ces tarifs ne comptent PAS dans le taux de fraude</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toggle Bord / Exceptionnel */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formState.tarifMode === 'bord' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormState((p) => ({ ...p, tarifMode: 'bord' }))}
                  >
                    Bord
                  </Button>
                  <Button
                    type="button"
                    variant={formState.tarifMode === 'exceptionnel' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormState((p) => ({ ...p, tarifMode: 'exceptionnel' }))}
                  >
                    Exceptionnel
                  </Button>
                </div>

                {/* Amount input + Add button */}
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={bordTarifMontant}
                    onChange={(e) => setBordTarifMontant(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTarifBord())}
                  />
                  <Button type="button" onClick={addTarifBord} disabled={!bordTarifMontant}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>

                {/* List of added tarifs */}
                {formState.tarifsBord.length > 0 && (
                  <div className="space-y-2">
                    {formState.tarifsBord.map((t) => (
                      <TarifListItem key={t.id} item={t} onRemove={removeTarifBord} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Tarifs contrôle */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Tarif contrôle
                </CardTitle>
                <CardDescription>Infractions régularisées sur place</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TarifTypeToggle types={TARIF_TYPES} value={controleTarifType} onChange={setControleTarifType} />

                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={controleTarifMontant}
                    onChange={(e) => setControleTarifMontant(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTarifControle())}
                  />
                  <Button type="button" onClick={addTarifControle} disabled={!controleTarifMontant}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>

                {/* STT 50 Counter */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <CounterInput
                    label="STT 50%"
                    sublabel="Supplément Train Tarif réduit"
                    value={formState.stt50Count}
                    onChange={(v) => setFormState((p) => ({ ...p, stt50Count: v }))}
                    showTotal={{ unitPrice: 50, label: 'Total' }}
                  />
                </div>

                {formState.tarifsControle.length > 0 && (
                  <div className="space-y-2">
                    {formState.tarifsControle.map((t) => (
                      <TarifListItem key={t.id} item={t} onRemove={removeTarifControle} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 4: PV */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Procès-verbaux (PV)
                </CardTitle>
                <CardDescription>Infractions verbalisées</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TarifTypeToggle types={TARIF_TYPES} value={pvTarifType} onChange={setPvTarifType} />

                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Montant (€)"
                    value={pvTarifMontant}
                    onChange={(e) => setPvTarifMontant(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPv())}
                  />
                  <Button type="button" onClick={addPv} disabled={!pvTarifMontant} variant="destructive">
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>

                {/* STT 100 Counter */}
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <CounterInput
                    label="STT 100%"
                    sublabel="Supplément Train Tarif plein"
                    value={formState.stt100Count}
                    onChange={(v) => setFormState((p) => ({ ...p, stt100Count: v }))}
                    showTotal={{ unitPrice: 100, label: 'Total' }}
                    variant="danger"
                  />
                </div>

                {formState.pvList.length > 0 && (
                  <div className="space-y-2">
                    {formState.pvList.map((t) => (
                      <TarifListItem key={t.id} item={t} onRemove={removePv} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 5: RI */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Relevés d'identité (RI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <CounterInput
                    label="RI positif"
                    sublabel="Identité vérifiée"
                    value={formState.riPositif}
                    onChange={(v) => setFormState((p) => ({ ...p, riPositif: v }))}
                    variant="success"
                  />
                  <CounterInput
                    label="RI négatif"
                    sublabel="Identité non vérifiable"
                    value={formState.riNegatif}
                    onChange={(v) => setFormState((p) => ({ ...p, riNegatif: v }))}
                    variant="danger"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Commentaires */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Commentaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Remarques, observations..."
                  value={formState.commentaire}
                  onChange={(e) => setFormState((p) => ({ ...p, commentaire: e.target.value }))}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary (1/3 on desktop) */}
          <div className="lg:col-span-1">
            <div className="space-y-4 lg:sticky lg:top-20">
              <FraudSummaryCard
                passengers={formState.passengers}
                fraudCount={fraudStats.fraudCount}
                fraudRate={fraudStats.fraudRate}
                tarifsBord={formState.tarifsBord}
                tarifsControle={formState.tarifsControle}
                pvList={formState.pvList}
                stt50Count={formState.stt50Count}
                stt100Count={formState.stt100Count}
                onReset={handleReset}
                onSubmit={handleSubmit}
                isSubmitting={isCreating}
              />

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer le contrôle
                    </>
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="lg" className="w-full text-destructive hover:text-destructive">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Réinitialiser
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Réinitialiser le formulaire ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Toutes les données saisies seront perdues. Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Réinitialiser
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg">Historique des contrôles</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Recherche</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Train, trajet..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Du</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Au</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredControls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Train className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun contrôle trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Train</TableHead>
                      <TableHead>Trajet</TableHead>
                      <TableHead>Date/Heure</TableHead>
                      <TableHead className="text-right">Passagers</TableHead>
                      <TableHead className="text-right">Fraudes</TableHead>
                      <TableHead className="text-right">Taux</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredControls.map((control) => {
                      const fraudCount = control.tarifs_controle + control.pv;
                      const fraudRate = control.nb_passagers > 0 ? (fraudCount / control.nb_passagers) * 100 : 0;
                      return (
                        <TableRow key={control.id}>
                          <TableCell className="font-medium">{control.train_number || '-'}</TableCell>
                          <TableCell>
                            {control.origin && control.destination
                              ? `${control.origin} → ${control.destination}`
                              : control.location}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(control.control_date), 'dd/MM/yyyy', { locale: fr })}
                            </div>
                            <div className="text-xs text-muted-foreground">{control.control_time}</div>
                          </TableCell>
                          <TableCell className="text-right">{control.nb_passagers}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getFraudBadgeVariant(fraudRate)}>{fraudCount}</Badge>
                          </TableCell>
                          <TableCell className={cn('text-right font-medium', getFraudRateColor(fraudRate))}>
                            {fraudRate.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewControl(control)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditControl(control)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(control.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

        {/* View Dialog */}
        <Dialog open={!!viewControl} onOpenChange={() => setViewControl(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Détail du contrôle</DialogTitle>
              <DialogDescription>
                {viewControl?.train_number} - {viewControl?.control_date}
              </DialogDescription>
            </DialogHeader>
            {viewControl && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Train</p>
                    <p className="font-medium">{viewControl.train_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trajet</p>
                    <p className="font-medium">
                      {viewControl.origin} → {viewControl.destination}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Passagers</p>
                    <p className="font-medium">{viewControl.nb_passagers}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">En règle</p>
                    <p className="font-medium">{viewControl.nb_en_regle}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tarifs contrôle</p>
                    <p className="font-medium">{viewControl.tarifs_controle}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">PV</p>
                    <p className="font-medium">{viewControl.pv}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">STT 50%</p>
                    <p className="font-medium">{viewControl.stt_50}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">STT 100%</p>
                    <p className="font-medium">{viewControl.stt_100}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">RI+</p>
                    <p className="font-medium text-green-600">{viewControl.ri_positive}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">RI-</p>
                    <p className="font-medium text-red-600">{viewControl.ri_negative}</p>
                  </div>
                </div>
                {viewControl.notes && (
                  <div>
                    <p className="text-muted-foreground text-sm">Notes</p>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{viewControl.notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewControl(null)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce contrôle ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le contrôle sera définitivement supprimé.
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
      </div>
    </AppLayout>
  );
}
