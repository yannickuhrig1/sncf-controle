import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Train,
  MapPin,
  ArrowRight,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTrainLookup, type TrainInfo } from '@/hooks/useTrainLookup';

// ── Types ───────────────────────────────────────────────────────────────────────

interface WatchedLine {
  id: string;
  team_id: string | null;
  label: string;
  origin: string;
  destination: string;
  train_numbers: string[];
  priority: 'high' | 'medium' | 'low';
  notes: string;
  color: string;
  created_by: string | null;
  created_at: string;
}

const PRIORITY_CONFIG = {
  high:   { label: 'Haute',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
  medium: { label: 'Moyenne', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  low:    { label: 'Basse',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', dot: 'bg-green-500' },
};

const LINE_COLORS = [
  { value: '#3b82f6', label: 'Bleu',   cls: 'bg-blue-500' },
  { value: '#ef4444', label: 'Rouge',  cls: 'bg-red-500' },
  { value: '#8b5cf6', label: 'Violet', cls: 'bg-violet-500' },
  { value: '#f97316', label: 'Orange', cls: 'bg-orange-500' },
  { value: '#10b981', label: 'Vert',   cls: 'bg-emerald-500' },
  { value: '#ec4899', label: 'Rose',   cls: 'bg-pink-500' },
  { value: '#6366f1', label: 'Indigo', cls: 'bg-indigo-500' },
  { value: '#14b8a6', label: 'Teal',   cls: 'bg-teal-500' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────────

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// ── Train Schedule Card ─────────────────────────────────────────────────────────

function TrainScheduleCard({ trainNumber, info, isLoading }: {
  trainNumber: string;
  info: TrainInfo | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 animate-pulse">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Train {trainNumber}...</span>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20">
        <Train className="h-4 w-4 text-muted-foreground/50" />
        <span className="text-sm text-muted-foreground/70">Train {trainNumber}</span>
      </div>
    );
  }

  const now = nowMinutes();
  const depMin = timeToMinutes(info.departureTime);
  const isPast = depMin < now - 10;
  const isSoon = !isPast && depMin <= now + 30;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
      info.status === 'cancelled'
        ? 'bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-800'
        : isPast
          ? 'bg-muted/30 border-muted-foreground/10 opacity-60'
          : isSoon
            ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 ring-1 ring-amber-300/50'
            : 'bg-card border-border'
    }`}>
      {/* Time */}
      <div className="w-12 shrink-0 text-center">
        {info.status === 'delayed' && info.delayMinutes ? (
          <>
            <div className="text-[10px] text-muted-foreground line-through tabular-nums">{info.departureTime}</div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {(() => { const m = depMin + info.delayMinutes; return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; })()}
            </div>
          </>
        ) : (
          <div className={`text-sm font-bold tabular-nums ${info.status === 'cancelled' ? 'text-red-500 line-through' : ''}`}>
            {info.departureTime}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className={`w-0.5 h-8 rounded-full shrink-0 ${
        info.status === 'cancelled' ? 'bg-red-300 dark:bg-red-700'
        : isSoon ? 'bg-amber-400 dark:bg-amber-600'
        : 'bg-muted-foreground/20'
      }`} />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate">{info.trainNumber}</span>
          {info.trainType && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">{info.trainType}</Badge>
          )}
          {info.status === 'cancelled' && (
            <Badge className="text-[9px] px-1 py-0 h-4 bg-red-500 text-white shrink-0">Supprimé</Badge>
          )}
          {info.status === 'delayed' && info.delayMinutes && (
            <Badge className="text-[9px] px-1 py-0 h-4 bg-amber-500 text-white shrink-0">+{info.delayMinutes} min</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {info.origin} → {info.destination}
        </div>
      </div>

      {/* Arrival */}
      {info.arrivalTime && (
        <div className="text-right shrink-0">
          <div className="text-[10px] text-muted-foreground">Arr.</div>
          <div className="text-xs font-medium tabular-nums">{info.arrivalTime}</div>
        </div>
      )}
    </div>
  );
}

// ── Timeline Bar ────────────────────────────────────────────────────────────────

function TimelineBar({ trainInfos, color }: { trainInfos: { time: string; status: string }[]; color: string }) {
  const startH = 5, endH = 23;
  const totalMin = (endH - startH) * 60;
  const now = nowMinutes();
  const nowPct = Math.max(0, Math.min(100, ((now - startH * 60) / totalMin) * 100));

  const hours = [];
  for (let h = startH; h <= endH; h += 2) hours.push(h);

  return (
    <div className="relative w-full h-10 mt-2 mb-1">
      {/* Background track */}
      <div className="absolute inset-x-0 top-4 h-1.5 rounded-full bg-muted/60" />

      {/* Hour marks */}
      {hours.map(h => {
        const pct = ((h - startH) * 60 / totalMin) * 100;
        return (
          <div key={h} className="absolute" style={{ left: `${pct}%` }}>
            <div className="absolute top-3 w-px h-3 bg-muted-foreground/20" style={{ transform: 'translateX(-50%)' }} />
            <span className="absolute top-7 text-[9px] text-muted-foreground tabular-nums" style={{ transform: 'translateX(-50%)' }}>{h}h</span>
          </div>
        );
      })}

      {/* Train dots */}
      {trainInfos.map((t, i) => {
        const min = timeToMinutes(t.time);
        const pct = ((min - startH * 60) / totalMin) * 100;
        if (pct < 0 || pct > 100) return null;
        const isPast = min < now - 10;
        return (
          <div
            key={i}
            className={`absolute top-3 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm transition-all ${
              t.status === 'cancelled' ? 'bg-red-500'
              : isPast ? 'bg-muted-foreground/30'
              : 'shadow-md'
            }`}
            style={{
              left: `${pct}%`,
              transform: 'translate(-50%, -25%)',
              backgroundColor: t.status === 'cancelled' ? undefined : isPast ? undefined : color,
            }}
            title={`${t.time} — ${t.status === 'cancelled' ? 'Supprimé' : t.status === 'delayed' ? 'Retardé' : 'À l\'heure'}`}
          />
        );
      })}

      {/* Now indicator */}
      <div
        className="absolute top-1.5 w-0.5 h-5 bg-foreground/70 rounded-full z-10"
        style={{ left: `${nowPct}%`, transform: 'translateX(-50%)' }}
      />
    </div>
  );
}

// ── Line Card ───────────────────────────────────────────────────────────────────

function LineCard({
  line,
  canManage,
  onEdit,
  onDelete,
}: {
  line: WatchedLine;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [trainInfoMap, setTrainInfoMap] = useState<Record<string, TrainInfo | null>>({});
  const [loadingTrains, setLoadingTrains] = useState<Set<string>>(new Set());
  const { lookup } = useTrainLookup();
  const prio = PRIORITY_CONFIG[line.priority];
  const today = new Date().toISOString().split('T')[0];

  const loadTrainInfos = async () => {
    const toLoad = line.train_numbers.filter(n => !(n in trainInfoMap));
    if (toLoad.length === 0) return;

    setLoadingTrains(new Set(toLoad));
    const results: Record<string, TrainInfo | null> = {};
    await Promise.allSettled(
      toLoad.map(async (num) => {
        try {
          const info = await lookup(num, today);
          results[num] = info;
        } catch {
          results[num] = null;
        }
      })
    );
    setTrainInfoMap(prev => ({ ...prev, ...results }));
    setLoadingTrains(new Set());
  };

  useEffect(() => {
    if (expanded && line.train_numbers.length > 0) {
      loadTrainInfos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Timeline data from loaded train info
  const timelineData = useMemo(() => {
    return line.train_numbers
      .map(num => {
        const info = trainInfoMap[num];
        if (!info) return null;
        return { time: info.departureTime, status: info.status };
      })
      .filter(Boolean) as { time: string; status: string }[];
  }, [trainInfoMap, line.train_numbers]);

  // Next train
  const nextTrain = useMemo(() => {
    const now = nowMinutes();
    let closest: { num: string; info: TrainInfo; diff: number } | null = null;
    for (const num of line.train_numbers) {
      const info = trainInfoMap[num];
      if (!info || info.status === 'cancelled') continue;
      const dep = timeToMinutes(info.departureTime);
      const diff = dep - now;
      if (diff >= -5 && (!closest || diff < closest.diff)) {
        closest = { num, info, diff };
      }
    }
    return closest;
  }, [trainInfoMap, line.train_numbers]);

  const trainCount = line.train_numbers.length;

  return (
    <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
      {/* Color accent bar */}
      <div className="h-1.5" style={{ backgroundColor: line.color }} />

      <CardContent className="p-0">
        {/* Header */}
        <button
          type="button"
          className="w-full text-left p-4 pb-3 flex items-start gap-3"
          onClick={() => setExpanded(v => !v)}
        >
          {/* Priority dot */}
          <div className={`mt-1.5 h-3 w-3 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-card ${prio.dot}`} />

          <div className="flex-1 min-w-0">
            {/* Label */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate">{line.label}</h3>
              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${prio.color}`}>{prio.label}</Badge>
            </div>

            {/* Route */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{line.origin}</span>
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="truncate">{line.destination}</span>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Train className="h-3 w-3" />
                {trainCount} train{trainCount !== 1 ? 's' : ''}
              </span>
              {nextTrain && (
                <span className="flex items-center gap-1 text-foreground font-medium">
                  <Clock className="h-3 w-3" />
                  Prochain : {nextTrain.info.departureTime}
                  {nextTrain.diff <= 30 && nextTrain.diff >= 0 && (
                    <Badge className="text-[9px] px-1 py-0 h-4 bg-amber-500 text-white ml-1">
                      {nextTrain.diff < 1 ? 'Imminent' : `dans ${nextTrain.diff} min`}
                    </Badge>
                  )}
                </span>
              )}
            </div>

            {/* Timeline preview (only if we have data) */}
            {timelineData.length > 0 && (
              <TimelineBar trainInfos={timelineData} color={line.color} />
            )}
          </div>

          {/* Expand arrow */}
          <div className="shrink-0 mt-1">
            {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
            {/* Notes */}
            {line.notes && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <p className="text-muted-foreground">{line.notes}</p>
              </div>
            )}

            {/* Train list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Horaires du jour</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); setTrainInfoMap({}); setTimeout(loadTrainInfos, 50); }}
                >
                  <RefreshCw className="h-3 w-3" />
                  Actualiser
                </Button>
              </div>

              {line.train_numbers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun train configuré</p>
              ) : (
                <div className="space-y-1.5">
                  {line.train_numbers.map(num => (
                    <TrainScheduleCard
                      key={num}
                      trainNumber={num}
                      info={trainInfoMap[num] ?? null}
                      isLoading={loadingTrains.has(num)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Actions (managers only) */}
            {canManage && (
              <>
                <Separator />
                <div className="flex items-center gap-2 justify-end">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={onEdit}>
                    <Pencil className="h-3 w-3" /> Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-destructive hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Create / Edit Dialog ────────────────────────────────────────────────────────

interface LineFormData {
  label: string;
  origin: string;
  destination: string;
  train_numbers: string;
  priority: 'high' | 'medium' | 'low';
  notes: string;
  color: string;
  team_id: string;
}

const EMPTY_FORM: LineFormData = {
  label: '',
  origin: '',
  destination: '',
  train_numbers: '',
  priority: 'medium',
  notes: '',
  color: '#3b82f6',
  team_id: '',
};

function LineFormDialog({
  open,
  onOpenChange,
  editLine,
  teams,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editLine: WatchedLine | null;
  teams: { id: string; name: string }[];
  onSave: (data: LineFormData) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<LineFormData>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (editLine) {
        setForm({
          label: editLine.label,
          origin: editLine.origin,
          destination: editLine.destination,
          train_numbers: editLine.train_numbers.join(', '),
          priority: editLine.priority,
          notes: editLine.notes || '',
          color: editLine.color || '#3b82f6',
          team_id: editLine.team_id || '',
        });
      } else {
        setForm({ ...EMPTY_FORM, team_id: teams[0]?.id || '' });
      }
    }
  }, [open, editLine, teams]);

  const isValid = form.label.trim() && form.origin.trim() && form.destination.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editLine ? 'Modifier la ligne' : 'Nouvelle ligne à surveiller'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="line-label">Nom de la ligne</Label>
            <Input
              id="line-label"
              placeholder="Ex : Metz — Thionville"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="line-origin">Origine</Label>
              <Input
                id="line-origin"
                placeholder="Gare de départ"
                value={form.origin}
                onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="line-dest">Destination</Label>
              <Input
                id="line-dest"
                placeholder="Gare d'arrivée"
                value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="line-trains">Numéros de train (séparés par des virgules)</Label>
            <Input
              id="line-trains"
              placeholder="Ex : 830612, 830614, 830616"
              value={form.train_numbers}
              onChange={e => setForm(f => ({ ...f, train_numbers: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Les horaires seront récupérés automatiquement via l'API SNCF</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priorité</Label>
              <Select value={form.priority} onValueChange={(v: 'high' | 'medium' | 'low') => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Couleur</Label>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {LINE_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    className={`h-7 w-7 rounded-full transition-all ${c.cls} ${form.color === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100'}`}
                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                  />
                ))}
              </div>
            </div>
          </div>

          {teams.length > 1 && (
            <div>
              <Label>Équipe</Label>
              <Select value={form.team_id} onValueChange={(v) => setForm(f => ({ ...f, team_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une équipe" /></SelectTrigger>
                <SelectContent>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="line-notes">Notes (optionnel)</Label>
            <Input
              id="line-notes"
              placeholder="Remarques, consignes particulières..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => onSave(form)} disabled={!isValid || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editLine ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function WatchedLines() {
  const { profile, isManager, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const canManage = isManager() || isAdmin();

  const [formOpen, setFormOpen] = useState(false);
  const [editLine, setEditLine] = useState<WatchedLine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WatchedLine | null>(null);

  // Fetch teams for the current user
  const { data: teams = [] } = useQuery({
    queryKey: ['watched-lines-teams', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      if (isAdmin()) {
        const { data } = await supabase.from('teams').select('id, name').order('name');
        return data || [];
      }
      const { data } = await supabase.from('teams').select('id, name').order('name');
      return data || [];
    },
    enabled: !!profile,
  });

  // Fetch watched lines
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['watched-lines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watched_lines' as any)
        .select('*')
        .order('priority')
        .order('label');
      if (error) throw error;
      return (data || []) as unknown as WatchedLine[];
    },
    enabled: !!profile,
  });

  // Create / Update mutation
  const saveLine = useMutation({
    mutationFn: async (form: LineFormData & { id?: string }) => {
      const trainNums = form.train_numbers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        label: form.label.trim(),
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        train_numbers: trainNums,
        priority: form.priority,
        notes: form.notes.trim(),
        color: form.color,
        team_id: form.team_id || null,
      };

      if (form.id) {
        const { error } = await supabase
          .from('watched_lines' as any)
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('watched_lines' as any)
          .insert({ ...payload, created_by: profile?.user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-lines'] });
      toast.success(editLine ? 'Ligne modifiée' : 'Ligne ajoutée');
      setFormOpen(false);
      setEditLine(null);
    },
    onError: (err) => toast.error('Erreur : ' + (err as Error).message),
  });

  // Delete mutation
  const deleteLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('watched_lines' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-lines'] });
      toast.success('Ligne supprimée');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error('Erreur : ' + (err as Error).message),
  });

  // Priority order for sorting
  const sortedLines = useMemo(() => {
    const prioOrder = { high: 0, medium: 1, low: 2 };
    return [...lines].sort((a, b) => prioOrder[a.priority] - prioOrder[b.priority]);
  }, [lines]);

  // Group by team
  const teamMap = useMemo(() => {
    const map = new Map<string, { name: string; lines: WatchedLine[] }>();
    for (const line of sortedLines) {
      const tid = line.team_id || '_none';
      if (!map.has(tid)) {
        const team = teams.find(t => t.id === tid);
        map.set(tid, { name: team?.name || 'Sans équipe', lines: [] });
      }
      map.get(tid)!.lines.push(line);
    }
    return map;
  }, [sortedLines, teams]);

  const showTeamHeaders = teamMap.size > 1;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Eye className="h-6 w-6" />
                Lignes à surveiller
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lines.length} ligne{lines.length !== 1 ? 's' : ''} configurée{lines.length !== 1 ? 's' : ''}
              </p>
            </div>
            {canManage && (
              <Button
                onClick={() => { setEditLine(null); setFormOpen(true); }}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </Button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : lines.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <Eye className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Aucune ligne configurée</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {canManage
                    ? 'Ajoutez des lignes à surveiller pour votre équipe. Les horaires seront récupérés automatiquement.'
                    : 'Votre manager n\'a pas encore configuré de lignes à surveiller.'}
                </p>
                {canManage && (
                  <Button className="mt-6 gap-1.5" onClick={() => { setEditLine(null); setFormOpen(true); }}>
                    <Plus className="h-4 w-4" />
                    Ajouter une ligne
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {showTeamHeaders ? (
                Array.from(teamMap.entries()).map(([tid, group]) => (
                  <div key={tid} className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <div className="h-px flex-1 bg-border" />
                      {group.name}
                      <div className="h-px flex-1 bg-border" />
                    </h2>
                    {group.lines.map(line => (
                      <LineCard
                        key={line.id}
                        line={line}
                        canManage={canManage}
                        onEdit={() => { setEditLine(line); setFormOpen(true); }}
                        onDelete={() => setDeleteTarget(line)}
                      />
                    ))}
                  </div>
                ))
              ) : (
                sortedLines.map(line => (
                  <LineCard
                    key={line.id}
                    line={line}
                    canManage={canManage}
                    onEdit={() => { setEditLine(line); setFormOpen(true); }}
                    onDelete={() => setDeleteTarget(line)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <LineFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editLine={editLine}
        teams={teams}
        onSave={(data) => saveLine.mutate({ ...data, id: editLine?.id })}
        isSaving={saveLine.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette ligne ?</AlertDialogTitle>
            <AlertDialogDescription>
              La ligne « {deleteTarget?.label} » sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteLine.mutate(deleteTarget.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
