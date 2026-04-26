import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, ArrowUpFromLine, Building2, Clock, Loader2, MapPin, Train,
  Trash2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServiceDays, type ServiceDayRow } from '@/hooks/useServiceDays';
import {
  getControlTrains, groupTrainsByDepartureStation, resolveStationName,
  type ServiceItem,
} from '@/lib/pacificWebParser';

export default function ServiceDayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getServiceDay, deleteServiceDay } = useServiceDays();

  const [day, setDay] = useState<ServiceDayRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setIsLoading(true);
    getServiceDay(id).then((d) => {
      if (cancelled) return;
      setDay(d);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, getServiceDay]);

  const stationGroups = useMemo(() => {
    if (!day) return new Map<string, ServiceItem[]>();
    return groupTrainsByDepartureStation(day.items);
  }, [day]);

  const trains = useMemo(() => (day ? getControlTrains(day.items) : []), [day]);

  // Build a navigation URL for "Contrôle À bord" pre-filled with this train's
  // metadata. The /onboard page will read query params (`train`, `from`, `to`,
  // `time`) to pre-fill its form fields if present.
  const buildOnboardHref = (item: ServiceItem) => {
    const params = new URLSearchParams();
    if (item.trainNumber) params.set('train', item.trainNumber);
    if (item.departureStation) params.set('from', resolveStationName(item.departureStation));
    if (item.arrivalStation) params.set('to', resolveStationName(item.arrivalStation));
    if (item.departureTime) params.set('time', item.departureTime);
    return `/onboard?${params.toString()}`;
  };

  // Build a navigation URL for "Contrôle En gare → Embarquement" pre-filled
  // with the station and the trains belonging to it. We pre-create an
  // embarkment mission via query string and let StationControl handle the
  // actual save.
  const buildEmbarkmentHref = (stationCode: string) => {
    const params = new URLSearchParams();
    params.set('mode', 'embarkment');
    params.set('station', resolveStationName(stationCode));
    // Trains payload is base64-encoded JSON to avoid URL-escaping headaches.
    const trainsForStation = stationGroups.get(stationCode) ?? [];
    const payload = trainsForStation.map(t => ({
      trainNumber: t.trainNumber,
      origin: resolveStationName(t.departureStation),
      destination: resolveStationName(t.arrivalStation),
      departureTime: t.departureTime,
    }));
    if (payload.length) {
      try {
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        params.set('seed', b64);
      } catch {
        // If encoding fails for any reason, the StationControl page will
        // still open with just the station prefilled.
      }
    }
    return `/station?${params.toString()}`;
  };

  const handleDelete = async () => {
    if (!day) return;
    const ok = await deleteServiceDay(day.id);
    if (ok) navigate('/');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!day) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />Retour
          </Button>
          <Card>
            <CardContent className="py-10 flex flex-col items-center gap-2 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Journée introuvable.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const dateLabel = format(parseISO(day.service_date), 'EEEE dd MMMM yyyy', { locale: fr });

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />Retour
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}
          className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />Supprimer
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Train className="h-5 w-5" />
                Journée {day.code_journee}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{dateLabel}</p>
            </div>
            <Badge variant="secondary">{trains.length} train{trains.length > 1 ? 's' : ''}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted/50 py-2">
              <p className="text-lg font-bold">{trains.length}</p>
              <p className="text-[10px] text-muted-foreground">Trains</p>
            </div>
            <div className="rounded-md bg-muted/50 py-2">
              <p className="text-lg font-bold">{stationGroups.size}</p>
              <p className="text-[10px] text-muted-foreground">Gares</p>
            </div>
            <div className="rounded-md bg-muted/50 py-2">
              <p className="text-lg font-bold">{day.items.length}</p>
              <p className="text-[10px] text-muted-foreground">Activités</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-station blocks: each shows its trains and the "Démarrer
          embarquement" shortcut. */}
      {Array.from(stationGroups.entries()).map(([code, stationTrains]) => (
        <Card key={code}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {resolveStationName(code)}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {stationTrains.length} train{stationTrains.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={() => navigate(buildEmbarkmentHref(code))}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Démarrer embarquement
            </Button>
            <ul className="space-y-1.5">
              {stationTrains.map((t, idx) => (
                <li key={idx}
                  className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-sm">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs shrink-0">{t.departureTime}</span>
                  <ArrowLeft className="h-3 w-3 rotate-180 text-muted-foreground shrink-0" />
                  <span className="text-xs flex-1 truncate">
                    {resolveStationName(t.arrivalStation)}
                    <span className="text-muted-foreground"> · {t.arrivalTime}</span>
                  </span>
                  <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                    {t.trainNumber}
                  </Badge>
                  <Button size="sm" variant="ghost"
                    className="h-7 px-2 text-[11px] shrink-0"
                    onClick={() => navigate(buildOnboardHref(t))}>
                    À bord
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {/* Other (non-EA) activities: PS / Ecritures / FS — listed for context. */}
      {day.items.some(i => i.nature !== 'EA') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Autres activités</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {day.items.filter(i => i.nature !== 'EA').map((i, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] uppercase shrink-0">{i.nature}</Badge>
                  <span className="font-mono">{i.departureTime || '—'}</span>
                  <span>{resolveStationName(i.departureStation) || '—'}</span>
                  <span>→</span>
                  <span>{resolveStationName(i.arrivalStation) || '—'}</span>
                  <span className="font-mono">{i.arrivalTime || '—'}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette journée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les contrôles déjà créés depuis cette journée ne seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AppLayout>
  );
}
