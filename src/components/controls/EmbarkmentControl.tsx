import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  History
} from 'lucide-react';
import { StationAutocomplete } from './StationAutocomplete';
import { useFraudThresholds } from '@/hooks/useFraudThresholds';
import { getFraudThresholds } from '@/lib/stats';
import { useEmbarkmentMissions } from '@/hooks/useEmbarkmentMissions';
import { FullscreenCounterDialog } from './FullscreenCounterDialog';

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
}

const STORAGE_KEY = 'embarkment_mission_data';

function loadEmbarkmentData(): EmbarkmentMissionData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved) as EmbarkmentMissionData;
      if (data.date && isValid(parseISO(data.date))) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Failed to load embarkment data:', e);
  }
  return null;
}

function saveEmbarkmentData(data: EmbarkmentMissionData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

export function EmbarkmentControl({ stationName, onStationChange }: EmbarkmentControlProps) {
  // Sync thresholds from admin settings
  useFraudThresholds();
  
  // Supabase sync
  const { 
    missions, 
    currentMission, 
    isSaving, 
    saveMission, 
    loadMission,
    clearCurrentMission,
    isLoading: isMissionsLoading 
  } = useEmbarkmentMissions();
  
  const [missionDate, setMissionDate] = useState<Date>(new Date());
  const [trains, setTrains] = useState<EmbarkmentTrain[]>([]);
  const [globalComment, setGlobalComment] = useState('');
  const [expandedTrainId, setExpandedTrainId] = useState<string | null>(null);
  const [showFullscreenCounter, setShowFullscreenCounter] = useState(false);
  const [showMissionHistory, setShowMissionHistory] = useState(false);
  
  // Form for adding new train
  const [newTrainNumber, setNewTrainNumber] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newDepartureTime, setNewDepartureTime] = useState('');
  const [newPlatform, setNewPlatform] = useState('');

  // Load saved data on mount
  useEffect(() => {
    const savedData = loadEmbarkmentData();
    if (savedData) {
      const parsedDate = parseISO(savedData.date);
      if (isValid(parsedDate)) {
        setMissionDate(parsedDate);
      }
      setTrains(savedData.trains || []);
      setGlobalComment(savedData.globalComment || '');
      if (savedData.stationName) {
        onStationChange(savedData.stationName);
      }
    }
  }, [onStationChange]);

  // Auto-save when data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const data: EmbarkmentMissionData = {
        date: missionDate.toISOString(),
        stationName,
        trains,
        globalComment,
      };
      saveEmbarkmentData(data);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [missionDate, stationName, trains, globalComment]);

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
  }, [newTrainNumber, newOrigin, newDestination, newDepartureTime, newPlatform, stationName]);

  const handleRemoveTrain = (id: string) => {
    setTrains(prev => prev.filter(t => t.id !== id));
    if (expandedTrainId === id) {
      setExpandedTrainId(null);
    }
  };

  const handleUpdateTrain = (id: string, updates: Partial<EmbarkmentTrain>) => {
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
    const data: EmbarkmentMissionData = {
      date: missionDate.toISOString(),
      stationName,
      trains,
      globalComment,
    };
    await saveMission(data);
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

  const globalColor = getThresholdColor(fraudStats.globalFraudRate);

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
              {currentMission ? (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Cloud className="h-3 w-3 text-success" />
                  Synchronisée
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
          {/* Mission history */}
          <AnimatePresence>
            {showMissionHistory && missions.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border rounded-md p-3 space-y-2 mb-4 bg-muted/30">
                  <Label className="text-xs text-muted-foreground">Missions précédentes</Label>
                  {isMissionsLoading ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {missions.slice(0, 10).map(m => (
                        <Button
                          key={m.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-7"
                          onClick={() => handleLoadMission(m.id)}
                        >
                          {format(parseISO(m.mission_date), 'dd/MM/yyyy', { locale: fr })} - {m.station_name}
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {m.trains.length} train{m.trains.length > 1 ? 's' : ''}
                          </Badge>
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
                    variant="outline"
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

      {/* Global Stats with Fullscreen button */}
      {trains.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Statistiques globales</span>
              <Button
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
                placeholder="6231"
                value={newTrainNumber}
                onChange={(e) => setNewTrainNumber(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Heure départ</Label>
              <Input
                type="time"
                value={newDepartureTime}
                onChange={(e) => setNewDepartureTime(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quai</Label>
              <Input
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
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Destination</Label>
              <StationAutocomplete
                value={newDestination}
                onChange={setNewDestination}
                placeholder="Destination"
                className="h-9"
              />
            </div>
          </div>
          <Button 
            onClick={handleAddTrain} 
            size="sm" 
            className="w-full"
            disabled={!newTrainNumber.trim()}
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
          
          {trains.map((train) => {
            const trainFraudRate = getTrainFraudRate(train);
            const isExpanded = expandedTrainId === train.id;
            const trainColor = getThresholdColor(trainFraudRate);
            
            return (
              <Card key={train.id} className="overflow-hidden">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedTrainId(isExpanded ? null : train.id)}
                >
                  <div className="flex items-center gap-3">
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
                  <div className="flex items-center gap-3">
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
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

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
            placeholder="Observations générales pour l'ensemble de la mission..."
            value={globalComment}
            onChange={(e) => setGlobalComment(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {trains.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="flex-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Effacer
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={handleSaveToServer}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {currentMission ? 'Mettre à jour' : 'Sauvegarder'}
          </Button>
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
      />
    </div>
  );
}
