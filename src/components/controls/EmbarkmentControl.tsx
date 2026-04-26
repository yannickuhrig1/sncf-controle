import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  CalendarIcon,
  Plus,
  Trash2,
  Train,
  ChevronDown,
  ChevronUp,
  Save,
  Shield,
  AlertTriangle,
  Footprints,
  MessageSquare,
  Maximize2,
  Cloud,
  CloudOff,
  Loader2,
  History,
  Download,
  FileText,
  CheckCircle2,
  Archive,
  Search,
  Users,
  Share2,
  Copy,
  Mail,
  Link2,
  ScanLine,
  KeyRound,
  Building2,
} from 'lucide-react';
import type { TrainInfo } from '@/hooks/useTrainLookup';
import { StationAutocomplete } from './StationAutocomplete';
import { TrainLookupButton } from './TrainLookupButton';
import { QRCodeScanner } from './QRCodeScanner';
import { useFraudThresholds } from '@/hooks/useFraudThresholds';
import { getFraudThresholds } from '@/lib/stats';
import { useEmbarkmentMissions } from '@/hooks/useEmbarkmentMissions';
import { useEmbarkmentSharing, isValidShareCode } from '@/hooks/useEmbarkmentSharing';
import { FullscreenCounterDialog } from './FullscreenCounterDialog';
import { downloadEmbarkmentPDF, downloadEmbarkmentHTML, openEmbarkmentHTMLPreview } from '@/lib/embarkmentExportUtils';
import { toast } from 'sonner';

export interface EmbarkmentTrain {
  id: string;
  trainNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  platform: string;
  // Control data
  controlled: number;
  refused: number;
  // Checkboxes
  policePresence: boolean;
  trackCrossing: boolean;
  controlLineCrossing: boolean;
  // Comments
  comment: string;
}

export interface EmbarkmentMissionData {
  date: string;
  stationName: string;
  trains: EmbarkmentTrain[];
  globalComment: string;
}

interface EmbarkmentControlProps {
  stationName: string;
  onStationChange: (name: string) => void;
  /** If set, load this mission on mount */
  initialMissionId?: string;
}

const STORAGE_KEY = 'embarkment_mission_data';

interface StoredEmbarkmentData {
  data: EmbarkmentMissionData;
  /** ISO timestamp written when this localStorage entry was last updated.
   *  Used to compare against the server's `updated_at` and pick the freshest
   *  state when restoring on mount. */
  savedAt: string;
}

function loadEmbarkmentData(): StoredEmbarkmentData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);

    // New shape: { data, savedAt }
    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'savedAt' in parsed) {
      const inner = parsed.data as EmbarkmentMissionData;
      if (inner?.date && isValid(parseISO(inner.date))) {
        return parsed as StoredEmbarkmentData;
      }
      return null;
    }

    // Legacy shape: bare EmbarkmentMissionData. Treat as "very old" so server
    // wins any tie. Migrate to the new shape opportunistically next save.
    if (parsed && typeof parsed === 'object' && 'date' in parsed) {
      const inner = parsed as EmbarkmentMissionData;
      if (inner.date && isValid(parseISO(inner.date))) {
        return { data: inner, savedAt: new Date(0).toISOString() };
      }
    }
  } catch (e) {
    console.warn('Failed to load embarkment data:', e);
  }
  return null;
}

function saveEmbarkmentData(data: EmbarkmentMissionData): void {
  try {
    const wrapper: StoredEmbarkmentData = { data, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wrapper));
  } catch (e) {
    console.warn('Failed to save embarkment data:', e);
  }
}

// Helper to get color based on fraud rate
function getThresholdColor(rate: number): 'green' | 'yellow' | 'red' {
  const thresholds = getFraudThresholds();
  if (rate < thresholds.low) return 'green';
  if (rate < thresholds.medium) return 'yellow';
  return 'red';
}

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

export function EmbarkmentControl({ stationName, onStationChange, initialMissionId }: EmbarkmentControlProps) {
  // Sync thresholds from admin settings
  useFraudThresholds();
  
  // Supabase sync
  const { 
    missions, 
    currentMission, 
    isSaving, 
    saveMission, 
    loadMission,
    completeMission,
    clearCurrentMission,
    setCurrentMission,
    isLoading: isMissionsLoading 
  } = useEmbarkmentMissions();
  
  const [missionDate, setMissionDate] = useState<Date>(new Date());
  const [trains, setTrains] = useState<EmbarkmentTrain[]>([]);
  const [globalComment, setGlobalComment] = useState('');
  const [expandedTrainId, setExpandedTrainId] = useState<string | null>(null);
  const [showFullscreenCounter, setShowFullscreenCounter] = useState(false);
  const [showMissionHistory, setShowMissionHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'active' | 'completed'>('completed');

  const isReadOnly = !!currentMission?.is_completed;

  // Form for adding new train
  const [newTrainNumber, setNewTrainNumber] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newDepartureTime, setNewDepartureTime] = useState('');
  const [newPlatform, setNewPlatform] = useState('');

  // Show all trains or only recent ones
  const [showAllTrains, setShowAllTrains] = useState(false);

  // Sharing states
  const [shareOpen, setShareOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinTab, setJoinTab] = useState<'qr' | 'code' | 'station'>('qr');
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareQrDataUrl, setShareQrDataUrl] = useState<string | null>(null);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const { createShareCode, resolveShareCode, isResolvingCode } = useEmbarkmentSharing();

  // Info SNCF panel par train
  const [trainLookupOpen,        setTrainLookupOpen]        = useState<Record<string, boolean>>({});
  const [trainLookupAutoTrigger, setTrainLookupAutoTrigger] = useState<Record<string, number>>({});
  const [trainInfoCache,         setTrainInfoCache]         = useState<Record<string, TrainInfo>>({});

  const missionDateStr = format(missionDate, 'yyyy-MM-dd');

  // Save status: 'saved' | 'saving' | 'unsaved'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isAutoSavingRef = useRef(false);
  const initialLoadRef = useRef(true);
  // Gate that prevents auto-save effects (localStorage + server) from running
  // before the hybrid load resolves. Without this, the first render with
  // empty trains would overwrite the localStorage and then sync that empty
  // state to the server.
  const hydrationDoneRef = useRef(false);
  const [hydrationDone, setHydrationDone] = useState(false);

  // Load mission on mount.
  //
  // Three branches:
  //   1. `initialMissionId` set (came from URL) → server is the source of truth.
  //   2. No `initialMissionId` and we have a localStorage entry: wait for the
  //      server's mission list to arrive and pick whichever is most recent
  //      between the localStorage entry's `savedAt` and the server's
  //      `updated_at` for the currently-open server mission. This protects
  //      against stale localStorage overwriting fresh server data after a
  //      migration or edits from another device.
  //   3. Nothing in localStorage → fall back to whatever is in `currentMission`
  //      via the missions list (most recent open mission for this agent).
  useEffect(() => {
    // Wait for the missions list to be hydrated from the server before deciding.
    // `isMissionsLoading` flips to false once `refreshMissions()` resolves.
    if (isMissionsLoading) return;
    if (hydrationDoneRef.current) return;

    const finishHydration = () => {
      hydrationDoneRef.current = true;
      setHydrationDone(true);
    };

    if (initialMissionId) {
      loadMission(initialMissionId).then((mission) => {
        if (mission) {
          setMissionDate(parseISO(mission.mission_date));
          setTrains(mission.trains);
          setGlobalComment(mission.global_comment || '');
          onStationChange(mission.station_name);
        }
        finishHydration();
      });
      return;
    }

    const stored = loadEmbarkmentData();

    // Find the most recent OPEN server mission for this agent that matches
    // the localStorage's date+station (if any). We don't want to confuse a
    // stale localStorage from yesterday with today's server mission.
    const candidateServerMission = (() => {
      if (!stored) {
        // No local state → pick the most recent open server mission (if any)
        return missions.find(m => !m.is_completed) ?? null;
      }
      const byKey = missions.find(m =>
        !m.is_completed
        && m.mission_date === stored.data.date
        && m.station_name === stored.data.stationName
      );
      return byKey ?? null;
    })();

    // Compare timestamps and apply the freshest version.
    const localTs = stored ? Date.parse(stored.savedAt) : 0;
    const serverTs = candidateServerMission ? Date.parse(candidateServerMission.updated_at) : 0;

    if (candidateServerMission && serverTs >= localTs) {
      // Server wins (or tie) → use server data and refresh localStorage.
      setMissionDate(parseISO(candidateServerMission.mission_date));
      setTrains(candidateServerMission.trains);
      setGlobalComment(candidateServerMission.global_comment || '');
      onStationChange(candidateServerMission.station_name);
      setCurrentMission(candidateServerMission);
      // Overwrite localStorage with the canonical server version so the next
      // boot doesn't fight with itself.
      saveEmbarkmentData({
        date: candidateServerMission.mission_date,
        stationName: candidateServerMission.station_name,
        trains: candidateServerMission.trains,
        globalComment: candidateServerMission.global_comment || '',
      });
    } else if (stored) {
      // Local wins (or no server candidate) → restore from localStorage.
      const parsedDate = parseISO(stored.data.date);
      if (isValid(parsedDate)) setMissionDate(parsedDate);
      setTrains(stored.data.trains || []);
      setGlobalComment(stored.data.globalComment || '');
      if (stored.data.stationName) onStationChange(stored.data.stationName);
      // If we have a matching server mission (just older), bind to it so
      // subsequent saves UPDATE rather than INSERT.
      if (candidateServerMission) setCurrentMission(candidateServerMission);
    }

    finishHydration();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMissionId, isMissionsLoading]);

  // Auto-save to localStorage when data changes (skipped until hydration is done
  // to avoid overwriting localStorage with the empty initial render state).
  useEffect(() => {
    if (!hydrationDone) return;
    const timeoutId = setTimeout(() => {
      const data: EmbarkmentMissionData = {
        date: missionDateStr,
        stationName,
        trains,
        globalComment,
      };
      saveEmbarkmentData(data);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [missionDate, stationName, trains, globalComment, hydrationDone]);

  // Auto-save to server (debounced 5s) when meaningful data exists
  useEffect(() => {
    // Wait for hydration before auto-saving to the server, otherwise we could
    // race the load and overwrite freshly fetched server data with the empty
    // initial state.
    if (!hydrationDone) return;

    // Skip initial load to avoid saving on mount
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // Only auto-save if we have a station name and at least 1 train with data
    const hasContent = stationName.trim() && trains.length > 0;
    if (!hasContent || isReadOnly) return;

    setSaveStatus('unsaved');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      if (isAutoSavingRef.current) return;
      isAutoSavingRef.current = true;
      setSaveStatus('saving');

      const data: EmbarkmentMissionData = {
        date: missionDateStr,
        stationName,
        trains,
        globalComment,
      };
      const result = await saveMission(data);
      isAutoSavingRef.current = false;
      setSaveStatus(result ? 'saved' : 'unsaved');
    }, 5000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionDate, stationName, trains, globalComment, isReadOnly]);

  // Calculate fraud stats
  const fraudStats = useMemo(() => {
    const totalControlled = trains.reduce((sum, t) => sum + t.controlled, 0);
    const totalRefused = trains.reduce((sum, t) => sum + t.refused, 0);
    const globalFraudRate = totalControlled > 0 ? (totalRefused / totalControlled) * 100 : 0;
    
    return {
      totalControlled,
      totalRefused,
      globalFraudRate,
    };
  }, [trains]);

  const getTrainFraudRate = (train: EmbarkmentTrain) => {
    if (train.controlled === 0) return 0;
    return (train.refused / train.controlled) * 100;
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleAddTrain = useCallback(() => {
    if (isReadOnly) return;
    if (!newTrainNumber.trim()) return;

    const newTrain: EmbarkmentTrain = {
      id: generateId(),
      trainNumber: newTrainNumber.trim(),
      origin: newOrigin.trim() || stationName,
      destination: newDestination.trim(),
      departureTime: newDepartureTime.trim(),
      platform: newPlatform.trim(),
      controlled: 0,
      refused: 0,
      policePresence: false,
      trackCrossing: false,
      controlLineCrossing: false,
      comment: '',
    };

    setTrains(prev => [...prev, newTrain]);
    setExpandedTrainId(newTrain.id);
    
    // Reset form
    setNewTrainNumber('');
    setNewOrigin('');
    setNewDestination('');
    setNewDepartureTime('');
    setNewPlatform('');
  }, [isReadOnly, newTrainNumber, newOrigin, newDestination, newDepartureTime, newPlatform, stationName]);

  const handleRemoveTrain = (id: string) => {
    if (isReadOnly) return;
    setTrains(prev => prev.filter(t => t.id !== id));
    if (expandedTrainId === id) {
      setExpandedTrainId(null);
    }
  };

  const handleUpdateTrain = (id: string, updates: Partial<EmbarkmentTrain>) => {
    if (isReadOnly) return;
    setTrains(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleClearAll = () => {
    setTrains([]);
    setGlobalComment('');
    setMissionDate(new Date());
    clearCurrentMission();
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSaveToServer = async () => {
    // Cancel pending auto-save
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus('saving');
    const data: EmbarkmentMissionData = {
      date: missionDateStr,
      stationName,
      trains,
      globalComment,
    };
    const result = await saveMission(data);
    setSaveStatus(result ? 'saved' : 'unsaved');
  };

  const handleCompleteMission = async () => {
    if (!currentMission) {
      // Save first, then complete
      const data: EmbarkmentMissionData = {
        date: missionDateStr,
        stationName,
        trains,
        globalComment,
      };
      const saved = await saveMission(data);
      if (saved) {
        await completeMission(saved.id);
        handleClearAll();
      }
    } else {
      await completeMission(currentMission.id);
      handleClearAll();
    }
  };

  const handleExportPDF = () => {
    const data: EmbarkmentMissionData = {
      date: missionDateStr,
      stationName,
      trains,
      globalComment,
    };
    downloadEmbarkmentPDF(data, currentMission?.is_completed || false);
  };

  const handleExportHTML = () => {
    const data: EmbarkmentMissionData = {
      date: missionDateStr,
      stationName,
      trains,
      globalComment,
    };
    downloadEmbarkmentHTML(data, currentMission?.is_completed || false);
  };

  const handlePreviewHTML = () => {
    const data: EmbarkmentMissionData = {
      date: missionDateStr,
      stationName,
      trains,
      globalComment,
    };
    openEmbarkmentHTMLPreview(data, currentMission?.is_completed || false);
  };

  const handleLoadMission = async (missionId: string) => {
    const mission = await loadMission(missionId);
    if (mission) {
      setMissionDate(parseISO(mission.mission_date));
      setTrains(mission.trains);
      setGlobalComment(mission.global_comment || '');
      onStationChange(mission.station_name);
      setShowMissionHistory(false);
    }
  };

  // ── Sharing handlers ────────────────────────────────────────────────────
  // Build the URL embedded in the QR code. Includes the share code so the
  // landing page can auto-join.
  const buildShareUrl = useCallback((code: string) => {
    return `${window.location.origin}/station?mode=embarkment&join=${code}`;
  }, []);

  // Open the Share dialog: ensure the mission is saved server-side first
  // (we need a mission_id to attach the code to), then create or reuse a code.
  const handleOpenShare = useCallback(async () => {
    if (isReadOnly) return;
    if (!stationName.trim()) {
      toast.error('Renseignez la gare avant de partager');
      return;
    }

    setShareOpen(true);
    setIsPreparingShare(true);
    setShareCode(null);
    setShareQrDataUrl(null);

    try {
      // Save first so we have an id to attach the code to.
      let missionId = currentMission?.id ?? null;
      if (!missionId) {
        const saved = await saveMission({
          date: missionDateStr,
          stationName,
          trains,
          globalComment,
        });
        missionId = saved?.id ?? null;
      }
      if (!missionId) {
        toast.error('Impossible de préparer le partage');
        return;
      }

      const code = await createShareCode(missionId);
      if (!code) return;

      setShareCode(code);
      const url = buildShareUrl(code);
      const dataUrl = await QRCode.toDataURL(url, {
        margin: 1,
        width: 240,
        errorCorrectionLevel: 'M',
      });
      setShareQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to prepare share:', err);
      toast.error('Erreur lors de la préparation du partage');
    } finally {
      setIsPreparingShare(false);
    }
  }, [isReadOnly, stationName, currentMission, missionDateStr, trains, globalComment, saveMission, createShareCode, buildShareUrl]);

  // Apply a join: resolve the code, copy the source mission's trains into the
  // current agent's local state, and persist via saveMission. The dedupe
  // logic in useEmbarkmentMissions ensures we update an existing mission for
  // (this agent, date, station) rather than creating yet another row.
  const applyJoin = useCallback(async (code: string) => {
    const resolved = await resolveShareCode(code);
    if (!resolved) return false;

    setMissionDate(parseISO(resolved.missionDate));
    onStationChange(resolved.stationName);
    setTrains(resolved.trains);
    // Persist immediately so the new agent has their own row for this mission.
    await saveMission({
      date: resolved.missionDate,
      stationName: resolved.stationName,
      trains: resolved.trains,
      globalComment: '',
    });
    toast.success(`Mission rejointe : ${resolved.stationName}`);
    return true;
  }, [resolveShareCode, onStationChange, saveMission]);

  // Wired to the "Code" tab submit button.
  const handleSubmitCode = useCallback(async () => {
    if (!isValidShareCode(joinCodeInput.replace(/\D/g, ''))) {
      toast.error('Le code doit comporter 6 chiffres');
      return;
    }
    const ok = await applyJoin(joinCodeInput.replace(/\D/g, ''));
    if (ok) {
      setJoinOpen(false);
      setJoinCodeInput('');
    }
  }, [joinCodeInput, applyJoin]);

  // Wired to the "QR scan" tab. Accepts either a 6-digit code or a full URL
  // containing ?join=XXXXXX.
  const handleScannedText = useCallback(async (decodedText: string) => {
    let code = decodedText.trim();
    try {
      const url = new URL(decodedText);
      const param = url.searchParams.get('join');
      if (param) code = param;
    } catch {
      // Not a URL — treat as a raw code
    }
    code = code.replace(/\D/g, '');
    if (!isValidShareCode(code)) {
      toast.error('QR code invalide');
      return;
    }
    const ok = await applyJoin(code);
    if (ok) setJoinOpen(false);
  }, [applyJoin]);

  // Reset the dialog state when it closes so reopening starts fresh.
  useEffect(() => {
    if (!shareOpen) {
      setShareCode(null);
      setShareQrDataUrl(null);
      setIsPreparingShare(false);
    }
  }, [shareOpen]);

  // Auto-apply ?join=XXXXXX when the page is opened from a shared link.
  // Read once on mount; we don't reload the mission state if the agent is
  // already working on something — the join target should be applied as the
  // primary intent of the navigation.
  const joinFromUrlAppliedRef = useRef(false);
  useEffect(() => {
    if (joinFromUrlAppliedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode && isValidShareCode(joinCode)) {
      joinFromUrlAppliedRef.current = true;
      applyJoin(joinCode).finally(() => {
        // Strip ?join= from the URL so a reload doesn't re-trigger the join.
        const url = new URL(window.location.href);
        url.searchParams.delete('join');
        window.history.replaceState({}, '', url.toString());
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-apply ?seed=<base64-json> when the page is opened from a service-day
  // import. Each entry seeds a train row with counters at 0. We only apply the
  // seed when the current mission is empty so we never overwrite an in-progress
  // mission. We also wait for `hydrationDone` so we don't race the load.
  const seedFromUrlAppliedRef = useRef(false);
  useEffect(() => {
    if (seedFromUrlAppliedRef.current) return;
    if (!hydrationDone) return;
    const params = new URLSearchParams(window.location.search);
    const seed = params.get('seed');
    if (!seed) return;
    seedFromUrlAppliedRef.current = true;

    // Strip the param up-front so a reload doesn't re-seed.
    const stripUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('seed');
      window.history.replaceState({}, '', url.toString());
    };

    if (trains.length > 0) {
      // Mission is not empty — keep existing data, just clean the URL.
      stripUrl();
      return;
    }

    try {
      const json = decodeURIComponent(escape(atob(seed)));
      const payload = JSON.parse(json) as Array<{
        trainNumber?: string;
        origin?: string;
        destination?: string;
        departureTime?: string;
      }>;
      if (!Array.isArray(payload) || payload.length === 0) {
        stripUrl();
        return;
      }
      const newTrains: EmbarkmentTrain[] = payload.map((p, idx) => ({
        // Use a stable-ish unique id: seed time + index keeps ordering stable
        // across re-renders without needing a UUID lib.
        id: `seed-${Date.now()}-${idx}`,
        trainNumber: p.trainNumber || '',
        origin: p.origin || '',
        destination: p.destination || '',
        departureTime: p.departureTime || '',
        platform: '',
        controlled: 0,
        refused: 0,
        policePresence: false,
        trackCrossing: false,
        controlLineCrossing: false,
        comment: '',
      }));
      setTrains(newTrains);
      toast.success(`${newTrains.length} train(s) pré-remplis depuis votre journée`);
    } catch (e) {
      console.warn('Failed to apply seed payload:', e);
    } finally {
      stripUrl();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrationDone]);

  const globalColor = getThresholdColor(fraudStats.globalFraudRate);
  const historyMissions = missions.filter(m => (historyTab === 'completed' ? m.is_completed : !m.is_completed));

  return (
    <div className="space-y-4">
      {/* Mission Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Train className="h-4 w-4 text-primary" />
              Mission Embarquement
              {trains.length > 0 && (
                <Badge variant="secondary">{trains.length} train{trains.length > 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' ? (
                <Badge variant="outline" className="text-xs flex items-center gap-1 text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sauvegarde…
                </Badge>
              ) : saveStatus === 'unsaved' ? (
                <Badge variant="outline" className="text-xs flex items-center gap-1 text-amber-600">
                  <CloudOff className="h-3 w-3" />
                  Non sauvegardé
                </Badge>
              ) : currentMission ? (
                <Badge variant="outline" className="text-xs flex items-center gap-1 text-green-600">
                  <Cloud className="h-3 w-3" />
                  Sauvegardé
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs flex items-center gap-1 text-muted-foreground">
                  <CloudOff className="h-3 w-3" />
                  Local
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowMissionHistory(!showMissionHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isReadOnly && (
            <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/20">
              <Archive className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Mission terminée (archivée)</p>
                <p className="text-xs text-muted-foreground">
                  Consultation et export uniquement (modifications désactivées).
                </p>
              </div>
            </div>
          )}

          {/* Mission history */}
          <AnimatePresence>
            {showMissionHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border rounded-md p-3 space-y-2 mb-4 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">Historique missions</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant={historyTab === 'active' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setHistoryTab('active')}
                      >
                        En cours
                      </Button>
                      <Button
                        type="button"
                        variant={historyTab === 'completed' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setHistoryTab('completed')}
                      >
                        Terminées
                      </Button>
                    </div>
                  </div>

                  {isMissionsLoading ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : historyMissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      {historyTab === 'completed'
                        ? 'Aucune mission terminée pour le moment.'
                        : 'Aucune mission en cours trouvée.'}
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {historyMissions.slice(0, 20).map((m) => (
                        <Button
                          key={m.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-7"
                          onClick={() => handleLoadMission(m.id)}
                        >
                          {format(parseISO(m.mission_date), 'dd/MM/yyyy', { locale: fr })} - {m.station_name}
                          <span className="ml-auto flex items-center gap-2">
                            {m.is_completed && <Archive className="h-3 w-3 text-muted-foreground" />}
                            <Badge variant="secondary" className="text-xs">
                              {m.trains.length} train{m.trains.length > 1 ? 's' : ''}
                            </Badge>
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Date picker */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date du contrôle</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isReadOnly}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !missionDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {missionDate ? format(missionDate, "dd/MM/yyyy", { locale: fr }) : "Choisir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={missionDate}
                    onSelect={(date) => date && setMissionDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Gare</Label>
              <Input
                disabled={isReadOnly}
                list="gares-embark"
                placeholder="Gare de contrôle"
                value={stationName}
                onChange={(e) => onStationChange(e.target.value)}
              />
              <datalist id="gares-embark">
                {GARES_PRINCIPALES.map((gare) => (
                  <option key={gare} value={gare} />
                ))}
              </datalist>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partage multi-agents */}
      {!isReadOnly && (
        <Card>
          <div className="p-3 flex items-center gap-2 flex-wrap">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground flex-1 min-w-0">Mission multi-agents</span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setJoinOpen(true)}>
              <Link2 className="h-3.5 w-3.5" />Rejoindre
            </Button>
            <Button
              size="sm"
              variant={stationName.trim() ? 'default' : 'outline'}
              className="gap-1.5"
              disabled={!stationName.trim()}
              onClick={handleOpenShare}
            >
              <Share2 className="h-3.5 w-3.5" />Partager
            </Button>
          </div>
        </Card>
      )}

      {/* Sticky compact stats bar — mobile only.
          Sits just below the mobile header (sticky top-0 z-40 in AppLayout)
          so we anchor at top-14 to align below it. Hidden on md+ where the
          full stats card below is visible without scrolling concerns. */}
      {trains.length > 0 && (
        <div className="md:hidden sticky top-14 z-30 -mx-4 px-4 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
          <button
            type="button"
            onClick={() => setShowFullscreenCounter(true)}
            className="w-full py-2 grid grid-cols-3 gap-2 text-center active:bg-muted/40 transition-colors rounded-md"
            aria-label="Ouvrir le compteur en plein écran"
          >
            <div>
              <p className="text-lg font-bold leading-tight">{fraudStats.totalControlled}</p>
              <p className="text-[10px] text-muted-foreground leading-none">Contrôlés</p>
            </div>
            <div>
              <p className="text-lg font-bold text-destructive leading-tight">{fraudStats.totalRefused}</p>
              <p className="text-[10px] text-muted-foreground leading-none">Refoulés</p>
            </div>
            <div>
              <p className={cn(
                "text-lg font-bold leading-tight",
                globalColor === 'green' && "text-success",
                globalColor === 'yellow' && "text-warning",
                globalColor === 'red' && "text-destructive"
              )}>
                {fraudStats.globalFraudRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground leading-none">Taux fraude</p>
            </div>
          </button>
        </div>
      )}

      {/* Global Stats with Fullscreen button — desktop only on mobile we use the sticky bar above */}
      {trains.length > 0 && (
        <Card className="bg-muted/50 hidden md:block">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Statistiques globales</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFullscreenCounter(true)}
                className="gap-1"
              >
                <Maximize2 className="h-4 w-4" />
                Plein écran
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{fraudStats.totalControlled}</p>
                <p className="text-xs text-muted-foreground">Contrôlés</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{fraudStats.totalRefused}</p>
                <p className="text-xs text-muted-foreground">Refoulés</p>
              </div>
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  globalColor === 'green' && "text-success",
                  globalColor === 'yellow' && "text-warning",
                  globalColor === 'red' && "text-destructive"
                )}>
                  {fraudStats.globalFraudRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Taux fraude OP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Train Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ajouter un train</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">N° Train *</Label>
              <Input
                disabled={isReadOnly}
                placeholder="6231"
                value={newTrainNumber}
                onChange={(e) => setNewTrainNumber(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Heure départ</Label>
              <Input
                disabled={isReadOnly}
                type="time"
                value={newDepartureTime}
                onChange={(e) => setNewDepartureTime(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quai</Label>
              <Input
                disabled={isReadOnly}
                placeholder="1A"
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Origine</Label>
              <StationAutocomplete
                value={newOrigin}
                onChange={setNewOrigin}
                placeholder={stationName || "Gare départ"}
                className="h-9"
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Destination</Label>
              <StationAutocomplete
                value={newDestination}
                onChange={setNewDestination}
                placeholder="Destination"
                className="h-9"
                disabled={isReadOnly}
              />
            </div>
          </div>
          {newTrainNumber.trim() && !isReadOnly && (
            <TrainLookupButton
              trainNumber={newTrainNumber}
              date={missionDateStr}
              selectedOrigin={stationName}
              onResult={(info) => {
                if (info.origin) setNewOrigin(info.origin);
                if (info.destination) setNewDestination(info.destination);
                const stLower = stationName.toLowerCase();
                const stop = info.stops.find(s =>
                  s.name.toLowerCase().includes(stLower) ||
                  stLower.includes(s.name.toLowerCase())
                );
                const dep = stop?.departureTime || stop?.arrivalTime;
                if (dep) setNewDepartureTime(dep);
              }}
            />
          )}
          <Button
            type="button"
            onClick={handleAddTrain}
            size="sm"
            className="w-full"
            disabled={isReadOnly || !newTrainNumber.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter ce train
          </Button>
        </CardContent>
      </Card>

      {/* Train List */}
      {trains.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Trains ({trains.length})</Label>

          {/* Show more button for older trains */}
          {trains.length > 3 && !showAllTrains && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5 text-muted-foreground"
              onClick={() => setShowAllTrains(true)}
            >
              <History className="h-3.5 w-3.5" />
              Voir les {trains.length - 3} trains précédents
            </Button>
          )}

          {(showAllTrains ? trains : trains.slice(-3)).map((train) => {
            const globalIndex = trains.indexOf(train);
            const trainFraudRate = getTrainFraudRate(train);
            const isExpanded = expandedTrainId === train.id;
            const trainColor = getThresholdColor(trainFraudRate);

            const isLookupOpen = !!trainLookupOpen[train.id];

            return (
              <Card key={train.id} className="overflow-hidden">
                {/* En-tête */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedTrainId(isExpanded ? null : train.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">{globalIndex + 1}</span>
                    <Train className="h-4 w-4 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{train.trainNumber}</span>
                        {train.departureTime && (
                          <span className="text-xs text-muted-foreground">{train.departureTime}</span>
                        )}
                        {train.platform && (
                          <Badge variant="outline" className="text-xs">Quai {train.platform}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {train.origin || stationName} → {train.destination || '?'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {train.controlled > 0 && (
                      <Badge className={cn(
                        "text-xs",
                        trainColor === 'green' && "bg-success/20 text-success hover:bg-success/20",
                        trainColor === 'yellow' && "bg-warning/20 text-warning hover:bg-warning/20",
                        trainColor === 'red' && "bg-destructive/20 text-destructive hover:bg-destructive/20"
                      )}>
                        {trainFraudRate.toFixed(1)}%
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      {train.policePresence && <Shield className="h-3 w-3 text-primary" />}
                      {train.trackCrossing && <Footprints className="h-3 w-3 text-warning" />}
                      {train.controlLineCrossing && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    </div>
                    {/* Bouton Info SNCF + Schéma */}
                    {!isReadOnly && (
                      <button
                        type="button"
                        title="Info SNCF + Schéma"
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          isLookupOpen
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isLookupOpen;
                          setTrainLookupOpen(prev => ({ ...prev, [train.id]: next }));
                          // Auto-trigger au premier clic si pas encore en cache
                          if (next && !trainInfoCache[train.id]) {
                            setTrainLookupAutoTrigger(prev => ({ ...prev, [train.id]: (prev[train.id] || 0) + 1 }));
                          }
                        }}
                      >
                        <Search className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Panel Info SNCF inline — indépendant de l'expansion */}
                {isLookupOpen && (
                  <div className="px-3 pb-3 pt-2 border-t bg-background/60">
                    <TrainLookupButton
                      trainNumber={train.trainNumber}
                      date={missionDateStr}
                      selectedOrigin={stationName}
                      autoTriggerKey={trainLookupAutoTrigger[train.id] || 0}
                      onResult={(info) => {
                        setTrainInfoCache(prev => ({ ...prev, [train.id]: info }));
                        const stLower = stationName.toLowerCase();
                        const stop = info.stops.find(s =>
                          s.name.toLowerCase().includes(stLower) ||
                          stLower.includes(s.name.toLowerCase())
                        );
                        const dep = stop?.departureTime || stop?.arrivalTime;
                        handleUpdateTrain(train.id, {
                          origin:        info.origin      || train.origin,
                          destination:   info.destination || train.destination,
                          ...(dep ? { departureTime: dep } : {}),
                          ...(stop?.platform ? { platform: stop.platform } : {}),
                        });
                      }}
                    />
                  </div>
                )}

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0 pb-4 space-y-4 border-t">
                        {/* Control counts */}
                        <div className="grid grid-cols-2 gap-4 pt-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Personnes contrôlées</Label>
                            <Input
                              type="number"
                              min="0"
                              value={train.controlled}
                              onChange={(e) => handleUpdateTrain(train.id, { controlled: parseInt(e.target.value) || 0 })}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-destructive">Personnes refoulées</Label>
                            <Input
                              type="number"
                              min="0"
                              value={train.refused}
                              onChange={(e) => handleUpdateTrain(train.id, { refused: parseInt(e.target.value) || 0 })}
                              className="h-9"
                            />
                          </div>
                        </div>

                        {/* Fraud rate display */}
                        {train.controlled > 0 && (
                          <div className={cn(
                            "text-center py-2 rounded-md text-sm font-medium",
                            trainColor === 'green' && "bg-success/10 text-success",
                            trainColor === 'yellow' && "bg-warning/10 text-warning",
                            trainColor === 'red' && "bg-destructive/10 text-destructive"
                          )}>
                            Taux de fraude : {trainFraudRate.toFixed(1)}%
                          </div>
                        )}

                        {/* Checkboxes */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`police-${train.id}`}
                              checked={train.policePresence}
                              onCheckedChange={(checked) => 
                                handleUpdateTrain(train.id, { policePresence: checked === true })
                              }
                            />
                            <Label htmlFor={`police-${train.id}`} className="text-sm flex items-center gap-2">
                              <Shield className="h-4 w-4 text-primary" />
                              Présence police
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`track-${train.id}`}
                              checked={train.trackCrossing}
                              onCheckedChange={(checked) => 
                                handleUpdateTrain(train.id, { trackCrossing: checked === true })
                              }
                            />
                            <Label htmlFor={`track-${train.id}`} className="text-sm flex items-center gap-2">
                              <Footprints className="h-4 w-4 text-warning" />
                              Traversée de voies
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`line-${train.id}`}
                              checked={train.controlLineCrossing}
                              onCheckedChange={(checked) => 
                                handleUpdateTrain(train.id, { controlLineCrossing: checked === true })
                              }
                            />
                            <Label htmlFor={`line-${train.id}`} className="text-sm flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              Franchissement ligne de contrôle
                            </Label>
                          </div>
                        </div>

                        {/* Train comment */}
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Commentaire train
                          </Label>
                          <Textarea
                            placeholder="Observations pour ce train..."
                            value={train.comment}
                            onChange={(e) => handleUpdateTrain(train.id, { comment: e.target.value })}
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {/* Delete train */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTrain(train.id);
                          }}
                          className="w-full text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer ce train
                        </Button>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}

          {/* Collapse button */}
          {trains.length > 3 && showAllTrains && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setShowAllTrains(false)}
            >
              Voir moins
            </Button>
          )}
        </div>
      )}

      {/* Global Comment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Commentaire global mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            disabled={isReadOnly}
            placeholder="Observations générales pour l'ensemble de la mission..."
            value={globalComment}
            onChange={(e) => setGlobalComment(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {trains.length > 0 && (
        <div className="space-y-2">
          {/* Export and Complete row */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="h-4 w-4 mr-1" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handlePreviewHTML}>
                  <FileText className="h-4 w-4 mr-2" />
                  Aperçu HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportHTML}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Télécharger PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline"
              size="sm" 
              className="flex-1 text-success hover:text-success"
              onClick={handleCompleteMission}
              disabled={isSaving || isReadOnly}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Terminer
            </Button>
          </div>

          {/* Save and Clear row */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="flex-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Effacer
            </Button>
            <Button 
              type="button"
              size="sm" 
              className="flex-1"
              onClick={handleSaveToServer}
              disabled={isSaving || isReadOnly}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {currentMission ? 'Mettre à jour' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      )}

      {trains.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun train ajouté. Commencez par ajouter des trains pour votre mission d'embarquement.
        </p>
      )}

      {/* Fullscreen Counter Dialog */}
      <FullscreenCounterDialog
        open={showFullscreenCounter}
        onOpenChange={setShowFullscreenCounter}
        trains={trains}
        onUpdateTrain={handleUpdateTrain}
        globalStats={fraudStats}
        readOnly={isReadOnly}
      />

      {/* Dialog : Rejoindre une mission embarquement */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4" />Rejoindre une mission</DialogTitle>
            <DialogDescription>Scannez le QR code, saisissez le code à 6 chiffres, ou indiquez la gare.</DialogDescription>
          </DialogHeader>
          <Tabs value={joinTab} onValueChange={(v) => setJoinTab(v as typeof joinTab)} className="pt-1">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="qr" className="gap-1.5 text-xs">
                <ScanLine className="h-3.5 w-3.5" />QR
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-1.5 text-xs">
                <KeyRound className="h-3.5 w-3.5" />Code
              </TabsTrigger>
              <TabsTrigger value="station" className="gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5" />Gare
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="space-y-3 pt-3">
              {joinTab === 'qr' && (
                <QRCodeScanner onScan={handleScannedText} />
              )}
              <p className="text-[11px] text-muted-foreground text-center">
                Visez le QR code affiché par votre collègue.
              </p>
            </TabsContent>

            <TabsContent value="code" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label className="text-xs">Code à 6 chiffres</Label>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitCode();
                  }}
                  className="h-12 text-center text-2xl font-mono tracking-[0.4em]"
                />
              </div>
              <Button
                className="w-full"
                disabled={!isValidShareCode(joinCodeInput) || isResolvingCode}
                onClick={handleSubmitCode}
              >
                {isResolvingCode ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Vérification…</>
                ) : 'Rejoindre'}
              </Button>
            </TabsContent>

            <TabsContent value="station" className="space-y-3 pt-3">
              <Input
                placeholder="Ex: Metz, Luxembourg…"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && joinInput.trim()) {
                    onStationChange(joinInput.trim());
                    setJoinOpen(false);
                    setJoinInput('');
                  }
                }}
              />
              <Button
                className="w-full"
                disabled={!joinInput.trim()}
                onClick={() => {
                  onStationChange(joinInput.trim());
                  setJoinOpen(false);
                  setJoinInput('');
                }}
              >
                Rejoindre par gare
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Sans code, les trains ne seront pas pré-remplis.
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog : Partager la mission embarquement */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Share2 className="h-4 w-4" />Partager — {stationName}</DialogTitle>
            <DialogDescription>
              Vos collègues rejoignent la mission via QR code, lien ou code à 6 chiffres. Les trains sont copiés ; chaque agent garde ses propres compteurs.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            if (isPreparingShare) {
              return (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs">Préparation du partage…</span>
                </div>
              );
            }
            if (!shareCode || !shareQrDataUrl) {
              return (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Impossible de générer un code. Réessayez.
                </div>
              );
            }
            const shareUrl = buildShareUrl(shareCode);
            const formattedCode = `${shareCode.slice(0, 3)} ${shareCode.slice(3)}`;
            return (
              <div className="space-y-4 pt-1">
                <div className="flex justify-center">
                  <img src={shareQrDataUrl} alt="QR Code" width={200} height={200} className="rounded-lg border" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Code mission</p>
                  <p className="text-3xl font-mono font-bold tracking-[0.4em]">{formattedCode}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Valide 24 h</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => navigator.clipboard.writeText(shareCode).then(() => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); })}>
                    <Copy className="h-3.5 w-3.5" />{copySuccess ? 'Copié !' : 'Copier code'}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => navigator.clipboard.writeText(shareUrl).then(() => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); })}>
                    <Link2 className="h-3.5 w-3.5" />Copier lien
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => window.open(`sms:?body=${encodeURIComponent(`Rejoins la mission embarquement à ${stationName} : ${shareUrl} (code ${shareCode})`)}`)}>
                    <MessageSquare className="h-3.5 w-3.5" />SMS
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5"
                    onClick={() => window.open(`mailto:?subject=${encodeURIComponent(`Mission embarquement — ${stationName}`)}&body=${encodeURIComponent(`Rejoins la mission d'embarquement à ${stationName}.\n\nLien : ${shareUrl}\nCode : ${shareCode}`)}`)}>
                    <Mail className="h-3.5 w-3.5" />Email
                  </Button>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <Button variant="outline" size="sm" className="gap-1.5 col-span-2"
                      onClick={() => navigator.share({ title: `Mission embarquement — ${stationName}`, text: `Code : ${shareCode}`, url: shareUrl })}>
                      <Share2 className="h-3.5 w-3.5" />Partager via…
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
