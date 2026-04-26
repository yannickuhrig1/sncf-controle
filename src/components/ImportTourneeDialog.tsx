import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle, ChevronRight, Clock, History, Loader2, MapPin, Train, Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parsePacificWebTournee, getControlTrains, groupTrainsByDepartureStation, resolveStationName,
  type ServiceItem,
} from '@/lib/pacificWebParser';
import { useServiceDays, type ServiceDayRow } from '@/hooks/useServiceDays';
import { toast } from 'sonner';

interface ImportTourneeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional default date (YYYY-MM-DD). Defaults to today. */
  defaultDate?: string;
}

type StepId = 'input' | 'preview';

export function ImportTourneeDialog({ open, onOpenChange, defaultDate }: ImportTourneeDialogProps) {
  const navigate = useNavigate();
  const { createServiceDay, findPriorByCode, isSaving } = useServiceDays();

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [step, setStep] = useState<StepId>('input');
  const [codeJournee, setCodeJournee] = useState('');
  const [serviceDate, setServiceDate] = useState<string>(defaultDate || today);
  const [rawText, setRawText] = useState('');
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());

  // Reset all state when the dialog closes so reopening starts fresh.
  useEffect(() => {
    if (!open) {
      setStep('input');
      setCodeJournee('');
      setServiceDate(defaultDate || today);
      setRawText('');
      setSelectedStations(new Set());
    }
  }, [open, defaultDate, today]);

  // Live parse preview (cheap, the parser is pure).
  const parseResult = useMemo(() => parsePacificWebTournee(rawText), [rawText]);
  const controlTrains = useMemo(() => getControlTrains(parseResult.items), [parseResult.items]);
  const stationGroups = useMemo(() => groupTrainsByDepartureStation(parseResult.items), [parseResult.items]);

  // Suggest reuse: same code, prior date.
  const priorDays = useMemo(
    () => findPriorByCode(codeJournee, serviceDate),
    [codeJournee, serviceDate, findPriorByCode],
  );
  const mostRecentPrior = priorDays[0] ?? null;

  // Default station selection: all stations checked when entering preview.
  useEffect(() => {
    if (step === 'preview') {
      setSelectedStations(new Set(stationGroups.keys()));
    }
  }, [step, stationGroups]);

  const canPreview = codeJournee.trim().length > 0 && controlTrains.length > 0;

  const handleReuse = (prior: ServiceDayRow) => {
    setRawText(prior.raw_text || '');
    toast.success(`Pré-rempli depuis le ${format(parseISO(prior.service_date), 'dd/MM/yyyy', { locale: fr })}`);
  };

  const handleConfirmImport = async () => {
    const created = await createServiceDay({
      serviceDate,
      codeJournee: codeJournee.trim(),
      rawText,
      items: parseResult.items,
    });
    if (!created) return;
    onOpenChange(false);
    // Navigate to the day detail page so the agent can pick a train to start.
    navigate(`/service-day/${created.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importer une journée
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? "Saisissez le code de votre journée et collez/tapez la liste des activités depuis Pacific Web."
              : "Vérifiez les trains détectés, sélectionnez les gares à utiliser, puis confirmez."}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code-journee" className="text-xs">Code journée</Label>
                <Input
                  id="code-journee"
                  placeholder="Y001"
                  value={codeJournee}
                  onChange={(e) => setCodeJournee(e.target.value.toUpperCase())}
                  className="font-mono"
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service-date" className="text-xs">Date</Label>
                <Input
                  id="service-date"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>
            </div>

            {mostRecentPrior && (
              <Alert className="border-primary/30 bg-primary/5">
                <History className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    Journée <strong>{mostRecentPrior.code_journee}</strong> déjà importée le{' '}
                    {format(parseISO(mostRecentPrior.service_date), 'dd/MM/yyyy', { locale: fr })}.
                    Le contenu peut différer.
                  </span>
                  <Button size="sm" variant="outline" className="shrink-0 h-7 text-[11px]"
                    onClick={() => handleReuse(mostRecentPrior)}>
                    Pré-remplir
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="raw-text" className="text-xs">Activités de la journée</Label>
              <Textarea
                id="raw-text"
                placeholder={`Ex: collez le tableau Pacific Web\n\nEA  10:18 THL  LUX 10:45  88758\nEA  11:39 LUX  THL 12:03  88524\nEA  12:16 THL  BTG 12:34  88734`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Format flexible : copier-coller depuis Pacific Web ou saisie ligne par ligne. Les codes (THL, LUX, MZ…) sont reconnus automatiquement.
              </p>
            </div>

            {rawText.trim() && controlTrains.length === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Aucun train de contrôle (EA) détecté. Vérifiez que les lignes contiennent bien la nature, les horaires et le numéro de train.
                </AlertDescription>
              </Alert>
            )}

            {controlTrains.length > 0 && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <Train className="h-3.5 w-3.5" />
                <span><strong className="text-foreground">{controlTrains.length}</strong> train(s) à contrôler détecté(s) sur <strong className="text-foreground">{stationGroups.size}</strong> gare(s) de départ</span>
              </div>
            )}

            <DialogFooter className="pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button disabled={!canPreview} onClick={() => setStep('preview')}>
                Aperçu <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3 pt-1">
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {Array.from(stationGroups.entries()).map(([code, trains]) => {
                const isChecked = selectedStations.has(code);
                return (
                  <div key={code}
                    className={cn(
                      'rounded-md border p-2.5 transition-colors',
                      isChecked ? 'border-primary/50 bg-primary/5' : 'border-border bg-card',
                    )}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setSelectedStations(prev => {
                            const next = new Set(prev);
                            if (checked) next.add(code);
                            else next.delete(code);
                            return next;
                          });
                        }}
                      />
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-sm">{resolveStationName(code)}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {trains.length} train{trains.length > 1 ? 's' : ''}
                      </Badge>
                    </label>
                    <ul className="mt-2 ml-7 space-y-1">
                      {trains.map((t, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono">{t.departureTime}</span>
                          <span>→</span>
                          <span>{resolveStationName(t.arrivalStation)}</span>
                          <span className="ml-auto font-mono text-[10px]">N°{t.trainNumber}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {selectedStations.size === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Sélectionnez au moins une gare pour continuer.
                </AlertDescription>
              </Alert>
            )}

            <p className="text-[11px] text-muted-foreground">
              La journée sera enregistrée. Vous pourrez ensuite démarrer un contrôle À bord ou En gare directement depuis chaque train.
            </p>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('input')}>Retour</Button>
              <Button onClick={handleConfirmImport} disabled={isSaving || selectedStations.size === 0}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Import…</> : "Importer la journée"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
