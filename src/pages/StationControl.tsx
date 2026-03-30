import { useState, useMemo, useEffect, useCallback } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useControls } from '@/hooks/useControls';
import { useLastSync } from '@/hooks/useLastSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOfflineControls } from '@/hooks/useOfflineControls';
import { useParisTime } from '@/hooks/useParisTime';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { TarifTypeToggle } from '@/components/controls/TarifTypeToggle';
import { TarifListItem, TarifEntry } from '@/components/controls/TarifListItem';
import { CounterInput } from '@/components/controls/CounterInput';
import { EmbarkmentControl } from '@/components/controls/EmbarkmentControl';
import { FraudSummary } from '@/components/controls/FraudSummary';
import { SubmitProgress } from '@/components/controls/SubmitProgress';
import { TrainLookupButton } from '@/components/controls/TrainLookupButton';
import { StationAutocomplete } from '@/components/controls/StationAutocomplete';
import { BigPassengerCounterDialog } from '@/components/controls/BigPassengerCounterDialog';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Loader2, Building2, ArrowLeft, Save, ArrowRight, X, Clock, Calendar,
  ArrowDownToLine, ArrowUpFromLine, Users, UserCheck, MessageSquare,
  FileText, AlertTriangle, Plus, Ticket, Train, Share2, Copy, Mail,
  Link2, ChevronDown, Layers, LayoutList, Search,
} from 'lucide-react';
import type { TrainInfo } from '@/hooks/useTrainLookup';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const TARIF_TYPES = [
  { value: 'stt',         label: 'STT' },
  { value: 'rnv',         label: 'RNV' },
  { value: 'titre_tiers', label: 'Titre tiers' },
  { value: 'd_naissance', label: 'D. naissance' },
  { value: 'autre',       label: 'Autre' },
];

const PV_TYPES = [
  { value: 'pv_stt100',        label: 'STT' },
  { value: 'pv_rnv',           label: 'RNV' },
  { value: 'pv_titre_tiers',   label: 'Titre tiers' },
  { value: 'pv_doc_naissance', label: 'D. naissance' },
  { value: 'pv_autre',         label: 'Autre' },
];

type ControlMode   = 'disembarkment' | 'embarkment';
type ActiveSection = 'info' | 'voyageurs' | 'infractions' | 'ri' | 'notes';

// ── FormState ─────────────────────────────────────────────────────────────────

interface FormState {
  stationName: string;
  platformNumber: string;
  origin: string;
  destination: string;
  trainNumber: string;
  controlDate: string;
  controlTime: string;
  departureTime: string;
  nbPassagers: number;
  stt50Count: number;
  stt100Count: number;
  tarifsControle: TarifEntry[];
  pvList: TarifEntry[];
  riPositive: number;
  riNegative: number;
  notes: string;
  isCancelled: boolean;
  isOvercrowded: boolean;
  isPoliceOnBoard: boolean;
  isSugeOnBoard: boolean;
  autreControleComment: string;
  autrePvComment: string;
  quickTrains: string[];
}

function makeInitialFormState(): FormState {
  const now  = new Date();
  const pad  = (n: number) => String(n).padStart(2, '0');
  return {
    stationName: '', platformNumber: '', origin: '', destination: '', trainNumber: '',
    controlDate:   now.toISOString().slice(0, 10),
    controlTime:   `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    departureTime: '',
    nbPassagers: 0, stt50Count: 0, stt100Count: 0,
    tarifsControle: [], pvList: [],
    riPositive: 0, riNegative: 0,
    notes: '', isCancelled: false, isOvercrowded: false,
    isPoliceOnBoard: false, isSugeOnBoard: false,
    autreControleComment: '', autrePvComment: '',
    quickTrains: [],
  };
}

const INITIAL_FORM_STATE = makeInitialFormState();

// ── SectionCard (extended mode wrapper) ───────────────────────────────────────

function SectionCard({ title, icon: Icon, gradient, iconBg, iconColor, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${gradient}`} />
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${iconBg}`}>
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ── SectionHeader (extended mode title) ───────────────────────────────────────

function SectionHeader({ icon: Icon, title, iconBg, iconColor }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b">
      <div className={`p-1.5 rounded-lg ${iconBg}`}>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </div>
      <span className="font-semibold text-sm">{title}</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StationControl() {
  const { user, loading: authLoading } = useAuth();
  const { controls, createControl, updateControl, isCreating, isUpdating, isFetching, refetch } = useControls();
  const navigate      = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formattedLastSync, updateLastSync } = useLastSync();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const { offlineCount, addOfflineControl, syncOfflineControls, isSyncing: isOfflineSyncing } = useOfflineControls();
  const { date: parisDate, time: parisTime } = useParisTime(60000);

  // ── Mode & edit state ──────────────────────────────────────────────────────
  const [controlMode, setControlMode] = useState<ControlMode>(
    searchParams.get('mode') === 'embarkment' ? 'embarkment' : 'disembarkment'
  );
  const editId      = searchParams.get('edit');
  const duplicateId = searchParams.get('duplicate');
  const [isEditMode,      setIsEditMode]      = useState(false);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [activeSection,   setActiveSection]   = useState<ActiveSection>('info');
  const [compactMode,     setCompactMode]     = useState(true);

  // ── Form state (persisted) ─────────────────────────────────────────────────
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const { clearDraft } = useFormPersistence('station-control', formState, setFormState, INITIAL_FORM_STATE);

  // ── UX states (not persisted) ──────────────────────────────────────────────
  const [autoTriggerKey,     setAutoTriggerKey]     = useState(0);
  const [bigCounterOpen,     setBigCounterOpen]     = useState(false);
  const [tarifsOpen,         setTarifsOpen]         = useState(false);
  const [pvOpen,             setPvOpen]             = useState(false);
  const [controleTarifType,  setControleTarifType]  = useState('stt');
  const [controleTarifMontant, setControleTarifMontant] = useState('');
  const [pvTarifType,        setPvTarifType]        = useState('pv_stt100');
  const [pvTarifMontant,     setPvTarifMontant]     = useState('');
  const [quickTrainInput,    setQuickTrainInput]    = useState('');
  const [trainInfoCache,     setTrainInfoCache]     = useState<Record<string, TrainInfo>>({});
  const [expandedQuickTrain, setExpandedQuickTrain] = useState<string | null>(null);
  const [chipAutoTriggerKeys, setChipAutoTriggerKeys] = useState<Record<string, number>>({});
  const [shareGroupOpen,     setShareGroupOpen]     = useState(false);
  const [joinGroupOpen,      setJoinGroupOpen]      = useState(false);
  const [joinInput,          setJoinInput]          = useState('');
  const [copySuccess,        setCopySuccess]        = useState(false);

  // ── Fraud stats ────────────────────────────────────────────────────────────
  const fraudStats = useMemo(() => {
    const tarifsControleCount = formState.stt50Count + formState.tarifsControle.length;
    const pvCount             = formState.stt100Count + formState.pvList.length;
    const fraudCount          = tarifsControleCount + pvCount + formState.riNegative;
    const fraudRate           = formState.nbPassagers > 0 ? (fraudCount / formState.nbPassagers) * 100 : 0;
    return { fraudCount, fraudRate, tarifsControleCount, pvCount };
  }, [formState.nbPassagers, formState.stt50Count, formState.tarifsControle, formState.stt100Count, formState.pvList, formState.riNegative]);

  // ── Auto-update date/time when form is fresh ───────────────────────────────
  useEffect(() => {
    if (!isEditMode && !formState.stationName && formState.nbPassagers === 0) {
      setFormState(p => ({ ...p, controlDate: parisDate, controlTime: parisTime }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parisDate, parisTime, isEditMode]);

  // ── Pre-fill station from URL param ───────────────────────────────────────
  useEffect(() => {
    const stationParam = searchParams.get('station');
    if (stationParam && !editId && !duplicateId) {
      setFormState(p => ({ ...p, stationName: decodeURIComponent(stationParam) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load control for editing / duplicating ─────────────────────────────────
  useEffect(() => {
    const loadControl = async (controlId: string, forDuplicate: boolean) => {
      const found = controls.find(c => c.id === controlId);
      const doLoad = (data: any) => {
        if (data.location_type === 'train') {
          navigate(`/onboard?${forDuplicate ? 'duplicate' : 'edit'}=${controlId}`, { replace: true });
          return;
        }
        if (forDuplicate) { setIsDuplicateMode(true); setSearchParams({}); }
        else              { setIsEditMode(true); }
        loadControlData(data);
      };
      if (found) {
        doLoad(found);
      } else if (user) {
        const { data, error } = await supabase.from('controls').select('*').eq('id', controlId).single();
        if (error || !data) { toast.error('Contrôle non trouvé'); setSearchParams({}); return; }
        doLoad(data);
      }
    };
    if (editId)      loadControl(editId, false);
    else if (duplicateId) loadControl(duplicateId, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, duplicateId, controls, user]);

  const loadControlData = (data: any) => {
    const locationParts = data.location.split(' - Quai ');
    const buildList = (entries: { count: number; type: string; label: string; amount: number; cat: 'controle' | 'pv' }[]): TarifEntry[] =>
      entries.flatMap(({ count, type, label, amount, cat }) => {
        if (count <= 0) return [];
        const perEntry = amount > 0 ? amount / count : 0;
        return Array.from({ length: count }, () => ({ id: crypto.randomUUID(), type, typeLabel: label, montant: perEntry, category: cat }));
      });

    setFormState({
      stationName:    locationParts[0] || '',
      platformNumber: locationParts[1] || data.platform_number || '',
      origin:         data.origin || '',
      destination:    data.destination || '',
      trainNumber:    data.train_number || '',
      controlDate:    data.control_date,
      controlTime:    data.control_time,
      departureTime:  '',
      nbPassagers:    data.nb_passagers || 0,
      stt50Count:     0,
      stt100Count:    data.stt_100 || 0,
      tarifsControle: buildList([
        { count: data.stt_50 || 0,       type: 'stt',         label: 'STT',         amount: Number(data.stt_50_amount) || 0,       cat: 'controle' },
        { count: data.rnv || 0,          type: 'rnv',         label: 'RNV',         amount: Number(data.rnv_amount) || 0,          cat: 'controle' },
        { count: data.titre_tiers || 0,  type: 'titre_tiers', label: 'Titre tiers', amount: Number(data.titre_tiers_amount) || 0,  cat: 'controle' },
        { count: data.doc_naissance || 0,type: 'd_naissance', label: 'D. naissance',amount: Number(data.doc_naissance_amount) || 0,cat: 'controle' },
        { count: data.autre_tarif || 0,  type: 'autre',       label: 'Autre',       amount: Number(data.autre_tarif_amount) || 0,  cat: 'controle' },
      ]),
      pvList: buildList([
        { count: data.pv_stt100 || 0,       type: 'pv_stt100',       label: 'STT',         amount: Number(data.pv_stt100_amount) || 0,       cat: 'pv' },
        { count: data.pv_rnv || 0,          type: 'pv_rnv',          label: 'RNV',         amount: Number(data.pv_rnv_amount) || 0,          cat: 'pv' },
        { count: data.pv_titre_tiers || 0,  type: 'pv_titre_tiers',  label: 'Titre tiers', amount: Number(data.pv_titre_tiers_amount) || 0,  cat: 'pv' },
        { count: data.pv_doc_naissance || 0,type: 'pv_doc_naissance',label: 'D. naissance',amount: Number(data.pv_doc_naissance_amount) || 0,cat: 'pv' },
        { count: data.pv_autre || 0,        type: 'pv_autre',        label: 'Autre',       amount: Number(data.pv_autre_amount) || 0,        cat: 'pv' },
      ]),
      riPositive:    data.ri_positive || 0,
      riNegative:    data.ri_negative || 0,
      notes:         data.notes || '',
      isCancelled:     data.is_cancelled     ?? false,
      isOvercrowded:   data.is_overcrowded   ?? false,
      isPoliceOnBoard: (data as any).is_police_on_board ?? false,
      isSugeOnBoard:   (data as any).is_suge_on_board   ?? false,
      autreControleComment: '',
      autrePvComment:       '',
      quickTrains:          formState.quickTrains,
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setIsDuplicateMode(false);
    setSearchParams({});
    clearDraft();
  };

  // ── Tarif handlers ─────────────────────────────────────────────────────────
  const addTarifControle = useCallback(() => {
    const montant = parseFloat(controleTarifMontant);
    if (!montant || montant <= 0) return;
    const typeLabel = TARIF_TYPES.find(t => t.value === controleTarifType)?.label || controleTarifType;
    setFormState(p => ({ ...p, tarifsControle: [...p.tarifsControle, { id: crypto.randomUUID(), type: controleTarifType, typeLabel, montant, category: 'controle' }] }));
    setControleTarifMontant('');
  }, [controleTarifType, controleTarifMontant]);

  const removeTarifControle = (id: string) =>
    setFormState(p => ({ ...p, tarifsControle: p.tarifsControle.filter(t => t.id !== id) }));

  const addPv = useCallback(() => {
    const montant = parseFloat(pvTarifMontant);
    if (!montant || montant <= 0) return;
    const typeLabel = PV_TYPES.find(t => t.value === pvTarifType)?.label || pvTarifType;
    setFormState(p => ({ ...p, pvList: [...p.pvList, { id: crypto.randomUUID(), type: pvTarifType, typeLabel, montant, category: 'pv' }] }));
    setPvTarifMontant('');
  }, [pvTarifType, pvTarifMontant]);

  const removePv = (id: string) =>
    setFormState(p => ({ ...p, pvList: p.pvList.filter(t => t.id !== id) }));

  const handleSync = useCallback(async () => {
    await refetch();
    updateLastSync();
    toast.success('Données synchronisées');
  }, [refetch, updateLastSync]);

  // Mémoïsé pour éviter de re-déclencher le useEffect de chargement dans EmbarkmentControl
  const handleEmbarkmentStationChange = useCallback(
    (v: string) => setFormState(p => ({ ...p, stationName: v })),
    []
  );

  // ── Early returns ──────────────────────────────────────────────────────────
  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user)       return <Navigate to="/auth" replace />;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.stationName.trim()) { toast.error('Veuillez sélectionner une gare'); return; }

    const locationName = formState.platformNumber
      ? `${formState.stationName} - Quai ${formState.platformNumber}`
      : formState.stationName;

    const tc  = formState.tarifsControle;
    const pv  = formState.pvList;
    const sum = (arr: TarifEntry[]) => arr.reduce((s, t) => s + t.montant, 0);

    const notesParts: string[] = [];
    if (formState.departureTime.trim())        notesParts.push(`[Arr. gare: ${formState.departureTime.trim()}]`);
    if (formState.autreControleComment.trim()) notesParts.push(`[Tarif Autre] ${formState.autreControleComment.trim()}`);
    if (formState.autrePvComment.trim())       notesParts.push(`[PV Autre] ${formState.autrePvComment.trim()}`);
    if (formState.notes.trim())                notesParts.push(formState.notes.trim());

    const controlData = {
      location_type:  'gare' as const,
      location:        locationName,
      train_number:    formState.trainNumber.trim()  || null,
      origin:          formState.origin.trim()       || null,
      destination:     formState.destination.trim()  || null,
      platform_number: formState.platformNumber.trim() || null,
      control_date:    formState.controlDate,
      control_time:    formState.controlTime,
      nb_passagers:    formState.nbPassagers,
      nb_en_regle:     Math.max(0, formState.nbPassagers - fraudStats.fraudCount),
      tarifs_controle: fraudStats.tarifsControleCount,
      pv:              fraudStats.pvCount,
      stt_50:          formState.stt50Count + tc.filter(t => t.type === 'stt').length,
      stt_50_amount:   sum(tc.filter(t => t.type === 'stt'))             || null,
      stt_100:         formState.stt100Count,
      stt_100_amount:  sum(pv.filter(t => t.type === 'pv_stt100'))       || null,
      rnv:             tc.filter(t => t.type === 'rnv').length,
      rnv_amount:      sum(tc.filter(t => t.type === 'rnv'))             || null,
      titre_tiers:     tc.filter(t => t.type === 'titre_tiers').length,
      titre_tiers_amount: sum(tc.filter(t => t.type === 'titre_tiers')) || null,
      doc_naissance:   tc.filter(t => t.type === 'd_naissance').length,
      doc_naissance_amount: sum(tc.filter(t => t.type === 'd_naissance')) || null,
      autre_tarif:     tc.filter(t => t.type === 'autre').length,
      autre_tarif_amount: sum(tc.filter(t => t.type === 'autre'))       || null,
      pv_stt100:       pv.filter(t => t.type === 'pv_stt100').length,
      pv_stt100_amount: sum(pv.filter(t => t.type === 'pv_stt100'))      || null,
      pv_rnv:          pv.filter(t => t.type === 'pv_rnv').length,
      pv_rnv_amount:   sum(pv.filter(t => t.type === 'pv_rnv'))          || null,
      pv_titre_tiers:  pv.filter(t => t.type === 'pv_titre_tiers').length,
      pv_titre_tiers_amount: sum(pv.filter(t => t.type === 'pv_titre_tiers')) || null,
      pv_doc_naissance: pv.filter(t => t.type === 'pv_doc_naissance').length,
      pv_doc_naissance_amount: sum(pv.filter(t => t.type === 'pv_doc_naissance')) || null,
      pv_autre:        pv.filter(t => t.type === 'pv_autre').length,
      pv_autre_amount: sum(pv.filter(t => t.type === 'pv_autre'))        || null,
      tarif_bord_stt_50: null, tarif_bord_stt_50_amount: null,
      tarif_bord_stt_100: null, tarif_bord_stt_100_amount: null,
      tarif_bord_rnv: null, tarif_bord_rnv_amount: null,
      tarif_bord_titre_tiers: null, tarif_bord_titre_tiers_amount: null,
      tarif_bord_doc_naissance: null, tarif_bord_doc_naissance_amount: null,
      tarif_bord_autre: null, tarif_bord_autre_amount: null,
      ri_positive:      formState.riPositive,
      ri_negative:      formState.riNegative,
      notes:            notesParts.join(' | ') || null,
      is_cancelled:     formState.isCancelled,
      is_overcrowded:   formState.isOvercrowded,
      is_police_on_board: formState.isPoliceOnBoard,
      is_suge_on_board:   formState.isSugeOnBoard,
    };

    try {
      if (isEditMode && editId) {
        await updateControl({ id: editId, ...controlData } as any);
        toast.success('Contrôle modifié');
        setIsEditMode(false);
        setSearchParams({});
      } else {
        if (!isOnline) { addOfflineControl(controlData as any); clearDraft(); setFormState(INITIAL_FORM_STATE); navigate('/'); return; }
        await createControl(controlData as any);
        toast.success('Contrôle enregistré');
      }
      clearDraft();
      setFormState(INITIAL_FORM_STATE);
      navigate('/');
    } catch (error: any) {
      if (!isOnline) { addOfflineControl(controlData as any); clearDraft(); setFormState(INITIAL_FORM_STATE); navigate('/'); return; }
      toast.error('Erreur', { description: error.message || "Impossible d'enregistrer le contrôle" });
    }
  };

  // ── Section nav config ─────────────────────────────────────────────────────
  const SECTIONS = [
    { key: 'info'        as const, icon: Building2,    label: 'Infos',
      inactive: 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:border-cyan-800 dark:text-cyan-400',
      active:   'bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 hover:text-white' },
    { key: 'voyageurs'   as const, icon: Users,         label: 'Voyageurs',
      inactive: 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400',
      active:   'bg-teal-500 border-teal-500 text-white hover:bg-teal-600 hover:text-white' },
    { key: 'infractions' as const, icon: Ticket,        label: 'Infractions',
      inactive: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400',
      active:   'bg-amber-500 border-amber-500 text-white hover:bg-amber-600 hover:text-white' },
    { key: 'ri'          as const, icon: UserCheck,     label: 'RI',
      inactive: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-400',
      active:   'bg-violet-500 border-violet-500 text-white hover:bg-violet-600 hover:text-white' },
    { key: 'notes'       as const, icon: MessageSquare, label: 'Notes',
      inactive: 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400',
      active:   'bg-slate-500 border-slate-500 text-white hover:bg-slate-600 hover:text-white' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0"
              onClick={() => isEditMode ? handleCancelEdit() : navigate(-1)}>
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
            <OfflineIndicator isOnline={isOnline} pendingCount={pendingCount}
              offlineControlsCount={offlineCount} isSyncing={isSyncing || isOfflineSyncing} />
            <LastSyncIndicator lastSync={formattedLastSync} isFetching={isFetching}
              onSync={async () => { await handleSync(); await syncOfflineControls(); }} />
          </div>
        </div>

        {/* Toolbar : mode + vue */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Débarquement / Embarquement */}
          {!isEditMode && (
            <ToggleGroup
              type="single"
              value={controlMode}
              onValueChange={(v) => v && setControlMode(v as ControlMode)}
              className="border rounded-lg p-1 gap-1 bg-muted/30"
            >
              <ToggleGroupItem value="disembarkment" size="sm"
                className="gap-1.5 px-4 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm">
                <ArrowDownToLine className="h-4 w-4" />
                Débarquement
              </ToggleGroupItem>
              <ToggleGroupItem value="embarkment" size="sm"
                className="gap-1.5 px-4 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm">
                <ArrowUpFromLine className="h-4 w-4" />
                Embarquement
              </ToggleGroupItem>
            </ToggleGroup>
          )}
          {/* Compact / Étendu */}
          <ToggleGroup
            type="single"
            value={compactMode ? 'compact' : 'extended'}
            onValueChange={(v) => v && setCompactMode(v === 'compact')}
            className="border rounded-md ml-auto"
          >
            <ToggleGroupItem value="extended" size="sm" className="gap-1.5 px-3">
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Étendu</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="compact" size="sm" className="gap-1.5 px-3">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Compact</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* ── Embarquement mode ── */}
        {controlMode === 'embarkment' && !isEditMode ? (
          <div className="max-w-3xl mx-auto w-full">
            <EmbarkmentControl
              stationName={formState.stationName}
              onStationChange={handleEmbarkmentStationChange}
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-4">

            {/* Groupe multi-agents */}
            {!isEditMode && !isDuplicateMode && (
              <Card>
                <div className="p-3 flex items-center gap-2 flex-wrap">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1 min-w-0">Contrôle multi-agents</span>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setJoinGroupOpen(true)}>
                    <Link2 className="h-3.5 w-3.5" />Rejoindre
                  </Button>
                  <Button size="sm"
                    variant={formState.stationName.trim() ? 'default' : 'outline'}
                    className="gap-1.5"
                    disabled={!formState.stationName.trim()}
                    onClick={() => setShareGroupOpen(true)}>
                    <Share2 className="h-3.5 w-3.5" />Partager
                  </Button>
                </div>
              </Card>
            )}

            {/* Fraud Summary sticky */}
            <div className="sticky top-16 z-30">
              <FraudSummary
                passengers={formState.nbPassagers}
                fraudCount={fraudStats.fraudCount}
                fraudRate={fraudStats.fraudRate}
              />
            </div>

            {/* ── Card sections ── */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-cyan-400 via-teal-400 to-violet-500" />
              {compactMode && (
                <CardHeader className="pb-3">
                  {/* Section nav */}
                  <div className="flex flex-wrap gap-1.5">
                    {SECTIONS.map(({ key, icon: Icon, label, inactive, active }) => (
                      <Button key={key} type="button" variant="outline" size="sm"
                        className={cn('gap-1 text-xs border transition-colors', activeSection === key ? active : inactive)}
                        onClick={() => setActiveSection(key)}>
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                        {/* Badges sur les sections ayant des données */}
                        {key === 'infractions' && (fraudStats.tarifsControleCount + fraudStats.pvCount) > 0 && (
                          <span className="ml-0.5 bg-white/30 text-inherit rounded-full px-1 text-[10px] font-bold">
                            {fraudStats.tarifsControleCount + fraudStats.pvCount}
                          </span>
                        )}
                        {key === 'voyageurs' && formState.nbPassagers > 0 && (
                          <span className="ml-0.5 bg-white/30 text-inherit rounded-full px-1 text-[10px] font-bold">
                            {formState.nbPassagers}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
              )}

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* ══ SECTION INFOS ══════════════════════════════════════════ */}
                  {(!compactMode || activeSection === 'info') && (
                    <>
                    {!compactMode && (
                      <SectionHeader icon={Building2} title="Infos du contrôle"
                        iconBg="bg-cyan-100 dark:bg-cyan-900/30"
                        iconColor="text-cyan-700 dark:text-cyan-400" />
                    )}
                    <div className="space-y-4">

                      {/* Gare */}
                      <div className="space-y-1.5">
                        <Label>Gare *</Label>
                        <StationAutocomplete
                          value={formState.stationName}
                          onChange={(v) => setFormState(p => ({ ...p, stationName: v }))}
                          placeholder="Rechercher une gare..."
                        />
                      </div>

                      {/* Date + Heure */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" />Date</Label>
                          <Input type="date" value={formState.controlDate}
                            onChange={(e) => setFormState(p => ({ ...p, controlDate: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1"><Clock className="h-3 w-3" />Heure</Label>
                          <Input type="time" value={formState.controlTime}
                            onChange={(e) => setFormState(p => ({ ...p, controlTime: e.target.value }))} />
                        </div>
                      </div>

                      {/* Trains rapides du service */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Train className="h-3.5 w-3.5 text-muted-foreground" />
                          Trains du service
                          <span className="text-xs text-muted-foreground font-normal">(cliquer pour sélectionner)</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ex: 88521, 88524, 837311"
                            value={quickTrainInput}
                            onChange={(e) => setQuickTrainInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const nums = quickTrainInput.split(/[\s,;]+/).map(s => s.replace(/\D/g, '')).filter(Boolean);
                                if (nums.length === 0) return;
                                setFormState(p => ({
                                  ...p,
                                  quickTrains: [...p.quickTrains, ...nums.filter(n => !p.quickTrains.includes(n))],
                                }));
                                setQuickTrainInput('');
                              }
                            }}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 shrink-0"
                            disabled={!quickTrainInput.trim()}
                            onClick={() => {
                              const nums = quickTrainInput.split(/[\s,;]+/).map(s => s.replace(/\D/g, '')).filter(Boolean);
                              if (nums.length === 0) return;
                              setFormState(p => ({
                                ...p,
                                quickTrains: [...p.quickTrains, ...nums.filter(n => !p.quickTrains.includes(n))],
                              }));
                              setQuickTrainInput('');
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {formState.quickTrains.length > 0 && (
                          <div className="space-y-1.5">
                            {formState.quickTrains.map((num) => {
                              const cached = trainInfoCache[num];
                              const isSelected = formState.trainNumber === num;
                              const isExpanded = expandedQuickTrain === num;
                              const depAtStation = cached ? (() => {
                                const stLower = formState.stationName.toLowerCase();
                                const stop = cached.stops.find(s =>
                                  s.name.toLowerCase().includes(stLower) ||
                                  stLower.includes(s.name.toLowerCase())
                                );
                                return stop?.arrivalTime || stop?.departureTime || null;
                              })() : null;
                              return (
                                <div key={num} className={cn('rounded-lg border overflow-hidden transition-colors', isSelected ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/20')}>
                                  <div className="flex items-center gap-2 px-3 py-2">
                                    {/* Chip sélection */}
                                    <button
                                      type="button"
                                      className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                                      onClick={() => {
                                        setFormState(p => {
                                          const c = trainInfoCache[num];
                                          const stLower = p.stationName.toLowerCase();
                                          const stop = c?.stops.find(s =>
                                            s.name.toLowerCase().includes(stLower) ||
                                            stLower.includes(s.name.toLowerCase())
                                          );
                                          const dep = stop?.arrivalTime || stop?.departureTime;
                                          return {
                                            ...p,
                                            trainNumber: num,
                                            ...(c ? { origin: c.origin || p.origin, destination: c.destination || p.destination } : {}),
                                            ...(dep ? { departureTime: dep } : {}),
                                          };
                                        });
                                        // Si pas encore en cache → expand + auto-lookup pour remplir l'heure d'arrivée
                                        if (!trainInfoCache[num]) {
                                          setExpandedQuickTrain(num);
                                          setChipAutoTriggerKeys(k => ({ ...k, [num]: (k[num] || 0) + 1 }));
                                        }
                                      }}
                                    >
                                      <Train className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                                      <span className={cn('text-sm font-semibold tabular-nums', isSelected ? 'text-primary' : '')}>{num}</span>
                                      {depAtStation && (
                                        <span className="text-xs text-muted-foreground ml-1">· {depAtStation}</span>
                                      )}
                                      {cached?.trainType && (
                                        <span className="text-[10px] text-muted-foreground ml-0.5">({cached.trainType})</span>
                                      )}
                                    </button>
                                    {/* Info / Schéma */}
                                    <button
                                      type="button"
                                      title="Info SNCF + Schéma"
                                      className={cn('p-1.5 rounded transition-colors', isExpanded ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (expandedQuickTrain === num) {
                                          setExpandedQuickTrain(null);
                                        } else {
                                          setExpandedQuickTrain(num);
                                          if (!trainInfoCache[num]) {
                                            setChipAutoTriggerKeys(k => ({ ...k, [num]: (k[num] || 0) + 1 }));
                                          }
                                        }
                                      }}
                                    >
                                      <Search className="h-3.5 w-3.5" />
                                    </button>
                                    {/* Retirer */}
                                    <button
                                      type="button"
                                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFormState(p => ({ ...p, quickTrains: p.quickTrains.filter(t => t !== num) }));
                                        if (expandedQuickTrain === num) setExpandedQuickTrain(null);
                                      }}
                                      aria-label={`Retirer ${num}`}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  {/* Panel Info SNCF + Schéma inline */}
                                  {isExpanded && (
                                    <div className="px-3 pb-3 pt-2 border-t bg-background/60">
                                      <TrainLookupButton
                                        trainNumber={num}
                                        date={formState.controlDate}
                                        autoTriggerKey={chipAutoTriggerKeys[num] || 0}
                                        selectedOrigin={formState.stationName}
                                        onResult={(info) => {
                                          setTrainInfoCache(prev => ({ ...prev, [num]: info }));
                                          if (formState.trainNumber === num || !formState.trainNumber) {
                                            setFormState(p => {
                                              const stLower = p.stationName.toLowerCase();
                                              const stop = info.stops.find(s =>
                                                s.name.toLowerCase().includes(stLower) ||
                                                stLower.includes(s.name.toLowerCase())
                                              );
                                              const dep = stop?.arrivalTime || stop?.departureTime;
                                              return {
                                                ...p,
                                                trainNumber: num,
                                                origin:      info.origin      || p.origin,
                                                destination: info.destination || p.destination,
                                                ...(dep ? { departureTime: dep } : {}),
                                                ...(info.stops[0]?.platform ? { platformNumber: info.stops[0].platform } : {}),
                                              };
                                            });
                                          }
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* N° Train + Quai */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>N° Train</Label>
                          <div className="flex flex-col gap-1">
                            <Input
                              placeholder="Ex: 6231"
                              value={formState.trainNumber}
                              onChange={(e) => setFormState(p => ({ ...p, trainNumber: e.target.value }))}
                              inputMode="numeric"
                            />
                            <TrainLookupButton
                              trainNumber={formState.trainNumber}
                              date={formState.controlDate}
                              autoTriggerKey={autoTriggerKey}
                              selectedOrigin={formState.origin}
                              onResult={(info) => {
                                setFormState(p => {
                                  // Chercher l'arrêt correspondant à la gare contrôlée
                                  const stationLower = p.stationName.toLowerCase();
                                  const matchingStop = info.stops.find(s =>
                                    s.name.toLowerCase().includes(stationLower) ||
                                    stationLower.includes(s.name.toLowerCase())
                                  );
                                  const arrivalAtStation = matchingStop?.arrivalTime || matchingStop?.departureTime;
                                  return {
                                    ...p,
                                    origin:      info.origin      || p.origin,
                                    destination: info.destination || p.destination,
                                    ...(info.departureTime  ? { controlTime:     info.departureTime }  : {}),
                                    ...(arrivalAtStation    ? { departureTime:   arrivalAtStation }     : {}),
                                    ...(info.stops[0]?.platform ? { platformNumber: info.stops[0].platform } : {}),
                                  };
                                });
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Quai</Label>
                          <Input
                            placeholder="1A"
                            value={formState.platformNumber}
                            onChange={(e) => setFormState(p => ({ ...p, platformNumber: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Origine → Destination */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                        <div className="space-y-1.5">
                          <Label>Origine</Label>
                          <Input placeholder="Paris" value={formState.origin}
                            onChange={(e) => setFormState(p => ({ ...p, origin: e.target.value }))} />
                        </div>
                        <div className="pb-2"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                        <div className="space-y-1.5">
                          <Label>Destination</Label>
                          <Input placeholder="Lyon" value={formState.destination}
                            onChange={(e) => setFormState(p => ({ ...p, destination: e.target.value }))} />
                        </div>
                      </div>

                      {/* Heure d'arrivée en gare */}
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1"><Clock className="h-3 w-3" />Heure d'arrivée en gare</Label>
                        <Input type="time" value={formState.departureTime}
                          onChange={(e) => setFormState(p => ({ ...p, departureTime: e.target.value }))} />
                      </div>

                      {/* Checkboxes */}
                      <div className="flex items-center gap-4 flex-wrap pt-1">
                        {[
                          { key: 'isCancelled',     label: 'Train supprimé' },
                          { key: 'isPoliceOnBoard', label: 'Police présente' },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <Checkbox
                              checked={formState[key as keyof FormState] as boolean}
                              onCheckedChange={(v) => setFormState(p => ({ ...p, [key]: !!v }))}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    </>
                  )}

                  {!compactMode && <div className="border-t my-1" />}

                  {/* ══ SECTION VOYAGEURS ══════════════════════════════════════ */}
                  {(!compactMode || activeSection === 'voyageurs') && (
                    <>
                    {!compactMode && (
                      <SectionHeader icon={Users} title="Voyageurs"
                        iconBg="bg-teal-100 dark:bg-teal-900/30"
                        iconColor="text-teal-700 dark:text-teal-400" />
                    )}
                    <div className="flex justify-center py-4">
                      <div className="relative">
                        <CounterInput
                          label="Nombre contrôlés"
                          value={formState.nbPassagers}
                          onChange={(v) => setFormState(p => ({ ...p, nbPassagers: v }))}
                          min={0} max={9999} steps={[1, 10]}
                        />
                        <button
                          type="button"
                          title="Grand compteur"
                          className="absolute -top-1 -right-10 p-2 rounded-full bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-400 transition-colors"
                          onClick={() => setBigCounterOpen(true)}
                        >
                          <Users className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    </>
                  )}

                  {!compactMode && <div className="border-t my-1" />}

                  {/* ══ SECTION INFRACTIONS ════════════════════════════════════ */}
                  {(!compactMode || activeSection === 'infractions') && (
                    <>
                    {!compactMode && (
                      <SectionHeader icon={Ticket} title="Infractions"
                        iconBg="bg-amber-100 dark:bg-amber-900/30"
                        iconColor="text-amber-700 dark:text-amber-400" />
                    )}
                    <div className="space-y-4">
                      {/* Quick counters */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <CounterInput label="STT 50€" sublabel="Tarif contrôle"
                            value={formState.stt50Count}
                            onChange={(v) => setFormState(p => ({ ...p, stt50Count: v }))}
                            showTotal={{ unitPrice: 50, label: 'Total' }} />
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <CounterInput label="PV 100€" sublabel="Procès-verbal"
                            value={formState.stt100Count}
                            onChange={(v) => setFormState(p => ({ ...p, stt100Count: v }))}
                            showTotal={{ unitPrice: 100, label: 'Total' }} variant="danger" />
                        </div>
                      </div>

                      {/* Détail tarifs contrôle */}
                      <div className="border rounded-lg overflow-hidden">
                        <button type="button"
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors text-left"
                          onClick={() => setTarifsOpen(v => !v)}>
                          <span className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                            <FileText className="h-3.5 w-3.5" />
                            Détail tarifs contrôle
                            {formState.tarifsControle.length > 0 && (
                              <Badge variant="secondary" className="text-xs py-0 h-4">{formState.tarifsControle.length}</Badge>
                            )}
                          </span>
                          <ChevronDown className={cn('h-4 w-4 text-amber-600 transition-transform', tarifsOpen && 'rotate-180')} />
                        </button>
                        {tarifsOpen && (
                          <div className="p-4 space-y-3 border-t">
                            <TarifTypeToggle types={TARIF_TYPES} value={controleTarifType} onChange={setControleTarifType} />
                            {controleTarifType === 'autre' && (
                              <Input placeholder="Précisez l'infraction..."
                                value={formState.autreControleComment}
                                onChange={(e) => setFormState(p => ({ ...p, autreControleComment: e.target.value }))} />
                            )}
                            <div className="flex gap-2">
                              <Input type="number" min="0" step="0.01" placeholder="Montant (€)"
                                value={controleTarifMontant} onChange={(e) => setControleTarifMontant(e.target.value)}
                                className="flex-1"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTarifControle())} />
                              <Button type="button" onClick={addTarifControle} disabled={!controleTarifMontant}>
                                <Plus className="h-4 w-4 mr-1" />Ajouter
                              </Button>
                            </div>
                            {formState.tarifsControle.length > 0 && (
                              <div className="space-y-2">
                                {formState.tarifsControle.map(t => <TarifListItem key={t.id} item={t} onRemove={removeTarifControle} />)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Détail PV */}
                      <div className="border rounded-lg overflow-hidden">
                        <button type="button"
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors text-left"
                          onClick={() => setPvOpen(v => !v)}>
                          <span className="flex items-center gap-2 text-sm font-medium text-rose-800 dark:text-rose-300">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Détail PV
                            {formState.pvList.length > 0 && (
                              <Badge variant="secondary" className="text-xs py-0 h-4">{formState.pvList.length}</Badge>
                            )}
                          </span>
                          <ChevronDown className={cn('h-4 w-4 text-rose-600 transition-transform', pvOpen && 'rotate-180')} />
                        </button>
                        {pvOpen && (
                          <div className="p-4 space-y-3 border-t">
                            <TarifTypeToggle types={PV_TYPES} value={pvTarifType} onChange={setPvTarifType} />
                            {pvTarifType === 'pv_autre' && (
                              <Input placeholder="Précisez l'infraction..."
                                value={formState.autrePvComment}
                                onChange={(e) => setFormState(p => ({ ...p, autrePvComment: e.target.value }))} />
                            )}
                            <div className="flex gap-2">
                              <Input type="number" min="0" step="0.01" placeholder="Montant (€)"
                                value={pvTarifMontant} onChange={(e) => setPvTarifMontant(e.target.value)}
                                className="flex-1"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPv())} />
                              <Button type="button" onClick={addPv} disabled={!pvTarifMontant} variant="destructive">
                                <Plus className="h-4 w-4 mr-1" />Ajouter
                              </Button>
                            </div>
                            {formState.pvList.length > 0 && (
                              <div className="space-y-2">
                                {formState.pvList.map(t => <TarifListItem key={t.id} item={t} onRemove={removePv} />)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    </>
                  )}

                  {!compactMode && <div className="border-t my-1" />}

                  {/* ══ SECTION RI ═════════════════════════════════════════════ */}
                  {(!compactMode || activeSection === 'ri') && (
                    <>
                    {!compactMode && (
                      <SectionHeader icon={UserCheck} title="Relevé d'Identité"
                        iconBg="bg-violet-100 dark:bg-violet-900/30"
                        iconColor="text-violet-700 dark:text-violet-400" />
                    )}
                    <div className="grid grid-cols-2 gap-4 py-2">
                      <CounterInput label="RI positive" sublabel="Identité vérifiée"
                        value={formState.riPositive}
                        onChange={(v) => setFormState(p => ({ ...p, riPositive: v }))}
                        variant="success" />
                      <CounterInput label="RI négative" sublabel="Identité non vérifiable"
                        value={formState.riNegative}
                        onChange={(v) => setFormState(p => ({ ...p, riNegative: v }))}
                        variant="danger" />
                    </div>
                    </>
                  )}

                  {!compactMode && <div className="border-t my-1" />}

                  {/* ══ SECTION NOTES ══════════════════════════════════════════ */}
                  {(!compactMode || activeSection === 'notes') && (
                    <>
                    {!compactMode && (
                      <SectionHeader icon={MessageSquare} title="Notes"
                        iconBg="bg-slate-100 dark:bg-slate-900/30"
                        iconColor="text-slate-600 dark:text-slate-400" />
                    )}
                    <Textarea
                      placeholder="Remarques, observations..."
                      value={formState.notes}
                      onChange={(e) => setFormState(p => ({ ...p, notes: e.target.value }))}
                      rows={5}
                    />
                    </>
                  )}

                  {/* Save — toujours visible */}
                  <div className="pt-4 border-t">
                    <Button type="submit" className="w-full" size="lg" disabled={isCreating || isUpdating}>
                      {(isCreating || isUpdating) ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? 'Mise à jour...' : 'Enregistrement...'}</>
                      ) : (
                        <><Save className="mr-2 h-4 w-4" />{isEditMode ? 'Mettre à jour' : 'Enregistrer le contrôle'}</>
                      )}
                    </Button>
                  </div>
                  <SubmitProgress isSubmitting={isCreating || isUpdating} />
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── BigPassengerCounterDialog ───────────────────────────────────────── */}
      <BigPassengerCounterDialog
        open={bigCounterOpen}
        onOpenChange={setBigCounterOpen}
        value={formState.nbPassagers}
        onChange={(v) => setFormState(p => ({ ...p, nbPassagers: v }))}
      />

      {/* ── Dialog : Rejoindre un groupe ───────────────────────────────────── */}
      <Dialog open={joinGroupOpen} onOpenChange={setJoinGroupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4" />Rejoindre un groupe</DialogTitle>
            <DialogDescription>Entrez le nom de la gare partagée pour rejoindre le groupe de contrôle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Ex: Metz, Luxembourg…"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && joinInput.trim()) {
                  setFormState(p => ({ ...p, stationName: joinInput.trim() }));
                  setJoinGroupOpen(false); setJoinInput('');
                }
              }}
            />
            <Button className="w-full" disabled={!joinInput.trim()}
              onClick={() => { setFormState(p => ({ ...p, stationName: joinInput.trim() })); setJoinGroupOpen(false); setJoinInput(''); }}>
              Rejoindre
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Partager la session ───────────────────────────────────── */}
      <Dialog open={shareGroupOpen} onOpenChange={setShareGroupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Share2 className="h-4 w-4" />Partager — {formState.stationName}</DialogTitle>
            <DialogDescription>Partagez ce lien pour que d'autres agents rejoignent le contrôle en gare de {formState.stationName}.</DialogDescription>
          </DialogHeader>
          {(() => {
            const shareUrl = `${window.location.origin}/station?station=${encodeURIComponent(formState.stationName)}`;
            const qrSrc    = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
            return (
              <div className="space-y-4 pt-1">
                <div className="flex justify-center">
                  <img src={qrSrc} alt="QR Code" width={180} height={180} className="rounded-lg border" />
                </div>
                <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                  <span className="text-xs text-muted-foreground truncate flex-1">{shareUrl}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => navigator.clipboard.writeText(shareUrl).then(() => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); })}>
                    <Copy className="h-3.5 w-3.5" />{copySuccess ? 'Copié !' : 'Copier'}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => window.open(`sms:?body=${encodeURIComponent(`Rejoins le contrôle en gare de ${formState.stationName} : ${shareUrl}`)}`)}>
                    <MessageSquare className="h-3.5 w-3.5" />SMS
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => window.open(`mailto:?subject=${encodeURIComponent(`Contrôle gare ${formState.stationName}`)}&body=${encodeURIComponent(`Rejoins le contrôle en gare de ${formState.stationName} :\n${shareUrl}`)}`)}>
                    <Mail className="h-3.5 w-3.5" />Email
                  </Button>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <Button variant="outline" size="sm" className="gap-1.5"
                      onClick={() => navigator.share({ title: `Contrôle gare ${formState.stationName}`, url: shareUrl })}>
                      <Share2 className="h-3.5 w-3.5" />Partager
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
