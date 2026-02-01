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
import { FraudSummary } from '@/components/controls/FraudSummary';
import { SubmitProgress } from '@/components/controls/SubmitProgress';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { Loader2, Building2, ArrowLeft, Save, ArrowRight, X, Clock, Calendar } from 'lucide-react';

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

export default function StationControl() {
  const { user, loading: authLoading } = useAuth();
  const { controls, createControl, updateControl, isCreating, isUpdating, isFetching, refetch } = useControls();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { formattedLastSync, updateLastSync } = useLastSync();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const { offlineCount, addOfflineControl, syncOfflineControls, isSyncing: isOfflineSyncing } = useOfflineControls();
  
  // Paris timezone auto-refresh
  const { date: parisDate, time: parisTime } = useParisTime(60000);

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
  const [pvAbsenceTitre, setPvAbsenceTitre] = useState({ count: 0, amount: 0 });
  const [pvTitreInvalide, setPvTitreInvalide] = useState({ count: 0, amount: 0 });
  const [pvRefusControle, setPvRefusControle] = useState({ count: 0, amount: 0 });
  const [pvAutre, setPvAutre] = useState({ count: 0, amount: 0 });

  // RI
  const [riPositive, setRiPositive] = useState(0);
  const [riNegative, setRiNegative] = useState(0);

  // Notes
  const [notes, setNotes] = useState('');

  // Calculate fraud stats
  const fraudStats = useMemo(() => {
    const tarifsControleCount = stt50.count + stt100.count + rnv.count + titreTiers.count + docNaissance.count + autreTarif.count;
    const pvCount = pvAbsenceTitre.count + pvTitreInvalide.count + pvRefusControle.count + pvAutre.count;
    const fraudCount = tarifsControleCount + pvCount;
    const fraudRate = nbPassagers > 0 ? (fraudCount / nbPassagers) * 100 : 0;
    return { fraudCount, fraudRate, tarifsControleCount, pvCount };
  }, [nbPassagers, stt50, stt100, rnv, titreTiers, docNaissance, autreTarif, pvAbsenceTitre, pvTitreInvalide, pvRefusControle, pvAutre]);

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
          toast({
            variant: 'destructive',
            title: 'Erreur',
            description: 'Contrôle non trouvé',
          });
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
    setPvAbsenceTitre({ count: data.pv_absence_titre || 0, amount: Number(data.pv_absence_titre_amount) || 0 });
    setPvTitreInvalide({ count: data.pv_titre_invalide || 0, amount: Number(data.pv_titre_invalide_amount) || 0 });
    setPvRefusControle({ count: data.pv_refus_controle || 0, amount: Number(data.pv_refus_controle_amount) || 0 });
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
    sonnerToast.success('Données synchronisées');
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
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner une gare',
      });
      return;
    }

    try {
      const locationName = platformNumber 
        ? `${stationName} - Quai ${platformNumber}` 
        : stationName;

      const controlData = {
        location_type: 'gare' as const,
        location: locationName,
        train_number: null,
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
        pv_absence_titre: pvAbsenceTitre.count,
        pv_absence_titre_amount: pvAbsenceTitre.amount,
        pv_titre_invalide: pvTitreInvalide.count,
        pv_titre_invalide_amount: pvTitreInvalide.amount,
        pv_refus_controle: pvRefusControle.count,
        pv_refus_controle_amount: pvRefusControle.amount,
        pv_autre: pvAutre.count,
        pv_autre_amount: pvAutre.amount,
        // RI
        ri_positive: riPositive,
        ri_negative: riNegative,
        notes: notes.trim() || null,
      };

      if (isEditMode && editId) {
        await updateControl({ id: editId, ...controlData } as any);
        toast({
          title: 'Contrôle modifié',
          description: 'Le contrôle en gare a été mis à jour avec succès',
        });
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
        toast({
          title: 'Contrôle enregistré',
          description: 'Le contrôle en gare a été ajouté avec succès',
        });
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
          pv_absence_titre: pvAbsenceTitre.count,
          pv_absence_titre_amount: pvAbsenceTitre.amount,
          pv_titre_invalide: pvTitreInvalide.count,
          pv_titre_invalide_amount: pvTitreInvalide.amount,
          pv_refus_controle: pvRefusControle.count,
          pv_refus_controle_amount: pvRefusControle.amount,
          pv_autre: pvAutre.count,
          pv_autre_amount: pvAutre.amount,
          ri_positive: riPositive,
          ri_negative: riNegative,
          notes: notes.trim() || null,
        } as any);
        navigate('/');
        return;
      }
      
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || "Impossible d'enregistrer le contrôle",
      });
    }
  };

  const tarifsBordItems = [
    { id: 'stt50', label: 'STT 50% - Supplément Train Tarif réduit', ...tarifBordStt50, onCountChange: (v: number) => setTarifBordStt50(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordStt50(p => ({ ...p, amount: v })) },
    { id: 'stt100', label: 'STT 100% - Supplément Train Tarif plein', ...tarifBordStt100, onCountChange: (v: number) => setTarifBordStt100(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordStt100(p => ({ ...p, amount: v })) },
    { id: 'rnv', label: 'RNV - Régularisation Non Valide', ...tarifBordRnv, onCountChange: (v: number) => setTarifBordRnv(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordRnv(p => ({ ...p, amount: v })) },
    { id: 'titreTiers', label: 'Titre tiers - Vente pour compte tiers', ...tarifBordTitreTiers, onCountChange: (v: number) => setTarifBordTitreTiers(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordTitreTiers(p => ({ ...p, amount: v })) },
    { id: 'docNaissance', label: 'Document de naissance', ...tarifBordDocNaissance, onCountChange: (v: number) => setTarifBordDocNaissance(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordDocNaissance(p => ({ ...p, amount: v })) },
    { id: 'autre', label: 'Autre tarification', ...tarifBordAutre, onCountChange: (v: number) => setTarifBordAutre(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTarifBordAutre(p => ({ ...p, amount: v })) },
  ];

  const tarifsControleItems = [
    { id: 'ctrl-stt50', label: 'STT 50%', ...stt50, onCountChange: (v: number) => setStt50(p => ({ ...p, count: v })), onAmountChange: (v: number) => setStt50(p => ({ ...p, amount: v })) },
    { id: 'ctrl-stt100', label: 'STT 100%', ...stt100, onCountChange: (v: number) => setStt100(p => ({ ...p, count: v })), onAmountChange: (v: number) => setStt100(p => ({ ...p, amount: v })) },
    { id: 'ctrl-rnv', label: 'RNV', ...rnv, onCountChange: (v: number) => setRnv(p => ({ ...p, count: v })), onAmountChange: (v: number) => setRnv(p => ({ ...p, amount: v })) },
    { id: 'ctrl-titreTiers', label: 'Titre tiers', ...titreTiers, onCountChange: (v: number) => setTitreTiers(p => ({ ...p, count: v })), onAmountChange: (v: number) => setTitreTiers(p => ({ ...p, amount: v })) },
    { id: 'ctrl-docNaissance', label: 'Document de naissance', ...docNaissance, onCountChange: (v: number) => setDocNaissance(p => ({ ...p, count: v })), onAmountChange: (v: number) => setDocNaissance(p => ({ ...p, amount: v })) },
    { id: 'ctrl-autre', label: 'Autre', ...autreTarif, onCountChange: (v: number) => setAutreTarif(p => ({ ...p, count: v })), onAmountChange: (v: number) => setAutreTarif(p => ({ ...p, amount: v })) },
  ];

  const pvItems = [
    { id: 'pv-absence', label: 'Absence de titre', ...pvAbsenceTitre, onCountChange: (v: number) => setPvAbsenceTitre(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvAbsenceTitre(p => ({ ...p, amount: v })) },
    { id: 'pv-invalide', label: 'Titre non valide', ...pvTitreInvalide, onCountChange: (v: number) => setPvTitreInvalide(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvTitreInvalide(p => ({ ...p, amount: v })) },
    { id: 'pv-refus', label: 'Refus de contrôle', ...pvRefusControle, onCountChange: (v: number) => setPvRefusControle(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvRefusControle(p => ({ ...p, amount: v })) },
    { id: 'pv-autre', label: 'Autre motif', ...pvAutre, onCountChange: (v: number) => setPvAutre(p => ({ ...p, count: v })), onAmountChange: (v: number) => setPvAutre(p => ({ ...p, amount: v })) },
  ];


  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => isEditMode ? handleCancelEdit() : navigate(-1)}>
              {isEditMode ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">
                {isEditMode ? 'Modifier le contrôle' : 'Contrôle en gare'}
              </h1>
              {isEditMode && <Badge variant="secondary">Mode édition</Badge>}
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

        {/* Fraud Summary - Sticky */}
        <div className="sticky top-16 z-30">
          <FraudSummary
            passengers={nbPassagers}
            fraudCount={fraudStats.fraudCount}
            fraudRate={fraudStats.fraudRate}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Station Info */}
          <Card className="bg-card-cyan text-card-cyan-foreground border-card-cyan">
            <CardHeader>
              <CardTitle className="text-base">Informations gare</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
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
                  {GARES_PRINCIPALES.map((gare) => (
                    <option key={gare} value={gare} />
                  ))}
                </datalist>
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
          <Card className="bg-card-mint text-card-mint-foreground border-card-mint">
            <CardHeader>
              <CardTitle className="text-base">Voyageurs</CardTitle>
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
          <Card className="bg-card-violet text-card-violet-foreground border-card-violet">
            <CardHeader>
              <CardTitle className="text-base">Relevés d'Identité (RI)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="riPositive" className="text-green-600">RI Positive</Label>
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
                  <Label htmlFor="riNegative" className="text-red-600">RI Négative</Label>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commentaire</CardTitle>
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
      </div>
    </AppLayout>
  );
}
