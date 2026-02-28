import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2, Train, ChevronDown, ChevronUp, ArrowDownToLine, ArrowUpFromLine, Save } from 'lucide-react';
import { StationAutocomplete } from './StationAutocomplete';
import { TrainTileSelector } from './TrainTileSelector';

export interface PreparedTrain {
  id: string;
  trainNumber: string;
  origin: string;
  destination: string;
  time: string; // Heure d'arrivée (débarquement) ou départ (embarquement)
}

export interface MissionData {
  date: string; // ISO string for storage
  departures: PreparedTrain[]; // Embarquement
  arrivals: PreparedTrain[];   // Débarquement
}

interface MissionPreparationProps {
  onSelectTrain: (train: PreparedTrain, type: 'arrival' | 'departure') => void;
  stationName: string;
  selectedTrainId?: string;
  showTiles?: boolean;
  showTilesInCard?: boolean; // if false, tiles are rendered externally via onTrainsChange
  onTrainsChange?: (arrivals: PreparedTrain[], departures: PreparedTrain[], activeTab: 'arrivals' | 'departures') => void;
}

const STORAGE_KEY = 'mission_preparation_data';

function loadMissionData(): MissionData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved) as MissionData;
      // Validate date
      if (data.date && isValid(parseISO(data.date))) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Failed to load mission data:', e);
  }
  return null;
}

function saveMissionData(data: MissionData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save mission data:', e);
  }
}

export function MissionPreparation({ onSelectTrain, stationName, selectedTrainId, showTiles = false, showTilesInCard = true, onTrainsChange }: MissionPreparationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'arrivals' | 'departures'>('arrivals');
  const [missionDate, setMissionDate] = useState<Date>(new Date());
  const [arrivals, setArrivals] = useState<PreparedTrain[]>([]);
  const [departures, setDepartures] = useState<PreparedTrain[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  
  // Form states for adding new train
  const [newTrainNumber, setNewTrainNumber] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newTime, setNewTime] = useState('');

  // Load saved data on mount
  useEffect(() => {
    const savedData = loadMissionData();
    if (savedData) {
      const parsedDate = parseISO(savedData.date);
      if (isValid(parsedDate)) {
        setMissionDate(parsedDate);
      }
      setArrivals(savedData.arrivals || []);
      setDepartures(savedData.departures || []);
      setIsSaved(true);
      // Auto-expand if there's saved data
      if ((savedData.arrivals?.length || 0) > 0 || (savedData.departures?.length || 0) > 0) {
        setIsExpanded(true);
      }
    }
  }, []);

  // Auto-save when data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const data: MissionData = {
        date: missionDate.toISOString(),
        arrivals,
        departures,
      };
      saveMissionData(data);
      setIsSaved(true);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [missionDate, arrivals, departures]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleAddTrain = useCallback(() => {
    if (!newTrainNumber.trim()) return;

    const newTrain: PreparedTrain = {
      id: generateId(),
      trainNumber: newTrainNumber.trim(),
      origin: newOrigin.trim(),
      destination: newDestination.trim(),
      time: newTime.trim(),
    };

    if (activeTab === 'arrivals') {
      setArrivals(prev => [...prev, newTrain]);
    } else {
      setDepartures(prev => [...prev, newTrain]);
    }

    setIsSaved(false);
    
    // Reset form
    setNewTrainNumber('');
    setNewOrigin('');
    setNewDestination('');
    setNewTime('');
  }, [activeTab, newTrainNumber, newOrigin, newDestination, newTime]);

  const handleRemoveTrain = (id: string, type: 'arrivals' | 'departures') => {
    setIsSaved(false);
    if (type === 'arrivals') {
      setArrivals(prev => prev.filter(t => t.id !== id));
    } else {
      setDepartures(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSelectTrain = (train: PreparedTrain) => {
    onSelectTrain(train, activeTab === 'arrivals' ? 'arrival' : 'departure');
  };

  // Notify parent when trains or activeTab changes
  useEffect(() => {
    onTrainsChange?.(arrivals, departures, activeTab);
  }, [arrivals, departures, activeTab]);

  const handleClearAll = () => {
    setArrivals([]);
    setDepartures([]);
    setMissionDate(new Date());
    localStorage.removeItem(STORAGE_KEY);
    setIsSaved(false);
  };

  const currentTrains = activeTab === 'arrivals' ? arrivals : departures;
  const totalTrains = arrivals.length + departures.length;

  return (
    <Card className="mb-4">
      <CardHeader 
        className="cursor-pointer py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Train className="h-4 w-4 text-primary" />
            Préparation de mission
            {totalTrains > 0 && (
              <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                {totalTrains}
              </span>
            )}
            {isSaved && totalTrains > 0 && (
              <Save className="h-3 w-3 text-muted-foreground" />
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 space-y-4">
              {/* Date picker */}
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
                      {missionDate ? format(missionDate, "EEEE d MMMM yyyy", { locale: fr }) : "Choisir une date"}
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

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'arrivals' | 'departures')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="arrivals" className="flex items-center gap-2">
                    <ArrowDownToLine className="h-4 w-4" />
                    Débarquement
                    {arrivals.length > 0 && (
                      <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                        {arrivals.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="departures" className="flex items-center gap-2">
                    <ArrowUpFromLine className="h-4 w-4" />
                    Embarquement
                    {departures.length > 0 && (
                      <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                        {departures.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="arrivals" className="mt-4 space-y-4">
                  {/* Add train form for arrivals */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">N° Train</Label>
                      <Input
                        placeholder="Ex: 6231"
                        value={newTrainNumber}
                        onChange={(e) => setNewTrainNumber(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heure d'arrivée</Label>
                      <Input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Origine</Label>
                      <StationAutocomplete
                        value={newOrigin}
                        onChange={setNewOrigin}
                        placeholder="Ex: Marseille"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Destination</Label>
                      <StationAutocomplete
                        value={newDestination}
                        onChange={setNewDestination}
                        placeholder={stationName || "Gare actuelle"}
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
                </TabsContent>

                <TabsContent value="departures" className="mt-4 space-y-4">
                  {/* Add train form for departures */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">N° Train</Label>
                      <Input
                        placeholder="Ex: 6231"
                        value={newTrainNumber}
                        onChange={(e) => setNewTrainNumber(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heure de départ</Label>
                      <Input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Origine</Label>
                      <StationAutocomplete
                        value={newOrigin}
                        onChange={setNewOrigin}
                        placeholder={stationName || "Gare actuelle"}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Destination</Label>
                      <StationAutocomplete
                        value={newDestination}
                        onChange={setNewDestination}
                        placeholder="Ex: Lyon"
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
                </TabsContent>
              </Tabs>

              {/* Train selection - tiles or list (only if showTilesInCard) */}
              {showTilesInCard && currentTrains.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Trains préparés ({currentTrains.length}) – Cliquer pour sélectionner
                  </Label>
                  
                  {showTiles ? (
                    <TrainTileSelector
                      trains={currentTrains}
                      selectedId={selectedTrainId}
                      onSelect={handleSelectTrain}
                      onRemove={(id) => handleRemoveTrain(id, activeTab)}
                    />
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {currentTrains.map((train) => (
                        <motion.div
                          key={train.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg transition-colors",
                            selectedTrainId === train.id 
                              ? "bg-primary/10 border-2 border-primary" 
                              : "bg-muted/50 hover:bg-muted"
                          )}
                        >
                          <button
                            onClick={() => handleSelectTrain(train)}
                            className="flex-1 text-left p-1"
                          >
                            <div className="flex items-center gap-2">
                              <Train className="h-4 w-4 text-primary" />
                              <span className="font-medium">{train.trainNumber}</span>
                              {train.time && (
                                <span className="text-xs text-muted-foreground">
                                  {train.time}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {train.origin && train.destination 
                                ? `${train.origin} → ${train.destination}`
                                : train.origin || train.destination || 'Trajet non défini'}
                            </div>
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTrain(train.id, activeTab)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showTilesInCard && currentTrains.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun train préparé. Ajoutez des trains pour préparer votre mission.
                </p>
              )}

              {/* Clear all button */}
              {totalTrains > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Effacer toute la mission
                </Button>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
