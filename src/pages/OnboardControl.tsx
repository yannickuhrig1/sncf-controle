import { useState, useMemo, useCallback, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useOnboardControls, type OnboardControl as OnboardControlType } from '@/hooks/useOnboardControls';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useLastSync } from '@/hooks/useLastSync';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOfflineControls } from '@/hooks/useOfflineControls';
import { useParisTime } from '@/hooks/useParisTime';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { TarifTypeToggle } from '@/components/controls/TarifTypeToggle';
import { CounterInput } from '@/components/controls/CounterInput';
import { TarifListItem, TarifEntry } from '@/components/controls/TarifListItem';
import { FraudSummary } from '@/components/controls/FraudSummary';
import { StationAutocomplete } from '@/components/controls/StationAutocomplete';
import { ControlDetailDialog } from '@/components/controls/ControlDetailDialog';
import { ExportDialog } from '@/components/controls/ExportDialog';
import { TrainFraudCompact } from '@/components/charts/TrainFraudCompact';
import { SubmitProgress } from '@/components/controls/SubmitProgress';
import { LastSyncIndicator } from '@/components/controls/LastSyncIndicator';
import { OfflineIndicator } from '@/components/controls/OfflineIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
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
  Layers,
  LayoutList,
  Plus,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  ChevronDown,
  X,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Control = Database['public']['Tables']['controls']['Row'];
type SortOption = 'date' | 'fraud_desc' | 'fraud_asc' | 'passengers_desc' | 'passengers_asc';

// Types
const TARIF_TYPES = [
  { value: 'stt', label: 'STT' },
  { value: 'rnv', label: 'RNV' },
  { value: 'titre_tiers', label: 'Titre tiers' },
  { value: 'd_naissance', label: 'D. naissance' },
  { value: 'autre', label: 'Autre' },
];

const PV_TYPES = [
  { value: 'pv_stt100', label: 'STT' },
  { value: 'pv_rnv', label: 'RNV' },
  { value: 'pv_titre_tiers', label: 'Titre tiers' },
  { value: 'pv_doc_naissance', label: 'D. naissance' },
  { value: 'pv_autre', label: 'Autre' },
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
  autreControleComment: string;
  autrePvComment: string;
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
  autreControleComment: '',
  autrePvComment: '',
};

export default function OnboardControl() {
  const { user, loading: authLoading, profile } = useAuth();
  const { preferences } = useUserPreferences();
  const { controls, isLoading, isFetching, refetch, createControl, updateControl, deleteControl, isCreating, isUpdating } =
    useOnboardControls();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [compactMode, setCompactMode] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'stt' | 'controle' | 'pv' | 'bord' | 'ri' | 'notes'>('info');

  // Initial form state using Paris time
  const getInitialFormState = useCallback((): FormState => ({
    trainNumber: '',
    origin: '',
    destination: '',
    controlDate: parisDate,
    controlTime: parisTime,
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
    autreControleComment: '',
    autrePvComment: '',
  }), [parisDate, parisTime]);

  // Form state
  const [formState, setFormState] = useState<FormState>(getInitialFormState);
  const { clearDraft } = useFormPersistence('onboard-control', formState, setFormState, INITIAL_FORM_STATE);
  
  // Auto-update date/time when not in edit mode and form is fresh
  useEffect(() => {
    if (!isEditMode && formState.trainNumber === '' && formState.passengers === 0) {
      setFormState(prev => ({
        ...prev,
        controlDate: parisDate,
        controlTime: parisTime,
      }));
    }
  }, [parisDate, parisTime, isEditMode, formState.trainNumber, formState.passengers]);

  // Tarif input states
  const [bordTarifMontant, setBordTarifMontant] = useState('');
  const [controleTarifType, setControleTarifType] = useState('stt');
  const [controleTarifMontant, setControleTarifMontant] = useState('');
  const [pvTarifType, setPvTarifType] = useState('pv_stt100');
  const [pvTarifMontant, setPvTarifMontant] = useState('');

  // History filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [exportOpen, setExportOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Dialog states
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Load control for editing or duplicating
  useEffect(() => {
    const loadControl = async (controlId: string, forDuplicate: boolean) => {
      if (isLoading) return;
      
      // Helper to reconstruct tarif entries from DB fields
      const reconstructTarifsControle = (data: any): TarifEntry[] => {
        const entries: TarifEntry[] = [];
        const addEntries = (count: number, type: string, typeLabel: string, totalAmount: number) => {
          if (count <= 0) return;
          const amountPerEntry = totalAmount > 0 ? totalAmount / count : 0;
          for (let i = 0; i < count; i++) {
            entries.push({
              id: crypto.randomUUID(),
              type,
              typeLabel,
              montant: amountPerEntry,
              category: 'controle',
            });
          }
        };
        addEntries(data.rnv || 0, 'rnv', 'RNV', data.rnv_amount || 0);
        addEntries(data.titre_tiers || 0, 'titre_tiers', 'Titre tiers', data.titre_tiers_amount || 0);
        addEntries(data.doc_naissance || 0, 'd_naissance', 'D. naissance', data.doc_naissance_amount || 0);
        addEntries(data.autre_tarif || 0, 'autre', 'Autre', data.autre_tarif_amount || 0);
        return entries;
      };

      const reconstructPvList = (data: any): TarifEntry[] => {
        const entries: TarifEntry[] = [];
        const addEntries = (count: number, type: string, typeLabel: string, totalAmount: number) => {
          if (count <= 0) return;
          const amountPerEntry = totalAmount > 0 ? totalAmount / count : 0;
          for (let i = 0; i < count; i++) {
            entries.push({
              id: crypto.randomUUID(),
              type,
              typeLabel,
              montant: amountPerEntry,
              category: 'pv',
            });
          }
        };
        addEntries(data.pv_stt100 || 0, 'pv_stt100', 'STT', data.pv_stt100_amount || 0);
        addEntries(data.pv_rnv || 0, 'pv_rnv', 'RNV', data.pv_rnv_amount || 0);
        addEntries(data.pv_titre_tiers || 0, 'pv_titre_tiers', 'Titre tiers', data.pv_titre_tiers_amount || 0);
        addEntries(data.pv_doc_naissance || 0, 'pv_doc_naissance', 'D. naissance', data.pv_doc_naissance_amount || 0);
        addEntries(data.pv_autre || 0, 'pv_autre', 'Autre', data.pv_autre_amount || 0);
        return entries;
      };

      // Helper to set form data from control
      const setFormFromControl = (data: any) => {
        // Reconstruct tarif lists from DB fields
        const tarifsControle = reconstructTarifsControle(data);
        const pvList = reconstructPvList(data);
        
        // Compute stt100Count from PV total minus pvList entries (pv_stt100 etc. are detailed PV)
        const detailedPvCount = (data.pv_stt100 || 0) + (data.pv_rnv || 0) + 
          (data.pv_titre_tiers || 0) + (data.pv_doc_naissance || 0) + (data.pv_autre || 0);
        const remainingPv = Math.max(0, (data.pv || 0) - detailedPvCount - pvList.length);
        
        setFormState({
          trainNumber: data.train_number || '',
          origin: data.origin || '',
          destination: data.destination || '',
          controlDate: forDuplicate ? parisDate : data.control_date,
          controlTime: forDuplicate ? parisTime : data.control_time,
          passengers: data.nb_passagers,
          tarifsBord: [],
          tarifMode: 'bord',
          tarifsControle,
          stt50Count: data.stt_50 || 0,
          pvList,
          stt100Count: data.stt_100 || 0,
          riPositif: data.ri_positive || 0,
          riNegatif: data.ri_negative || 0,
          commentaire: data.notes || '',
          autreControleComment: '',
          autrePvComment: '',
        });
      };
      
      // First check in already loaded controls
      const controlToLoad = controls.find(c => c.id === controlId);
      
      if (controlToLoad) {
        // If it's not a train control, redirect to station
        if (controlToLoad.location_type !== 'train') {
          const param = forDuplicate ? 'duplicate' : 'edit';
          navigate(`/station?${param}=${controlId}`, { replace: true });
          return;
        }
        
        if (forDuplicate) {
          setIsDuplicateMode(true);
          setSearchParams({});
        } else {
          setIsEditMode(true);
        }
        setFormFromControl(controlToLoad);
      } else if (profile) {
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
        
        // If it's not a train control, redirect to station
        if (data.location_type !== 'train') {
          const param = forDuplicate ? 'duplicate' : 'edit';
          navigate(`/station?${param}=${controlId}`, { replace: true });
          return;
        }
        
        if (forDuplicate) {
          setIsDuplicateMode(true);
          setSearchParams({});
        } else {
          setIsEditMode(true);
        }
        setFormFromControl(data);
      }
    };
    
    if (editId) {
      loadControl(editId, false);
    } else if (duplicateId) {
      loadControl(duplicateId, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, duplicateId, controls, isLoading, profile, navigate, setSearchParams]);

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setSearchParams({});
    setFormState(INITIAL_FORM_STATE);
  };

  // Recent trains for autocomplete
  const recentTrains = useMemo(() => {
    const trains = controls.map((c) => c.train_number).filter(Boolean);
    return [...new Set(trains)].slice(0, 5);
  }, [controls]);

  // Fraud calculation
  const fraudStats = useMemo(() => {
    const tarifsControleCount = formState.tarifsControle.length + formState.stt50Count;
    const pvCount = formState.pvList.length + formState.stt100Count;
    // RI négatifs comptent aussi comme fraude
    const fraudCount = tarifsControleCount + pvCount + formState.riNegatif;
    const fraudRate = formState.passengers > 0 ? (fraudCount / formState.passengers) * 100 : 0;
    return { fraudCount, fraudRate, tarifsControleCount, pvCount };
  }, [formState.tarifsControle, formState.stt50Count, formState.pvList, formState.stt100Count, formState.passengers, formState.riNegatif]);

  // Helper to calculate fraud rate (works with both Control and OnboardControlType)
  const getFraudRate = (control: { tarifs_controle: number; pv: number; nb_passagers: number; ri_negative: number }) => {
    const fraudCount = control.tarifs_controle + control.pv + control.ri_negative;
    return control.nb_passagers > 0 ? (fraudCount / control.nb_passagers) * 100 : 0;
  };

  // Filter and sort history
  const filteredControls = useMemo(() => {
    let result = controls.filter((control) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTrain = control.train_number?.toLowerCase().includes(query);
        const matchesOrigin = control.origin?.toLowerCase().includes(query);
        const matchesDest = control.destination?.toLowerCase().includes(query);
        const matchesLocation = control.location?.toLowerCase().includes(query);
        if (!matchesTrain && !matchesOrigin && !matchesDest && !matchesLocation) return false;
      }
      return true;
    });

    // Sort based on selected option
    switch (sortOption) {
      case 'fraud_desc':
        result = [...result].sort((a, b) => getFraudRate(b) - getFraudRate(a));
        break;
      case 'fraud_asc':
        result = [...result].sort((a, b) => getFraudRate(a) - getFraudRate(b));
        break;
      case 'passengers_desc':
        result = [...result].sort((a, b) => b.nb_passagers - a.nb_passagers);
        break;
      case 'passengers_asc':
        result = [...result].sort((a, b) => a.nb_passagers - b.nb_passagers);
        break;
      case 'date':
      default:
        // Keep original order (by date desc)
        break;
    }

    return result;
  }, [controls, searchQuery, sortOption]);

  // Group controls by date
  const groupedControls = useMemo(() => {
    return filteredControls.reduce((groups, control) => {
      const date = control.control_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(control as Control);
      return groups;
    }, {} as Record<string, Control[]>);
  }, [filteredControls]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedControls).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  }, [groupedControls]);

  const hasActiveFilters = searchQuery.trim() !== '' || sortOption !== 'date';

  const clearFilters = () => {
    setSearchQuery('');
    setSortOption('date');
  };

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
    const typeLabel = PV_TYPES.find((t) => t.value === pvTarifType)?.label || pvTarifType;
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
      toast.error('Erreur', { description: 'Veuillez indiquer le numéro de train' });
      triggerHaptic('error');
      return;
    }

    if (formState.passengers <= 0) {
      toast.error('Erreur', { description: 'Veuillez indiquer le nombre de passagers' });
      triggerHaptic('error');
      return;
    }

    try {
      const locationName =
        formState.origin && formState.destination
          ? `${formState.origin} → ${formState.destination}`
          : formState.trainNumber;

      // Extract detailed fraud counts and amounts from tarifsControle
      const rnvEntries = formState.tarifsControle.filter((t) => t.type === 'rnv');
      const titreTiersEntries = formState.tarifsControle.filter((t) => t.type === 'titre_tiers');
      const docNaissanceEntries = formState.tarifsControle.filter((t) => t.type === 'd_naissance');
      const autreEntries = formState.tarifsControle.filter((t) => t.type === 'autre');
      const sttEntries = formState.tarifsControle.filter((t) => t.type === 'stt');

      // Extract detailed PV counts and amounts from pvList
      const pvStt100Entries = formState.pvList.filter((t) => t.type === 'pv_stt100');
      const pvRnvEntries = formState.pvList.filter((t) => t.type === 'pv_rnv');
      const pvTitreTiersEntries = formState.pvList.filter((t) => t.type === 'pv_titre_tiers');
      const pvDocNaissanceEntries = formState.pvList.filter((t) => t.type === 'pv_doc_naissance');
      const pvAutreEntries = formState.pvList.filter((t) => t.type === 'pv_autre');

      // Extract tarifs bord details
      const bordSttEntries = formState.tarifsBord.filter((t) => t.type === 'stt' || t.category === 'bord');
      const bordRnvEntries = formState.tarifsBord.filter((t) => t.type === 'rnv');
      const bordTitreTiersEntries = formState.tarifsBord.filter((t) => t.type === 'titre_tiers');
      const bordDocNaissanceEntries = formState.tarifsBord.filter((t) => t.type === 'd_naissance');
      const bordAutreEntries = formState.tarifsBord.filter((t) => t.type === 'autre');

      // Build notes with "Autre" comments
      const notesParts: string[] = [];
      if (formState.autreControleComment.trim()) {
        notesParts.push(`[Tarif Autre] ${formState.autreControleComment.trim()}`);
      }
      if (formState.autrePvComment.trim()) {
        notesParts.push(`[PV Autre] ${formState.autrePvComment.trim()}`);
      }
      if (formState.commentaire.trim()) {
        notesParts.push(formState.commentaire.trim());
      }
      const finalNotes = notesParts.length > 0 ? notesParts.join(' | ') : null;

      const controlData = {
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
        stt_50: formState.stt50Count + sttEntries.length,
        stt_50_amount: sttEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        stt_100: formState.stt100Count,
        stt_100_amount: null,
        rnv: rnvEntries.length,
        rnv_amount: rnvEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        titre_tiers: titreTiersEntries.length,
        titre_tiers_amount: titreTiersEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        doc_naissance: docNaissanceEntries.length,
        doc_naissance_amount: docNaissanceEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        autre_tarif: autreEntries.length,
        autre_tarif_amount: autreEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        // PV details
        pv_stt100: pvStt100Entries.length,
        pv_stt100_amount: pvStt100Entries.reduce((sum, t) => sum + t.montant, 0) || null,
        pv_rnv: pvRnvEntries.length,
        pv_rnv_amount: pvRnvEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        pv_titre_tiers: pvTitreTiersEntries.length,
        pv_titre_tiers_amount: pvTitreTiersEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        pv_doc_naissance: pvDocNaissanceEntries.length,
        pv_doc_naissance_amount: pvDocNaissanceEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        pv_autre: pvAutreEntries.length,
        pv_autre_amount: pvAutreEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        // Tarifs bord
        tarif_bord_stt_50: bordSttEntries.filter(t => t.category === 'bord').length || null,
        tarif_bord_stt_50_amount: bordSttEntries.filter(t => t.category === 'bord').reduce((sum, t) => sum + t.montant, 0) || null,
        tarif_bord_stt_100: bordSttEntries.filter(t => t.category === 'exceptionnel').length || null,
        tarif_bord_stt_100_amount: bordSttEntries.filter(t => t.category === 'exceptionnel').reduce((sum, t) => sum + t.montant, 0) || null,
        tarif_bord_rnv: bordRnvEntries.length || null,
        tarif_bord_rnv_amount: bordRnvEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        tarif_bord_titre_tiers: bordTitreTiersEntries.length || null,
        tarif_bord_titre_tiers_amount: bordTitreTiersEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        tarif_bord_doc_naissance: bordDocNaissanceEntries.length || null,
        tarif_bord_doc_naissance_amount: bordDocNaissanceEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        tarif_bord_autre: bordAutreEntries.length || null,
        tarif_bord_autre_amount: bordAutreEntries.reduce((sum, t) => sum + t.montant, 0) || null,
        ri_positive: formState.riPositif,
        ri_negative: formState.riNegatif,
        notes: finalNotes,
      };

      if (isEditMode && editId) {
        await updateControl({ id: editId, data: controlData as any });
        toast.success('Contrôle modifié', { description: 'Le contrôle a été mis à jour avec succès' });
        setIsEditMode(false);
        setSearchParams({});
      } else {
        // Check if offline - save locally
        if (!isOnline) {
          addOfflineControl(controlData as any);
          triggerHaptic('success');
          clearDraft();
          setFormState(INITIAL_FORM_STATE);
          return;
        }
        
        await createControl(controlData as any);
        toast.success('Contrôle enregistré', { description: 'Le contrôle à bord a été ajouté avec succès' });
      }
      
      triggerHaptic('success');
      clearDraft();
      setFormState(INITIAL_FORM_STATE);
    } catch (error: any) {
      // If network error and offline, save locally
      if (!isOnline) {
        const locationName =
          formState.origin && formState.destination
            ? `${formState.origin} → ${formState.destination}`
            : formState.trainNumber;
            
        addOfflineControl({
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
          stt_50: formState.stt50Count + formState.tarifsControle.filter((t) => t.type === 'stt').length,
          stt_50_amount: formState.tarifsControle.filter((t) => t.type === 'stt').reduce((sum, t) => sum + t.montant, 0) || null,
          stt_100: formState.stt100Count,
          rnv: formState.tarifsControle.filter((t) => t.type === 'rnv').length,
          rnv_amount: formState.tarifsControle.filter((t) => t.type === 'rnv').reduce((sum, t) => sum + t.montant, 0) || null,
          titre_tiers: formState.tarifsControle.filter((t) => t.type === 'titre_tiers').length,
          titre_tiers_amount: formState.tarifsControle.filter((t) => t.type === 'titre_tiers').reduce((sum, t) => sum + t.montant, 0) || null,
          doc_naissance: formState.tarifsControle.filter((t) => t.type === 'd_naissance').length,
          doc_naissance_amount: formState.tarifsControle.filter((t) => t.type === 'd_naissance').reduce((sum, t) => sum + t.montant, 0) || null,
          autre_tarif: formState.tarifsControle.filter((t) => t.type === 'autre').length,
          autre_tarif_amount: formState.tarifsControle.filter((t) => t.type === 'autre').reduce((sum, t) => sum + t.montant, 0) || null,
          ri_positive: formState.riPositif,
          ri_negative: formState.riNegatif,
          notes: formState.commentaire.trim() || null,
        } as any);
        triggerHaptic('success');
        clearDraft();
        setFormState(INITIAL_FORM_STATE);
        return;
      }
      
      toast.error('Erreur', { description: error.message || "Impossible d'enregistrer le contrôle" });
      triggerHaptic('error');
    }
  };

  // Reset handler
  const handleReset = () => {
    clearDraft();
    setFormState(INITIAL_FORM_STATE);
    toast.success('Formulaire réinitialisé', { description: 'Toutes les données ont été effacées' });
  };

  // Control click handler
  const handleControlClick = (control: Control) => {
    setSelectedControl(control);
    setDetailOpen(true);
  };

  // Edit handler
  const handleEdit = (control: Control) => {
    navigate(`/onboard?edit=${control.id}`);
  };

  // Delete handler  
  const handleDeleteControl = async (control: Control) => {
    try {
      await deleteControl(control.id);
      toast.success('Contrôle supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
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
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Train className="h-5 w-5 text-primary" />
              {isEditMode ? 'Modifier le contrôle' : 'Contrôle à bord'}
              {isEditMode && <Badge variant="secondary">Mode édition</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? 'Modifiez les données du contrôle sélectionné'
                : 'Saisissez les données du contrôle et consultez l\'historique'
              }
            </p>
          </div>
          <div className="flex gap-2 items-center">
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
                await refetch();
                await syncOfflineControls();
                updateLastSync();
                toast.success('Données synchronisées');
              }}
            />
            {isEditMode && (
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <RotateCcw className="h-4 w-4 mr-2" />
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
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Compact/Extended Toggle */}
        <div className="flex items-center gap-2">
          <ToggleGroup 
            type="single" 
            value={compactMode ? 'compact' : 'extended'}
            onValueChange={(v) => v && setCompactMode(v === 'compact')}
            className="border rounded-md"
          >
            <ToggleGroupItem value="extended" aria-label="Mode étendu" size="sm" className="gap-1.5 px-3">
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Étendu</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="compact" aria-label="Mode compact" size="sm" className="gap-1.5 px-3">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Compact</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Compact Fraud Stats for Train - toggleable from settings */}
        {preferences?.show_onboard_fraud_chart && (
          <TrainFraudCompact 
            controls={controls as Control[]} 
            trainNumber={formState.trainNumber}
          />
        )}

        {/* Fraud Summary - Sticky Banner */}
        <div className="sticky top-16 z-30">
          <FraudSummary
            passengers={formState.passengers}
            fraudCount={fraudStats.fraudCount}
            fraudRate={fraudStats.fraudRate}
            onPassengersChange={(v) => setFormState((p) => ({ ...p, passengers: v }))}
            tarifsControle={formState.tarifsControle}
            pvList={formState.pvList}
            stt50Count={formState.stt50Count}
            stt100Count={formState.stt100Count}
          />
        </div>

        {/* Main Content - 3 Column Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form (2/3 on desktop) */}
          <div className="lg:col-span-2 space-y-4">

            {/* === COMPACT MODE === */}
            {compactMode ? (
              <Card>
                {/* Section navigation buttons */}
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'info' as const, icon: Train, label: 'Info' },
                      { key: 'stt' as const, icon: Ticket, label: 'STT/PV' },
                      { key: 'controle' as const, icon: FileText, label: 'Tarif C.' },
                      { key: 'pv' as const, icon: AlertTriangle, label: 'PV' },
                      { key: 'bord' as const, icon: Ticket, label: 'Bord' },
                      { key: 'ri' as const, icon: User, label: 'RI' },
                      { key: 'notes' as const, icon: MessageSquare, label: 'Notes' },
                    ].map(({ key, icon: SectionIcon, label }) => (
                      <Button
                        key={key}
                        type="button"
                        variant={activeSection === key ? 'default' : 'outline'}
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => setActiveSection(key)}
                      >
                        <SectionIcon className="h-3.5 w-3.5" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Info Section */}
                  {activeSection === 'info' && (
                    <>
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
                          <StationAutocomplete id="origin" placeholder="Gare de départ" value={formState.origin} onChange={(v) => setFormState((p) => ({ ...p, origin: v }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="destination">Destination</Label>
                          <StationAutocomplete id="destination" placeholder="Gare d'arrivée" value={formState.destination} onChange={(v) => setFormState((p) => ({ ...p, destination: v }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="controlDate">Date</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="controlDate" type="date" className="pl-10" value={formState.controlDate} onChange={(e) => setFormState((p) => ({ ...p, controlDate: e.target.value }))} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="controlTime">Heure</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="controlTime" type="time" className="pl-10" value={formState.controlTime} onChange={(e) => setFormState((p) => ({ ...p, controlTime: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                      <CounterInput label="Nombre de passagers *" value={formState.passengers} onChange={(v) => setFormState((p) => ({ ...p, passengers: v }))} min={0} max={9999} steps={[1, 10]} />
                    </>
                  )}

                  {/* STT Section */}
                  {activeSection === 'stt' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <CounterInput label="STT 50€" sublabel="Tarif contrôle" value={formState.stt50Count} onChange={(v) => setFormState((p) => ({ ...p, stt50Count: v }))} showTotal={{ unitPrice: 50, label: 'Total' }} />
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <CounterInput label="PV 100€" sublabel="Procès-verbal" value={formState.stt100Count} onChange={(v) => setFormState((p) => ({ ...p, stt100Count: v }))} showTotal={{ unitPrice: 100, label: 'Total' }} variant="danger" />
                      </div>
                    </div>
                  )}

                  {/* Tarif Contrôle Section */}
                  {activeSection === 'controle' && (
                    <>
                      <TarifTypeToggle types={TARIF_TYPES} value={controleTarifType} onChange={setControleTarifType} />
                      {controleTarifType === 'autre' && (
                        <Input placeholder="Précisez l'infraction..." value={formState.autreControleComment} onChange={(e) => setFormState((p) => ({ ...p, autreControleComment: e.target.value }))} />
                      )}
                      <div className="flex gap-2">
                        <Input type="number" min="0" step="0.01" placeholder="Montant (€)" value={controleTarifMontant} onChange={(e) => setControleTarifMontant(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTarifControle())} />
                        <Button type="button" onClick={addTarifControle} disabled={!controleTarifMontant}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
                      </div>
                      {formState.tarifsControle.length > 0 && (
                        <div className="space-y-2">
                          {formState.tarifsControle.map((t) => (<TarifListItem key={t.id} item={t} onRemove={removeTarifControle} />))}
                        </div>
                      )}
                    </>
                  )}

                  {/* PV Section */}
                  {activeSection === 'pv' && (
                    <>
                       <TarifTypeToggle types={PV_TYPES} value={pvTarifType} onChange={setPvTarifType} />
                      {pvTarifType === 'pv_autre' && (
                        <Input placeholder="Précisez l'infraction..." value={formState.autrePvComment} onChange={(e) => setFormState((p) => ({ ...p, autrePvComment: e.target.value }))} />
                      )}
                      <div className="flex gap-2">
                        <Input type="number" min="0" step="0.01" placeholder="Montant (€)" value={pvTarifMontant} onChange={(e) => setPvTarifMontant(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPv())} />
                        <Button type="button" onClick={addPv} disabled={!pvTarifMontant} variant="destructive"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
                      </div>
                      {formState.pvList.length > 0 && (
                        <div className="space-y-2">
                          {formState.pvList.map((t) => (<TarifListItem key={t.id} item={t} onRemove={removePv} />))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Bord Section */}
                  {activeSection === 'bord' && (
                    <>
                      <div className="flex gap-2">
                        <Button type="button" variant={formState.tarifMode === 'bord' ? 'default' : 'outline'} size="sm" onClick={() => setFormState((p) => ({ ...p, tarifMode: 'bord' }))}>Bord</Button>
                        <Button type="button" variant={formState.tarifMode === 'exceptionnel' ? 'default' : 'outline'} size="sm" onClick={() => setFormState((p) => ({ ...p, tarifMode: 'exceptionnel' }))}>Exceptionnel</Button>
                      </div>
                      <div className="flex gap-2">
                        <Input type="number" min="0" step="0.01" placeholder="Montant (€)" value={bordTarifMontant} onChange={(e) => setBordTarifMontant(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTarifBord())} />
                        <Button type="button" onClick={addTarifBord} disabled={!bordTarifMontant}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
                      </div>
                      {formState.tarifsBord.length > 0 && (
                        <div className="space-y-2">
                          {formState.tarifsBord.map((t) => (<TarifListItem key={t.id} item={t} onRemove={removeTarifBord} />))}
                        </div>
                      )}
                    </>
                  )}

                  {/* RI Section */}
                  {activeSection === 'ri' && (
                    <div className="grid grid-cols-2 gap-4">
                      <CounterInput label="RI positif" sublabel="Identité vérifiée" value={formState.riPositif} onChange={(v) => setFormState((p) => ({ ...p, riPositif: v }))} variant="success" />
                      <CounterInput label="RI négatif" sublabel="Identité non vérifiable" value={formState.riNegatif} onChange={(v) => setFormState((p) => ({ ...p, riNegatif: v }))} variant="danger" />
                    </div>
                  )}

                  {/* Notes Section */}
                  {activeSection === 'notes' && (
                    <Textarea placeholder="Remarques, observations..." value={formState.commentaire} onChange={(e) => setFormState((p) => ({ ...p, commentaire: e.target.value }))} rows={3} />
                  )}
                </CardContent>
              </Card>
            ) : (
              /* === EXTENDED MODE (original layout) === */
              <>
                {/* Card 1: Train Info */}
                <Card className="border-0 shadow-sm overflow-hidden bg-card-cyan text-card-cyan-foreground border-card-cyan">
                  <div className="h-1 bg-gradient-to-r from-cyan-400 to-teal-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                        <Train className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                      </div>
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
                        <StationAutocomplete
                          id="origin"
                          placeholder="Gare de départ"
                          value={formState.origin}
                          onChange={(v) => setFormState((p) => ({ ...p, origin: v }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="destination">Destination</Label>
                        <StationAutocomplete
                          id="destination"
                          placeholder="Gare d'arrivée"
                          value={formState.destination}
                          onChange={(v) => setFormState((p) => ({ ...p, destination: v }))}
                        />
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

                {/* Card 1b: STT 50€ and PV 100€ */}
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <Ticket className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      Suppléments rapides
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <CounterInput
                          label="STT 50€"
                          sublabel="Tarif contrôle"
                          value={formState.stt50Count}
                          onChange={(v) => setFormState((p) => ({ ...p, stt50Count: v }))}
                          showTotal={{ unitPrice: 50, label: 'Total' }}
                        />
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <CounterInput
                          label="PV 100€"
                          sublabel="Procès-verbal"
                          value={formState.stt100Count}
                          onChange={(v) => setFormState((p) => ({ ...p, stt100Count: v }))}
                          showTotal={{ unitPrice: 100, label: 'Total' }}
                          variant="danger"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Tarifs contrôle */}
                <Card className="border-0 shadow-sm overflow-hidden bg-card-amber text-card-amber-foreground border-card-amber">
                  <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      Tarif contrôle
                    </CardTitle>
                    <CardDescription className="text-xs pl-8">Infractions régularisées sur place</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TarifTypeToggle types={TARIF_TYPES} value={controleTarifType} onChange={setControleTarifType} />

                    {controleTarifType === 'autre' && (
                      <Input
                        placeholder="Précisez l'infraction..."
                        value={formState.autreControleComment}
                        onChange={(e) => setFormState((p) => ({ ...p, autreControleComment: e.target.value }))}
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
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
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

                {/* Card 3: PV */}
                <Card className="border-0 shadow-sm overflow-hidden bg-card-rose text-card-rose-foreground border-card-rose">
                  <div className="h-1 bg-gradient-to-r from-rose-400 to-red-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      </div>
                      Procès-verbaux (PV)
                    </CardTitle>
                    <CardDescription className="text-xs pl-8">Infractions verbalisées</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TarifTypeToggle types={PV_TYPES} value={pvTarifType} onChange={setPvTarifType} />

                    {pvTarifType === 'pv_autre' && (
                      <Input
                        placeholder="Précisez l'infraction..."
                        value={formState.autrePvComment}
                        onChange={(e) => setFormState((p) => ({ ...p, autrePvComment: e.target.value }))}
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
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
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

                {/* Card 4: Tarifs à bord */}
                <Card className="border-0 shadow-sm overflow-hidden bg-card-mint text-card-mint-foreground border-card-mint">
                  <div className="h-1 bg-gradient-to-r from-teal-400 to-green-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                        <Ticket className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      </div>
                      Tarif à bord / exceptionnel
                    </CardTitle>
                    <CardDescription className="text-xs pl-8">Ces tarifs ne comptent PAS dans le taux de fraude</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Button type="button" variant={formState.tarifMode === 'bord' ? 'default' : 'outline'} size="sm" onClick={() => setFormState((p) => ({ ...p, tarifMode: 'bord' }))}>Bord</Button>
                      <Button type="button" variant={formState.tarifMode === 'exceptionnel' ? 'default' : 'outline'} size="sm" onClick={() => setFormState((p) => ({ ...p, tarifMode: 'exceptionnel' }))}>Exceptionnel</Button>
                    </div>
                    <div className="flex gap-2">
                      <Input type="number" min="0" step="0.01" placeholder="Montant (€)" value={bordTarifMontant} onChange={(e) => setBordTarifMontant(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTarifBord())} />
                      <Button type="button" onClick={addTarifBord} disabled={!bordTarifMontant}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
                    </div>
                    {formState.tarifsBord.length > 0 && (
                      <div className="space-y-2">
                        {formState.tarifsBord.map((t) => (<TarifListItem key={t.id} item={t} onRemove={removeTarifBord} />))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Card 5: RI */}
                <Card className="border-0 shadow-sm overflow-hidden bg-card-violet text-card-violet-foreground border-card-violet">
                  <div className="h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                        <User className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                      </div>
                      Relevés d'identité (RI)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <CounterInput label="RI positif" sublabel="Identité vérifiée" value={formState.riPositif} onChange={(v) => setFormState((p) => ({ ...p, riPositif: v }))} variant="success" />
                      <CounterInput label="RI négatif" sublabel="Identité non vérifiable" value={formState.riNegatif} onChange={(v) => setFormState((p) => ({ ...p, riNegatif: v }))} variant="danger" />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 6: Commentaires */}
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-slate-300 to-gray-400" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                        <MessageSquare className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                      </div>
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
              </>
            )}
          </div>

          {/* Right Column - Action Buttons (1/3 on desktop) */}
          <div className="lg:col-span-1">
            <div className="space-y-4 lg:sticky lg:top-52">
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isCreating || isUpdating}
                >
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

              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="text-base font-semibold flex items-center gap-2 hover:text-primary transition-colors text-left"
            >
              {historyExpanded ? (
                <ChevronDown className="h-5 w-5 text-primary" />
              ) : (
                <ChevronRight className="h-5 w-5 text-primary" />
              )}
              <Calendar className="h-5 w-5 text-primary" />
              Historique des contrôles
              {controls.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {controls.length}
                </Badge>
              )}
            </button>
            {historyExpanded && filteredControls.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            )}
          </div>

          {/* Filters and Controls - Animated with framer-motion */}
          <AnimatePresence>
            {historyExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pb-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par train, trajet..."
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

                  {/* Sort options */}
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                      <SelectTrigger className="w-[200px] h-8">
                        <SelectValue placeholder="Trier par..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date (récent)</SelectItem>
                        <SelectItem value="fraud_desc">Fraude ↓ (élevée)</SelectItem>
                        <SelectItem value="fraud_asc">Fraude ↑ (faible)</SelectItem>
                        <SelectItem value="passengers_desc">Voyageurs ↓</SelectItem>
                        <SelectItem value="passengers_asc">Voyageurs ↑</SelectItem>
                      </SelectContent>
                    </Select>
                    
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

                {/* Controls list */}
                <div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : controls.length === 0 ? (
            <div className="text-center py-12">
              <Train className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun contrôle</h3>
              <p className="text-muted-foreground">
                Vous n'avez pas encore enregistré de contrôles à bord.
              </p>
            </div>
          ) : filteredControls.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun résultat</h3>
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
                  <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
                    <Badge variant="secondary" className="ml-auto">
                      {groupedControls[date].length} contrôle{groupedControls[date].length > 1 ? 's' : ''}
                    </Badge>
                  </h3>
                  <div className="space-y-2">
                    {groupedControls[date].map((control) => {
                      const fraudCount = control.tarifs_controle + control.pv;
                      const fraudRate = control.nb_passagers > 0 
                        ? ((fraudCount / control.nb_passagers) * 100)
                        : 0;
                      return (
                        <Card 
                          key={control.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleControlClick(control)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              {/* Icon */}
                              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                <Train className="h-4 w-4 text-primary" />
                              </div>
                              
                              {/* Main info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">
                                    {control.origin && control.destination 
                                      ? `${control.origin} → ${control.destination}`
                                      : control.location}
                                  </span>
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
                                <div className={cn(
                                  'text-center',
                                  fraudRate > 10 ? 'text-destructive' : fraudRate > 5 ? 'text-warning' : 'text-success'
                                )}>
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
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Detail Dialog */}
      <ControlDetailDialog
        control={selectedControl}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
        onDelete={handleDeleteControl}
      />
      
      {/* Export Dialog */}
      <ExportDialog
        controls={controls as Control[]}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
    </AppLayout>
  );
}
