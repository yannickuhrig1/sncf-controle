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
import { TarifSection } from '@/components/controls/TarifSection';
import { MissionPreparation, PreparedTrain } from '@/components/controls/MissionPreparation';
import { EmbarkmentControl } from '@/components/controls/EmbarkmentControl';
import { FraudSummary } from '@/components/controls/FraudSummary';
import { SubmitProgress } from '@/components/controls/SubmitProgress';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Building2, ArrowLeft, Save, ArrowRight, X, Clock, Calendar, ArrowDownToLine, ArrowUpFromLine, Users, UserCheck, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Control mode selection
  const [controlMode, setControlMode] = useState<ControlMode>('disembarkment');

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
  
  // Passengers
  const [nbPassagers, setNbPassagers] = useState(0);
  const [nbEnRegle, setNbEnRegle] = useState(0);

  // Tarifs à bord (ventes)
  const [tarifBordStt50, setTarifBordStt50] = useState({ count: 0, amount: 0 });
  const [tarifBordStt100, setTarifBordStt100] = useState({ count: 0, amount: 0 });
  const [tarifBordRnv, setTarifBordRnv] = useState({ count: 0, amount: 0 });
  const [tarifBordTitreTiers, setTarifBordTitreTiers] = useState({ count: 0, amount: 0 });
  const [tarifBordDocNaissance, setTarifBordDocNaissance] = useState({ count: 0, amount: 0 });
  const [tarifBordAutre, setTarifBordAutre] = useState({ count: 0, amount: 0 });

  // Tarifs contrôle (infractions régularisées)
  const [stt50, setStt50] = useState({ count: 0, amount: 0 });
  const [stt100, setStt100] = useState({ count: 0, amount: 0 });
  const [rnv, setRnv] = useState({ count: 0, amount: 0 });
  const [titreTiers, setTitreTiers] = useState({ count: 0, amount: 0 });
  const [docNaissance, setDocNaissance] = useState({ count: 0, amount: 0 });
  const [autreTarif, setAutreTarif] = useState({ count: 0, amount: 0 });

  // PV
  const [pvStt100, setPvStt100] = useState({ count: 0, amount: 0 });
  const [pvRnv, setPvRnv] = useState({ count: 0, amount: 0 });
  const [pvTitreTiers, setPvTitreTiers] = useState({ count: 0, amount: 0 });
  const [pvDocNaissance, setPvDocNaissance] = useState({ count: 0, amount: 0 });
  const [pvAutre, setPvAutre] = useState({ count: 0, amount: 0 });

  // RI
  const [riPositive, setRiPositive] = useState(0);
  const [riNegative, setRiNegative] = useState(0);

  // Notes
  const [notes, setNotes] = useState('');

  // Calculate fraud stats
  const fraudStats = useMemo(() => {
    const tarifsControleCount = stt50.count + stt100.count + rnv.count + titreTiers.count + docNaissance.count + autreTarif.count;
    const pvCount = pvStt100.count + pvRnv.count + pvTitreTiers.count + pvDocNaissance.count + pvAutre.count;
    const fraudCount = tarifsControleCount + pvCount + riNegative;
    const fraudRate = nbPassagers > 0 ? (fraudCount / nbPassagers) * 100 : 0;
    return { fraudCount, fraudRate, tarifsControleCount, pvCount };
  }, [nbPassagers, stt50, stt100, rnv, titreTiers, docNaissance, autreTarif, pvStt100, pvRnv, pvTitreTiers, pvDocNaissance, pvAutre, riNegative]);

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
    setNbPassagers(data.nb_passagers || 0);
    setNbEnRegle(data.nb_en_regle || 0);
    // Tarifs contrôle
    setStt50({ count: data.stt_50 || 0, amount: Number(data.stt_50_amount) || 0 });
    setStt100({ count: data.stt_100 || 0, amount: Number(data.stt_100_amount) || 0 });
    setRnv({ count: data.rnv || 0, amount: Number(data.rnv_amount) || 0 });
    setTitreTiers({ count: data.titre_tiers || 0, amount: Number(data.titre_tiers_amount) || 0 });
    setDocNaissance({ count: data.doc_naissance || 0, amount: Number(data.doc_naissance_amount) || 0 });
    setAutreTarif({ count: data.autre_tarif || 0, amount: Number(data.autre_tarif_amount) || 0 });
    // Tarifs bord
    setTarifBordStt50({ count: data.tarif_bord_stt_50 || 0, amount: Number(data.tarif_bord_stt_50_amount) || 0 });
    setTarifBordStt100({ count: data.tarif_bord_stt_100 || 0, amount: Number(data.tarif_bord_stt_100_amount) || 0 });
    setTarifBordRnv({ count: data.tarif_bord_rnv || 0, amount: Number(data.tarif_bord_rnv_amount) || 0 });
    setTarifBordTitreTiers({ count: data.tarif_bord_titre_tiers || 0, amount: Number(data.tarif_bord_titre_tiers_amount) || 0 });
    setTarifBordDocNaissance({ count: data.tarif_bord_doc_naissance || 0, amount: Number(data.tarif_bord_doc_naissance_amount) || 0 });
    setTarifBordAutre({ count: data.tarif_bord_autre || 0, amount: Number(data.tarif_bord_autre_amount) || 0 });
    // PV
    setPvStt100({ count: data.pv_stt100 || 0, amount: Number(data.pv_stt100_amount) || 0 });
    setPvRnv({ count: data.pv_rnv || 0, amount: Number(data.pv_rnv_amount) || 0 });
    setPvTitreTiers({ count: data.pv_titre_tiers || 0, amount: Number(data.pv_titre_tiers_amount) || 0 });
    setPvDocNaissance({ count: data.pv_doc_naissance || 0, amount: Number(data.pv_doc_naissance_amount) || 0 });
    setPvAutre({ count: data.pv_autre || 0, amount: Number(data.pv_autre_amount) || 0 });
    // RI
    setRiPositive(data.ri_positive || 0);
    setRiNegative(data.ri_negative || 0);
    setNotes(data.notes || '');
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setSearchParams({});
    // Reset form
    setStationName('');
    setPlatformNumber('');
    setTrainNumber('');
    setSelectedTrainId(undefined);
    setOrigin('');
    setDestination('');
    setNbPassagers(0);
    setNbEnRegle(0);
    setStt50({ count: 0, amount: 0 });
    setStt100({ count: 0, amount: 0 });
    setRnv({ count: 0, amount: 0 });
    setRiPositive(0);
    setRiNegative(0);
    setNotes('');
  };

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

    try {
      const locationName = platformNumber 
        ? `${stationName} - Quai ${platformNumber}` 
        : stationName;

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
        nb_en_regle: nbEnRegle,
        // Tarifs bord
        tarif_bord_stt_50: tarifBordStt50.count,
        tarif_bord_stt_50_amount: tarifBordStt50.amount,
        tarif_bord_stt_100: tarifBordStt100.count,
        tarif_bord_stt_100_amount: tarifBordStt100.amount,
        tarif_bord_rnv: tarifBordRnv.count,
        tarif_bord_rnv_amount: tarifBordRnv.amount,
        tarif_bord_titre_tiers: tarifBordTitreTiers.count,
        tarif_bord_titre_tiers_amount: tarifBordTitreTiers.amount,
        tarif_bord_doc_naissance: tarifBordDocNaissance.count,
        tarif_bord_doc_naissance_amount: tarifBordDocNaissance.amount,
        tarif_bord_autre: tarifBordAutre.count,
        tarif_bord_autre_amount: tarifBordAutre.amount,
        // Tarifs contrôle
        stt_50: stt50.count,
        stt_50_amount: stt50.amount,
        stt_100: stt100.count,
        stt_100_amount: stt100.amount,
        rnv: rnv.count,
        rnv_amount: rnv.amount,
        titre_tiers: titreTiers.count,
        titre_tiers_amount: titreTiers.amount,
        doc_naissance: docNaissance.count,
        doc_naissance_amount: docNaissance.amount,
        autre_tarif: autreTarif.count,
        autre_tarif_amount: autreTarif.amount,
        tarifs_controle: fraudStats.tarifsControleCount,
        // PV
        pv: fraudStats.pvCount,
        pv_stt100: pvStt100.count,
        pv_stt100_amount: pvStt100.amount,
        pv_rnv: pvRnv.count,
        pv_rnv_amount: pvRnv.amount,
        pv_titre_tiers: pvTitreTiers.count,
        pv_titre_tiers_amount: pvTitreTiers.amount,
        pv_doc_naissance: pvDocNaissance.count,
        pv_doc_naissance_amount: pvDocNaissance.amount,
        pv_autre: pvAutre.count,
        pv_autre_amount: pvAutre.amount,
        // RI
        ri_positive: riPositive,
        ri_negative: riNegative,
        notes: notes.trim() || null,
      };

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
        const locationName = platformNumber 
          ? `${stationName} - Quai ${platformNumber}` 
          : stationName;
          
        addOfflineControl({
          location_type: 'gare' as const,
          location: locationName,
          train_number: null,
          origin: origin.trim() || null,
          destination: destination.trim() || null,
          platform_number: platformNumber.trim() || null,
          nb_passagers: nbPassagers,
          nb_en_regle: nbEnRegle,
          tarif_bord_stt_50: tarifBordStt50.count,
          tarif_bord_stt_50_amount: tarifBordStt50.amount,
          tarif_bord_stt_100: tarifBordStt100.count,
          tarif_bord_stt_100_amount: tarifBordStt100.amount,
          tarif_bord_rnv: tarifBordRnv.count,
          tarif_bord_rnv_amount: tarifBordRnv.amount,
          stt_50: stt50.count,
          stt_50_amount: stt50.amount,
          stt_100: stt100.count,
          stt_100_amount: stt100.amount,
          rnv: rnv.count,
          rnv_amount: rnv.amount,
          tarifs_controle: fraudStats.tarifsControleCount,
          pv: fraudStats.pvCount,
          pv_stt100: pvStt100.count,
          pv_stt100_amount: pvStt100.amount,
          pv_rnv: pvRnv.count,
          pv_rnv_amount: pvRnv.amount,
          pv_titre_tiers: pvTitreTiers.count,
          pv_titre_tiers_amount: pvTitreTiers.amount,
          pv_doc_naissance: pvDocNaissance.count,
          pv_doc_naissance_amount: pvDocNaissance.amount,
          pv_autre: pvAutre.count,
          pv_autre_amount: pvAutre.amount,
          ri_positive: riPositive,
          ri_negative: riNegative,
          notes: notes.trim() || null,
        } as any);
        navigate('/');
        return;
      }
      
      toast.error('Erreur', { description: error.message || "Impossible d'enregistrer le contrôle" });
    }
  };

  const tarifsBordItems = [
    { id: 'stt50', label: 'STT 50€ - Supplément Train Tarif', ...tarifBordStt50, onCountChange: (v: number) => setTarifBordStt50(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordStt50(p => ({ ...p, amount: v })) },
    { id: 'stt100', label: 'STT 100% - Supplément Train Tarif plein', ...tarifBordStt100, onCountChange: (v: number) => setTarifBordStt100(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordStt100(p => ({ ...p, amount: v })) },
    { id: 'rnv', label: 'RNV - Régularisation Non Valide', ...tarifBordRnv, onCountChange: (v: number) => setTarifBordRnv(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordRnv(p => ({ ...p, amount: v })) },
    { id: 'titreTiers', label: 'Titre tiers - Vente pour compte tiers', ...tarifBordTitreTiers, onCountChange: (v: number) => setTarifBordTitreTiers(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordTitreTiers(p => ({ ...p, amount: v })) },
    { id: 'docNaissance', label: 'Document de naissance', ...tarifBordDocNaissance, onCountChange: (v: number) => setTarifBordDocNaissance(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordDocNaissance(p => ({ ...p, amount: v })) },
    { id: 'autre', label: 'Autre tarification', ...tarifBordAutre, onCountChange: (v: number) => setTarifBordAutre(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordAutre(p => ({ ...p, amount: v })) },
  ];

  const tarifsControleItems = [
    { id: 'ctrl-stt50', label: 'STT 50€', ...stt50, onCountChange: (v: number) => setStt50(p => ({ ...p, count: v })), onAmountChange: (v: number) => setStt50(p => ({ ...p, amount: v })) },
    { id: 'ctrl-stt100', label: 'STT 100%', ...stt100, onCountChange: (v: number) => setStt100(p => ({ ...p, count: v })), onAmountChange: (v: number) => setStt100(p => ({ ...p, amount: v })) },
    { id: 'ctrl-rnv', label: 'RNV', ...rnv, onCountChange: (v: number) => setRnv(p => ({ ...p, count: v })), onAmountChange: (v: number) => setRnv(p => ({ ...p, amount: v })) },
    { id: 'ctrl-titreTiers', label: 'Titre tiers', ...titreTiers, onCountChange: (v: number) => setTitreTiers(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTitreTiers(p => ({ ...p, amount: v })) },
    { id: 'ctrl-docNaissance', label: 'Document de naissance', ...docNaissance, onCountChange: (v: number) => setDocNaissance(p => ({ ...p, count: v })), onAmountChange: (v: number) => setDocNaissance(p => ({ ...p, amount: v })) },
    { id: 'ctrl-autre', label: 'Autre', ...autreTarif, onCountChange: (v: number) => setAutreTarif(p => ({ ...p, count: v })), onAmountChange: (v: number) => setAutreTarif(p => ({ ...p, amount: v })) },
  ];

  const pvItems = [
    { id: 'pv-stt100', label: 'STT100', ...pvStt100, onCountChange: (v: number) => setPvStt100(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvStt100(p => ({ ...p, amount: v })) },
    { id: 'pv-rnv', label: 'RNV', ...pvRnv, onCountChange: (v: number) => setPvRnv(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvRnv(p => ({ ...p, amount: v })) },
    { id: 'pv-titre-tiers', label: 'Titre tiers', ...pvTitreTiers, onCountChange: (v: number) => setPvTitreTiers(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvTitreTiers(p => ({ ...p, amount: v })) },
    { id: 'pv-doc-naissance', label: 'D. naissance', ...pvDocNaissance, onCountChange: (v: number) => setPvDocNaissance(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvDocNaissance(p => ({ ...p, amount: v })) },
    { id: 'pv-autre', label: 'Autre', ...pvAutre, onCountChange: (v: number) => setPvAutre(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvAutre(p => ({ ...p, amount: v })) },
  ];


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
          <div className="grid grid-cols-2 gap-3">
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
          <EmbarkmentControl 
            stationName={stationName}
            onStationChange={setStationName}
          />
        ) : (
          <>
            {/* Fraud Summary - Sticky */}
            <div className="sticky top-16 z-30">
              <FraudSummary
                passengers={nbPassagers}
                fraudCount={fraudStats.fraudCount}
                fraudRate={fraudStats.fraudRate}
              />
            </div>
            
            {/* Mission Preparation - Before form with tile selection */}
            {!isEditMode && (
              <MissionPreparation
                stationName={stationName}
                selectedTrainId={selectedTrainId}
                showTiles={true}
                onSelectTrain={(train: PreparedTrain, type: 'arrival' | 'departure') => {
                  // Pre-fill form with selected train data
                  setSelectedTrainId(train.id);
                  setTrainNumber(train.trainNumber || '');
                  setOrigin(train.origin || '');
                  setDestination(train.destination || (type === 'arrival' ? stationName : ''));
                  // For arrival time, set the control time to arrival time
                  if (train.time) {
                    setControlTime(train.time);
                  }
                }}
              />
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Station Info */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-cyan-400 to-teal-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                      <Building2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    Informations gare & train
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stationName">Gare *</Label>
                      <Input
                        id="stationName"
                        list="gares"
                        placeholder="Sélectionner ou saisir"
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                        required
                      />
                      <datalist id="gares">
                        {GARES_PRINCIPALES.map((gare) => (
                          <option key={gare} value={gare} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trainNumber">N° Train</Label>
                      <Input
                        id="trainNumber"
                        placeholder="Ex: 6231"
                        value={trainNumber}
                        onChange={(e) => setTrainNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platformNumber">Numéro de quai</Label>
                    <Input
                      id="platformNumber"
                      placeholder="1A"
                      value={platformNumber}
                      onChange={(e) => setPlatformNumber(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
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
                    <div className="space-y-2">
                      <Label htmlFor="controlTime" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Heure (Paris)
                      </Label>
                      <Input
                        id="controlTime"
                        type="time"
                        value={controlTime}
                        onChange={(e) => setControlTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="origin">Origine du flux</Label>
                      <Input
                        id="origin"
                        placeholder="Paris"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination">Destination</Label>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Input
                          id="destination"
                          placeholder="Lyon"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Passengers */}
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
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nbPassagers">Nombre contrôlés</Label>
                      <Input
                        id="nbPassagers"
                        type="number"
                        min="0"
                        value={nbPassagers}
                        onChange={(e) => setNbPassagers(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nbEnRegle">En règle</Label>
                      <Input
                        id="nbEnRegle"
                        type="number"
                        min="0"
                        value={nbEnRegle}
                        onChange={(e) => setNbEnRegle(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tarifs à bord */}
              <TarifSection
                title="Tarifs à bord"
                description="Ventes réalisées"
                items={tarifsBordItems}
                variant="mint"
              />

              {/* Tarifs contrôle */}
              <TarifSection
                title="Tarifs contrôle"
                description="Infractions régularisées sur place"
                items={tarifsControleItems}
                variant="amber"
              />

              {/* PV */}
              <TarifSection
                title="Procès-Verbaux (PV)"
                description="Infractions verbalisées"
                items={pvItems}
                variant="rose"
              />

              {/* RI */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                      <UserCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    Relevés d'Identité (RI)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="riPositive" className="text-success font-medium">RI Positive</Label>
                      <p className="text-xs text-muted-foreground">Identité vérifiée</p>
                      <Input
                        id="riPositive"
                        type="number"
                        min="0"
                        value={riPositive}
                        onChange={(e) => setRiPositive(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="riNegative" className="text-destructive font-medium">RI Négative</Label>
                      <p className="text-xs text-muted-foreground">Identité non vérifiable</p>
                      <Input
                        id="riNegative"
                        type="number"
                        min="0"
                        value={riNegative}
                        onChange={(e) => setRiNegative(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
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

              {/* Submit */}
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
