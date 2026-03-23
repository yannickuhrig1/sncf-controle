import { useState, useMemo, useEffect, useCallback } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useControls } from '@/hooks/useControls';
import { useLastSync } from '@/hooks/useLastSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOfflineControls } from '@/hooks/useOfflineControls';
import { useParisTime } from '@/hooks/useParisTime';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { TarifTypeToggle } from '@/components/controls/TarifTypeToggle';
import { TarifListItem, TarifEntry } from '@/components/controls/TarifListItem';
import { CounterInput } from '@/components/controls/CounterInput';
import { MissionPreparation, PreparedTrain } from '@/components/controls/MissionPreparation';
import { TrainTileSelector } from '@/components/controls/TrainTileSelector';
import { EmbarkmentControl } from '@/components/controls/EmbarkmentControl';
import { FraudSummary } from '@/components/controls/FraudSummary';
import { SubmitProgress } from '@/components/controls/SubmitProgress';
import { TrainLookupButton } from '@/components/controls/TrainLookupButton';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Building2, ArrowLeft, Save, ArrowRight, X, Clock, Calendar, ArrowDownToLine, ArrowUpFromLine, Users, UserCheck, MessageSquare, FileText, AlertTriangle, Plus, Ticket, Train, Share2, Copy, Mail, Link2, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const TARIF_TYPES = [
  { value: 'stt',         label: 'STT' },
  { value: 'rnv',         label: 'RNV' },
  { value: 'titre_tiers', label: 'Titre tiers' },
  { value: 'd_naissance', label: 'D. naissance' },
  { value: 'autre',       label: 'Autre' },
];

const PV_TYPES = [
  { value: 'pv_stt100',       label: 'STT' },
  { value: 'pv_rnv',          label: 'RNV' },
  { value: 'pv_titre_tiers',  label: 'Titre tiers' },
  { value: 'pv_doc_naissance',label: 'D. naissance' },
  { value: 'pv_autre',        label: 'Autre' },
];

// Liste des gares principales
const GARES_PRINCIPALES = [
  'Paris Gare de Lyon',
  'Paris Gare du Nord',
  'Paris Montparnasse',
  'Paris Saint-Lazare',
  'Paris Est',
  'Paris Austerlitz',
  'Lyon Part-Dieu',
  'Lyon Perrache',
  'Marseille Saint-Charles',
  'Lille Flandres',
  'Lille Europe',
  'Bordeaux Saint-Jean',
  'Toulouse Matabiau',
  'Nice Ville',
  'Nantes',
  'Strasbourg',
  'Montpellier Saint-Roch',
  'Rennes',
  'Grenoble',
  'Dijon Ville',
];

type ControlMode = 'disembarkment' | 'embarkment';

export default function StationControl() {
  const { user, loading: authLoading } = useAuth();
  const { controls, createControl, updateControl, isCreating, isUpdating, isFetching, refetch } = useControls();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formattedLastSync, updateLastSync } = useLastSync();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const { offlineCount, addOfflineControl, syncOfflineControls, isSyncing: isOfflineSyncing } = useOfflineControls();
  
  // Paris timezone auto-refresh
  const { date: parisDate, time: parisTime } = useParisTime(60000);

  // Control mode selection (supports ?mode=embarkment deep-link)
  const [controlMode, setControlMode] = useState<ControlMode>(
    searchParams.get('mode') === 'embarkment' ? 'embarkment' : 'disembarkment'
  );

  // Edit/Duplicate mode
  const editId = searchParams.get('edit');
  const duplicateId = searchParams.get('duplicate');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);

  // Station info
  const [stationName, setStationName] = useState('');
  const [platformNumber, setPlatformNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [trainNumber, setTrainNumber] = useState('');
  const [selectedTrainId, setSelectedTrainId] = useState<string | undefined>();
  const [isCancelled, setIsCancelled]         = useState(false);
  const [isOvercrowded, setIsOvercrowded]     = useState(false);
  const [isPoliceOnBoard, setIsPoliceOnBoard] = useState(false);
  const [isSugeOnBoard, setIsSugeOnBoard]     = useState(false);
  
  // Control date/time - initialized with Paris time
  const [controlDate, setControlDate] = useState(parisDate);
  const [controlTime, setControlTime] = useState(parisTime);
  
  // Auto-update date/time when not in edit mode and form is fresh
  useEffect(() => {
    if (!isEditMode && stationName === '' && nbPassagers === 0) {
      setControlDate(parisDate);
      setControlTime(parisTime);
    }
  }, [parisDate, parisTime, isEditMode, stationName]);
  
  // Pre-fill station from ?station= URL param (rejoindre un groupe)
  useEffect(() => {
    const stationParam = searchParams.get('station');
    if (stationParam && !editId && !duplicateId) {
      setStationName(decodeURIComponent(stationParam));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Collapsible infractions subsections
  const [tarifsOpen, setTarifsOpen] = useState(false);
  const [pvOpen, setPvOpen] = useState(false);

  // Prepared trains (exposed from MissionPreparation for separate tile card)
  const [preparedArrivals, setPreparedArrivals] = useState<PreparedTrain[]>([]);
  const [preparedDepartures, setPreparedDepartures] = useState<PreparedTrain[]>([]);
  const [preparedActiveTab, setPreparedActiveTab] = useState<'arrivals' | 'departures'>('arrivals');

  // Passengers
  const [nbPassagers, setNbPassagers] = useState(0);

  // STT rapides (quick counters)
  const [stt50Count, setStt50Count] = useState(0);
  const [stt100Count, setStt100Count] = useState(0);

  // Tarifs contrôle (list-based, same as À bord)
  const [tarifsControle, setTarifsControle] = useState<TarifEntry[]>([]);
  const [controleTarifType, setControleTarifType] = useState('stt');
  const [controleTarifMontant, setControleTarifMontant] = useState('');
  const [autreControleComment, setAutreControleComment] = useState('');

  // PV (list-based, same as À bord)
  const [pvList, setPvList] = useState<TarifEntry[]>([]);
  const [pvTarifType, setPvTarifType] = useState('pv_stt100');
  const [pvTarifMontant, setPvTarifMontant] = useState('');
  const [autrePvComment, setAutrePvComment] = useState('');

  // RI
  const [riPositive, setRiPositive] = useState(0);
  const [riNegative, setRiNegative] = useState(0);

  // Heure de départ de la gare origine
  const [departureTime, setDepartureTime] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Groupe multi-agents
  const [shareGroupOpen, setShareGroupOpen] = useState(false);
  const [joinGroupOpen,  setJoinGroupOpen]  = useState(false);
  const [joinInput,      setJoinInput]      = useState('');
  const [copySuccess,    setCopySuccess]    = useState(false);

  // Calculate fraud stats
  const fraudStats = useMemo(() => {
    const tarifsControleCount = stt50Count + tarifsControle.length;
    const pvCount = stt100Count + pvList.length;
    const fraudCount = tarifsControleCount + pvCount + riNegative;
    const fraudRate = nbPassagers > 0 ? (fraudCount / nbPassagers) * 100 : 0;
    return { fraudCount, fraudRate, tarifsControleCount, pvCount };
  }, [nbPassagers, stt50Count, tarifsControle, stt100Count, pvList, riNegative]);

  // Load control for editing or duplicating
  useEffect(() => {
    const loadControl = async (controlId: string, forDuplicate: boolean) => {
      // First check in already loaded controls
      const controlToLoad = controls.find(c => c.id === controlId);
      
      if (controlToLoad) {
        // Check if it's a train control - redirect to onboard
        if (controlToLoad.location_type === 'train') {
          const param = forDuplicate ? 'duplicate' : 'edit';
          navigate(`/onboard?${param}=${controlId}`, { replace: true });
          return;
        }
        
        if (forDuplicate) {
          setIsDuplicateMode(true);
          // Clear the duplicate param from URL after loading
          setSearchParams({});
        } else {
          setIsEditMode(true);
        }
        loadControlData(controlToLoad);
      } else if (user) {
        // Control not in local data - fetch directly from DB
        const { data, error } = await supabase
          .from('controls')
          .select('*')
          .eq('id', controlId)
          .single();
        
        if (error || !data) {
          toast.error('Erreur', { description: 'Contrôle non trouvé' });
          setSearchParams({});
          return;
        }
        
        // If it's a train control, redirect to onboard
        if (data.location_type === 'train') {
          const param = forDuplicate ? 'duplicate' : 'edit';
          navigate(`/onboard?${param}=${controlId}`, { replace: true });
          return;
        }
        
        if (forDuplicate) {
          setIsDuplicateMode(true);
          setSearchParams({});
        } else {
          setIsEditMode(true);
        }
        loadControlData(data);
      }
    };
    
    if (editId) {
      loadControl(editId, false);
    } else if (duplicateId) {
      loadControl(duplicateId, true);
    }
  }, [editId, duplicateId, controls, user, navigate, setSearchParams, toast]);
  
  // Helper to load control data into form
  const loadControlData = (data: any) => {
    const locationParts = data.location.split(' - Quai ');
    setStationName(locationParts[0] || '');
    setPlatformNumber(locationParts[1] || data.platform_number || '');
    setOrigin(data.origin || '');
    setDestination(data.destination || '');
    setControlDate(data.control_date);
    setControlTime(data.control_time);
    setTrainNumber(data.train_number || '');
    setNbPassagers(data.nb_passagers || 0);
    setIsCancelled(data.is_cancelled ?? false);
    setIsOvercrowded(data.is_overcrowded ?? false);
    setIsPoliceOnBoard((data as any).is_police_on_board ?? false);
    setIsSugeOnBoard((data as any).is_suge_on_board ?? false);
    setStt50Count(0); // quick counter always reset on load; stt_50 goes into list
    setStt100Count(data.stt_100 || 0);

    // Reconstruct tarifs contrôle list
    const newTarifsControle: TarifEntry[] = [];
    const addTC = (count: number, type: string, typeLabel: string, totalAmount: number) => {
      if (count <= 0) return;
      const amountPerEntry = totalAmount > 0 ? totalAmount / count : 0;
      for (let i = 0; i < count; i++) {
        newTarifsControle.push({ id: crypto.randomUUID(), type, typeLabel, montant: amountPerEntry, category: 'controle' });
      }
    };
    addTC(data.stt_50 || 0, 'stt', 'STT', Number(data.stt_50_amount) || 0);
    addTC(data.rnv || 0, 'rnv', 'RNV', Number(data.rnv_amount) || 0);
    addTC(data.titre_tiers || 0, 'titre_tiers', 'Titre tiers', Number(data.titre_tiers_amount) || 0);
    addTC(data.doc_naissance || 0, 'd_naissance', 'D. naissance', Number(data.doc_naissance_amount) || 0);
    addTC(data.autre_tarif || 0, 'autre', 'Autre', Number(data.autre_tarif_amount) || 0);
    setTarifsControle(newTarifsControle);

    // Reconstruct PV list
    const newPvList: TarifEntry[] = [];
    const addPV = (count: number, type: string, typeLabel: string, totalAmount: number) => {
      if (count <= 0) return;
      const amountPerEntry = totalAmount > 0 ? totalAmount / count : 0;
      for (let i = 0; i < count; i++) {
        newPvList.push({ id: crypto.randomUUID(), type, typeLabel, montant: amountPerEntry, category: 'pv' });
      }
    };
    addPV(data.pv_stt100 || 0, 'pv_stt100', 'STT', Number(data.pv_stt100_amount) || 0);
    addPV(data.pv_rnv || 0, 'pv_rnv', 'RNV', Number(data.pv_rnv_amount) || 0);
    addPV(data.pv_titre_tiers || 0, 'pv_titre_tiers', 'Titre tiers', Number(data.pv_titre_tiers_amount) || 0);
    addPV(data.pv_doc_naissance || 0, 'pv_doc_naissance', 'D. naissance', Number(data.pv_doc_naissance_amount) || 0);
    addPV(data.pv_autre || 0, 'pv_autre', 'Autre', Number(data.pv_autre_amount) || 0);
    setPvList(newPvList);

    setRiPositive(data.ri_positive || 0);
    setRiNegative(data.ri_negative || 0);
    setNotes(data.notes || '');
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setSearchParams({});
    setStationName('');
    setPlatformNumber('');
    setTrainNumber('');
    setSelectedTrainId(undefined);
    setOrigin('');
    setDestination('');
    setDepartureTime('');
    setNbPassagers(0);
    setStt50Count(0);
    setStt100Count(0);
    setTarifsControle([]);
    setControleTarifMontant('');
    setPvList([]);
    setPvTarifMontant('');
    setRiPositive(0);
    setRiNegative(0);
    setNotes('');
    setIsCancelled(false);
    setIsOvercrowded(false);
  };

  // Add/remove tarif handlers
  const addTarifControle = useCallback(() => {
    const montant = parseFloat(controleTarifMontant);
    if (!montant || montant <= 0) return;
    const typeLabel = TARIF_TYPES.find(t => t.value === controleTarifType)?.label || controleTarifType;
    setTarifsControle(prev => [...prev, { id: crypto.randomUUID(), type: controleTarifType, typeLabel, montant, category: 'controle' }]);
    setControleTarifMontant('');
  }, [controleTarifType, controleTarifMontant]);

  const removeTarifControle = (id: string) => setTarifsControle(prev => prev.filter(t => t.id !== id));

  const addPv = useCallback(() => {
    const montant = parseFloat(pvTarifMontant);
    if (!montant || montant <= 0) return;
    const typeLabel = PV_TYPES.find(t => t.value === pvTarifType)?.label || pvTarifType;
    setPvList(prev => [...prev, { id: crypto.randomUUID(), type: pvTarifType, typeLabel, montant, category: 'pv' }]);
    setPvTarifMontant('');
  }, [pvTarifType, pvTarifMontant]);

  const removePv = (id: string) => setPvList(prev => prev.filter(t => t.id !== id));

  // Handle sync - must be before early returns
  const handleSync = useCallback(async () => {
    await refetch();
    updateLastSync();
    toast.success('Données synchronisées');
  }, [refetch, updateLastSync]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stationName.trim()) {
      toast.error('Erreur', { description: 'Veuillez sélectionner une gare' });
      return;
    }

    const locationName = platformNumber
      ? `${stationName} - Quai ${platformNumber}`
      : stationName;

    // Aggregate tarifs contrôle list entries by type
    const sttEntries     = tarifsControle.filter(t => t.type === 'stt');
    const rnvEntries     = tarifsControle.filter(t => t.type === 'rnv');
    const ttEntries      = tarifsControle.filter(t => t.type === 'titre_tiers');
    const dnEntries      = tarifsControle.filter(t => t.type === 'd_naissance');
    const autreEntries   = tarifsControle.filter(t => t.type === 'autre');
    // Aggregate PV list entries by type
    const pvSttEntries   = pvList.filter(t => t.type === 'pv_stt100');
    const pvRnvEntries   = pvList.filter(t => t.type === 'pv_rnv');
    const pvTTEntries    = pvList.filter(t => t.type === 'pv_titre_tiers');
    const pvDNEntries    = pvList.filter(t => t.type === 'pv_doc_naissance');
    const pvAutreEntries = pvList.filter(t => t.type === 'pv_autre');

    const notesParts: string[] = [];
    if (departureTime.trim()) notesParts.push(`[Départ: ${departureTime.trim()}]`);
    if (autreControleComment.trim()) notesParts.push(`[Tarif Autre] ${autreControleComment.trim()}`);
    if (autrePvComment.trim()) notesParts.push(`[PV Autre] ${autrePvComment.trim()}`);
    if (notes.trim()) notesParts.push(notes.trim());
    const finalNotes = notesParts.length > 0 ? notesParts.join(' | ') : null;

    const controlData = {
        location_type: 'gare' as const,
        location: locationName,
        train_number: trainNumber.trim() || null,
        origin: origin.trim() || null,
        destination: destination.trim() || null,
        platform_number: platformNumber.trim() || null,
        control_date: controlDate,
        control_time: controlTime,
        nb_passagers: nbPassagers,
        nb_en_regle: Math.max(0, nbPassagers - fraudStats.fraudCount),
        // Tarifs contrôle (aggregated from list + quick counters)
        stt_50: stt50Count + sttEntries.length,
        stt_50_amount: sttEntries.reduce((s, t) => s + t.montant, 0) || null,
        stt_100: stt100Count,
        stt_100_amount: pvSttEntries.reduce((s, t) => s + t.montant, 0) || null,
        rnv: rnvEntries.length,
        rnv_amount: rnvEntries.reduce((s, t) => s + t.montant, 0) || null,
        titre_tiers: ttEntries.length,
        titre_tiers_amount: ttEntries.reduce((s, t) => s + t.montant, 0) || null,
        doc_naissance: dnEntries.length,
        doc_naissance_amount: dnEntries.reduce((s, t) => s + t.montant, 0) || null,
        autre_tarif: autreEntries.length,
        autre_tarif_amount: autreEntries.reduce((s, t) => s + t.montant, 0) || null,
        tarifs_controle: fraudStats.tarifsControleCount,
        // PV (aggregated from list)
        pv: fraudStats.pvCount,
        pv_stt100: pvSttEntries.length,
        pv_stt100_amount: pvSttEntries.reduce((s, t) => s + t.montant, 0) || null,
        pv_rnv: pvRnvEntries.length,
        pv_rnv_amount: pvRnvEntries.reduce((s, t) => s + t.montant, 0) || null,
        pv_titre_tiers: pvTTEntries.length,
        pv_titre_tiers_amount: pvTTEntries.reduce((s, t) => s + t.montant, 0) || null,
        pv_doc_naissance: pvDNEntries.length,
        pv_doc_naissance_amount: pvDNEntries.reduce((s, t) => s + t.montant, 0) || null,
        pv_autre: pvAutreEntries.length,
        pv_autre_amount: pvAutreEntries.reduce((s, t) => s + t.montant, 0) || null,
        // Tarifs bord (not used for En gare)
        tarif_bord_stt_50: null,
        tarif_bord_stt_50_amount: null,
        tarif_bord_stt_100: null,
        tarif_bord_stt_100_amount: null,
        tarif_bord_rnv: null,
        tarif_bord_rnv_amount: null,
        tarif_bord_titre_tiers: null,
        tarif_bord_titre_tiers_amount: null,
        tarif_bord_doc_naissance: null,
        tarif_bord_doc_naissance_amount: null,
        tarif_bord_autre: null,
        tarif_bord_autre_amount: null,
        // RI
        ri_positive: riPositive,
        ri_negative: riNegative,
        notes: finalNotes,
        is_cancelled:       isCancelled,
        is_overcrowded:     isOvercrowded,
        is_police_on_board: isPoliceOnBoard,
        is_suge_on_board:   isSugeOnBoard,
      };

    try {
      if (isEditMode && editId) {
        await updateControl({ id: editId, ...controlData } as any);
        toast.success('Contrôle modifié', { description: 'Le contrôle en gare a été mis à jour avec succès' });
        setIsEditMode(false);
        setSearchParams({});
      } else {
        // Check if offline - save locally
        if (!isOnline) {
          addOfflineControl(controlData as any);
          navigate('/');
          return;
        }

        await createControl(controlData as any);
        toast.success('Contrôle enregistré', { description: 'Le contrôle en gare a été ajouté avec succès' });
      }

      navigate('/');
    } catch (error: any) {
      // If network error and offline, save locally
      if (!isOnline) {
        addOfflineControl(controlData as any);
        navigate('/');
        return;
      }

      toast.error('Erreur', { description: error.message || "Impossible d'enregistrer le contrôle" });
    }
  };


  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => isEditMode ? handleCancelEdit() : navigate(-1)}>
              {isEditMode ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </Button>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {isEditMode ? 'Modifier le contrôle' : 'Contrôle en gare'}
                {isEditMode && <Badge variant="secondary">Mode édition</Badge>}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEditMode ? 'Modifiez les données du contrôle' : 'Saisissez les données du contrôle en gare'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OfflineIndicator
              isOnline={isOnline}
              pendingCount={pendingCount}
              offlineControlsCount={offlineCount}
              isSyncing={isSyncing || isOfflineSyncing}
            />
            <LastSyncIndicator
              lastSync={formattedLastSync}
              isFetching={isFetching}
              onSync={async () => {
                await handleSync();
                await syncOfflineControls();
              }}
            />
          </div>
        </div>

        {/* Mode Selection - Only show when not in edit mode */}
        {!isEditMode && (
          <div className="grid grid-cols-2 gap-3 max-w-3xl mx-auto w-full">
            <Button
              variant={controlMode === 'disembarkment' ? 'default' : 'outline'}
              onClick={() => setControlMode('disembarkment')}
              className={cn(
                "h-auto py-4 flex flex-col gap-2",
                controlMode === 'disembarkment' && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <ArrowDownToLine className="h-6 w-6" />
              <span className="font-semibold">Débarquement</span>
              <span className="text-xs opacity-80">Contrôle complet</span>
            </Button>
            <Button
              variant={controlMode === 'embarkment' ? 'default' : 'outline'}
              onClick={() => setControlMode('embarkment')}
              className={cn(
                "h-auto py-4 flex flex-col gap-2",
                controlMode === 'embarkment' && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <ArrowUpFromLine className="h-6 w-6" />
              <span className="font-semibold">Embarquement</span>
              <span className="text-xs opacity-80">Refoulement & stats</span>
            </Button>
          </div>
        )}

        {/* Content based on mode */}
        {controlMode === 'embarkment' && !isEditMode ? (
          <div className="max-w-3xl mx-auto w-full">
            <EmbarkmentControl
              stationName={stationName}
              onStationChange={setStationName}
            />
          </div>
        ) : (
          <>
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {/* Groupe multi-agents */}
            {!isEditMode && !isDuplicateMode && (
              <Card>
                <CardContent className="p-3 flex items-center gap-2 flex-wrap">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1 min-w-0">Contrôle multi-agents</span>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setJoinGroupOpen(true)}>
                    <Link2 className="h-3.5 w-3.5" />
                    Rejoindre
                  </Button>
                  <Button
                    size="sm"
                    variant={stationName.trim() ? 'default' : 'outline'}
                    className="gap-1.5"
                    disabled={!stationName.trim()}
                    onClick={() => setShareGroupOpen(true)}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Partager
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Fraud Summary - Sticky */}
            <div className="sticky top-16 z-30">
              <FraudSummary
                passengers={nbPassagers}
                fraudCount={fraudStats.fraudCount}
                fraudRate={fraudStats.fraudRate}
              />
            </div>

            {/* Mission Preparation - collapsible form only (tiles rendered separately) */}
            {!isEditMode && (
              <MissionPreparation
                stationName={stationName}
                selectedTrainId={selectedTrainId}
                showTiles={false}
                showTilesInCard={false}
                onTrainsChange={(arrivals, departures, tab) => {
                  setPreparedArrivals(arrivals);
                  setPreparedDepartures(departures);
                  setPreparedActiveTab(tab);
                }}
                onSelectTrain={(train: PreparedTrain, type: 'arrival' | 'departure') => {
                  setSelectedTrainId(train.id);
                  setTrainNumber(train.trainNumber || '');
                  setOrigin(train.origin || '');
                  setDestination(train.destination || (type === 'arrival' ? stationName : ''));
                  if (train.time) { setControlTime(train.time); setDepartureTime(train.time); }
                }}
              />
            )}

            {/* Trains préparés - separate tile card */}
            {!isEditMode && (preparedArrivals.length > 0 || preparedDepartures.length > 0) && (
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Train className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Trains préparés
                    <span className="text-xs text-muted-foreground font-normal">— cliquer pour sélectionner</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TrainTileSelector
                    trains={preparedActiveTab === 'arrivals' ? preparedArrivals : preparedDepartures}
                    selectedId={selectedTrainId}
                    onSelect={(train) => {
                      setSelectedTrainId(train.id);
                      setTrainNumber(train.trainNumber || '');
                      setOrigin(train.origin || '');
                      setDestination(train.destination || (preparedActiveTab === 'arrivals' ? stationName : ''));
                      if (train.time) { setControlTime(train.time); setDepartureTime(train.time); }
                    }}
                    onRemove={() => {}}
                  />
                </CardContent>
              </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Info train card ─────────────────────────────────────────── */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-cyan-400 to-teal-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                      <Building2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Info train
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Row 1: Gare full width */}
                  <div className="space-y-1.5">
                    <Label htmlFor="stationName">Gare *</Label>
                    <Input
                      id="stationName"
                      list="gares"
                      placeholder="Sélectionner ou saisir une gare"
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                      required
                    />
                    <datalist id="gares">
                      {GARES_PRINCIPALES.map((gare) => <option key={gare} value={gare} />)}
                    </datalist>
                  </div>

                  {/* Row 2: N° Train + Quai */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="trainNumber">N° Train</Label>
                      <div className="flex flex-col gap-1">
                        <Input
                          id="trainNumber"
                          placeholder="Ex: 6231"
                          value={trainNumber}
                          onChange={(e) => setTrainNumber(e.target.value)}
                          inputMode="numeric"
                        />
                        <TrainLookupButton
                          trainNumber={trainNumber}
                          date={controlDate}
                          onResult={(info) => {
                            setOrigin(info.origin || origin);
                            setDestination(info.destination || destination);
                            if (info.departureTime) setControlTime(info.departureTime);
                            if (info.stops[0]?.platform) setPlatformNumber(info.stops[0].platform);
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="platformNumber">Quai</Label>
                      <Input
                        id="platformNumber"
                        placeholder="1A"
                        value={platformNumber}
                        onChange={(e) => setPlatformNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Row 3: Origine → Destination */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="origin">Origine</Label>
                      <Input
                        id="origin"
                        placeholder="Paris"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                      />
                    </div>
                    <div className="pb-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="destination">Destination</Label>
                      <Input
                        id="destination"
                        placeholder="Lyon"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Row 4: Départ origine + Date + Heure contrôle */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="departureTime" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Départ origine
                      </Label>
                      <Input
                        id="departureTime"
                        type="time"
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="controlDate" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date
                      </Label>
                      <Input
                        id="controlDate"
                        type="date"
                        value={controlDate}
                        onChange={(e) => setControlDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="controlTime" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Heure
                      </Label>
                      <Input
                        id="controlTime"
                        type="time"
                        value={controlTime}
                        onChange={(e) => setControlTime(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Row 5: Checkboxes */}
                  <div className="flex items-center gap-4 flex-wrap pt-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <Checkbox checked={isCancelled} onCheckedChange={(v) => setIsCancelled(!!v)} />
                      <span>Train supprimé</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <Checkbox checked={isOvercrowded} onCheckedChange={(v) => setIsOvercrowded(!!v)} />
                      <span>Sur-occupation</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <Checkbox checked={isPoliceOnBoard} onCheckedChange={(v) => setIsPoliceOnBoard(!!v)} />
                      <span>Police à bord</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <Checkbox checked={isSugeOnBoard} onCheckedChange={(v) => setIsSugeOnBoard(!!v)} />
                      <span>SUGE à bord</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* ── Voyageurs card ───────────────────────────────────────────── */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-teal-400 to-green-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                      <Users className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    </div>
                    Voyageurs
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-2">
                  <CounterInput label="Nombre contrôlés" value={nbPassagers} onChange={setNbPassagers} min={0} max={9999} steps={[1, 10]} />
                </CardContent>
              </Card>

              {/* ── Infractions card (unified) ───────────────────────────────── */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-rose-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Ticket className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    Infractions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick counters — 2-col grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <CounterInput
                        label="STT 50€"
                        sublabel="Tarif contrôle"
                        value={stt50Count}
                        onChange={setStt50Count}
                        showTotal={{ unitPrice: 50, label: 'Total' }}
                      />
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <CounterInput
                        label="PV 100€"
                        sublabel="Procès-verbal"
                        value={stt100Count}
                        onChange={setStt100Count}
                        showTotal={{ unitPrice: 100, label: 'Total' }}
                        variant="danger"
                      />
                    </div>
                  </div>

                  {/* Subsection: Détail tarifs contrôle */}
                  <div className="border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors text-left"
                      onClick={() => setTarifsOpen((v) => !v)}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                        <FileText className="h-3.5 w-3.5" />
                        Détail tarifs contrôle
                        {tarifsControle.length > 0 && (
                          <Badge variant="secondary" className="text-xs py-0 h-4">{tarifsControle.length}</Badge>
                        )}
                      </span>
                      <ChevronDown className={cn('h-4 w-4 text-amber-600 transition-transform', tarifsOpen && 'rotate-180')} />
                    </button>
                    {tarifsOpen && (
                      <div className="p-4 space-y-3 border-t">
                        <TarifTypeToggle types={TARIF_TYPES} value={controleTarifType} onChange={setControleTarifType} />
                        {controleTarifType === 'autre' && (
                          <Input
                            placeholder="Précisez l'infraction..."
                            value={autreControleComment}
                            onChange={(e) => setAutreControleComment(e.target.value)}
                          />
                        )}
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
                            <Plus className="h-4 w-4 mr-1" />Ajouter
                          </Button>
                        </div>
                        {tarifsControle.length > 0 && (
                          <div className="space-y-2">
                            {tarifsControle.map((t) => (
                              <TarifListItem key={t.id} item={t} onRemove={removeTarifControle} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Subsection: Détail PV */}
                  <div className="border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors text-left"
                      onClick={() => setPvOpen((v) => !v)}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-rose-800 dark:text-rose-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Détail PV
                        {pvList.length > 0 && (
                          <Badge variant="secondary" className="text-xs py-0 h-4">{pvList.length}</Badge>
                        )}
                      </span>
                      <ChevronDown className={cn('h-4 w-4 text-rose-600 transition-transform', pvOpen && 'rotate-180')} />
                    </button>
                    {pvOpen && (
                      <div className="p-4 space-y-3 border-t">
                        <TarifTypeToggle types={PV_TYPES} value={pvTarifType} onChange={setPvTarifType} />
                        {pvTarifType === 'pv_autre' && (
                          <Input
                            placeholder="Précisez l'infraction..."
                            value={autrePvComment}
                            onChange={(e) => setAutrePvComment(e.target.value)}
                          />
                        )}
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
                            <Plus className="h-4 w-4 mr-1" />Ajouter
                          </Button>
                        </div>
                        {pvList.length > 0 && (
                          <div className="space-y-2">
                            {pvList.map((t) => (
                              <TarifListItem key={t.id} item={t} onRemove={removePv} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── RI card ──────────────────────────────────────────────────── */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                      <UserCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    Relevés d'identité (RI)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <CounterInput label="RI positive" sublabel="Identité vérifiée" value={riPositive} onChange={setRiPositive} variant="success" />
                    <CounterInput label="RI négative" sublabel="Identité non vérifiable" value={riNegative} onChange={setRiNegative} variant="danger" />
                  </div>
                </CardContent>
              </Card>

              {/* ── Notes card ───────────────────────────────────────────────── */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-slate-300 to-gray-400" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                    </div>
                    Commentaire
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Remarques, observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* ── Submit ───────────────────────────────────────────────────── */}
              <Button type="submit" className="w-full" size="lg" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Mise à jour...' : 'Enregistrement...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditMode ? 'Mettre à jour' : 'Enregistrer le contrôle'}
                  </>
                )}
              </Button>

              {/* Progress overlay */}
              <SubmitProgress isSubmitting={isCreating || isUpdating} />
            </form>
          </div>
          </>
        )}
      </div>

      {/* ── Dialog : Rejoindre un groupe ───────────────────────────────── */}
      <Dialog open={joinGroupOpen} onOpenChange={setJoinGroupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Rejoindre un groupe
            </DialogTitle>
            <DialogDescription>
              Entrez le nom de la gare partagée pour rejoindre le groupe de contrôle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Ex: Metz, Luxembourg…"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && joinInput.trim()) {
                  setStationName(joinInput.trim());
                  setJoinGroupOpen(false);
                  setJoinInput('');
                }
              }}
            />
            <Button
              className="w-full"
              disabled={!joinInput.trim()}
              onClick={() => {
                setStationName(joinInput.trim());
                setJoinGroupOpen(false);
                setJoinInput('');
              }}
            >
              Rejoindre
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Partager la session ───────────────────────────────── */}
      <Dialog open={shareGroupOpen} onOpenChange={setShareGroupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Partager la session — {stationName}
            </DialogTitle>
            <DialogDescription>
              Partagez ce QR code ou ce lien pour que d'autres agents rejoignent le contrôle en gare de {stationName}.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const shareUrl = `${window.location.origin}/station?station=${encodeURIComponent(stationName)}`;
            const smsBody  = encodeURIComponent(`Rejoins le contrôle en gare de ${stationName} : ${shareUrl}`);
            const mailSub  = encodeURIComponent(`Contrôle gare ${stationName}`);
            const mailBody = encodeURIComponent(`Rejoins le contrôle en gare de ${stationName} :\n${shareUrl}`);
            const qrSrc    = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

            return (
              <div className="space-y-4 pt-1">
                {/* QR Code */}
                <div className="flex justify-center">
                  <img
                    src={qrSrc}
                    alt="QR Code"
                    width={180}
                    height={180}
                    className="rounded-lg border"
                  />
                </div>

                {/* URL */}
                <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                  <span className="text-xs text-muted-foreground truncate flex-1">{shareUrl}</span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl).then(() => {
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copySuccess ? 'Copié !' : 'Copier'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => window.open(`sms:?body=${smsBody}`)}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    SMS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => window.open(`mailto:?subject=${mailSub}&body=${mailBody}`)}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Button>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => navigator.share({ title: `Contrôle gare ${stationName}`, url: shareUrl })}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Partager
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
