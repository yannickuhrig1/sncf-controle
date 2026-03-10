import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Users, LogOut, QrCode, Link2Off } from 'lucide-react';
import { toast } from 'sonner';
import type { TrainShareSession } from '@/hooks/useTrainShareSession';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TrainShareSession | null;
  isLoading: boolean;
  error: string | null;
  onCreateSession: () => Promise<string | null>;
  onJoinSession: (code: string) => Promise<boolean>;
  onLeaveSession: () => Promise<void>;
  onRefreshCount: () => void;
}

export function TrainShareDialog({
  open, onOpenChange, session, isLoading, error,
  onCreateSession, onJoinSession, onLeaveSession, onRefreshCount,
}: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!session?.code) { setQrDataUrl(null); return; }
    QRCode.toDataURL(session.code, { width: 180, margin: 1, color: { dark: '#000', light: '#fff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [session?.code]);

  useEffect(() => {
    if (open && session) onRefreshCount();
  }, [open]);

  const handleCopy = () => {
    if (!session?.code) return;
    navigator.clipboard.writeText(session.code);
    toast.success('Code copié !');
  };

  const handleCreate = async () => {
    await onCreateSession();
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    const ok = await onJoinSession(joinCode);
    if (ok) {
      setJoinCode('');
      toast.success('Session rejointe !');
    }
  };

  const handleLeave = async () => {
    await onLeaveSession();
    toast.info('Session quittée');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Partage de trains du jour
          </DialogTitle>
          <DialogDescription>
            Partagez vos trains avec votre équipe via un code privé.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
        )}

        {!session ? (
          <div className="space-y-4">
            {/* Créer une session */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Créer une session</p>
              <p className="text-xs text-muted-foreground">
                Générez un code que vos collègues pourront utiliser pour rejoindre.
              </p>
              <Button className="w-full" onClick={handleCreate} disabled={isLoading}>
                {isLoading ? 'Création…' : 'Créer une session de partage'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">ou</span>
              <Separator className="flex-1" />
            </div>

            {/* Rejoindre une session */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Rejoindre une session</p>
              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="Code à 6 caractères"
                  className="font-mono tracking-widest uppercase"
                  maxLength={6}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
                <Button onClick={handleJoin} disabled={isLoading || joinCode.length < 6}>
                  {isLoading ? '…' : 'Rejoindre'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Code actif */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {session.isOwner ? 'Votre session' : 'Session rejointe'}
                </p>
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {session.memberCount} membre{session.memberCount !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-md px-4 py-2 text-center font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                  {session.code}
                </div>
                <Button size="icon" variant="outline" onClick={handleCopy} title="Copier le code">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {qrDataUrl && (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <QrCode className="h-3 w-3" />
                    Scanner pour rejoindre
                  </div>
                  <img src={qrDataUrl} alt="QR code" className="rounded-lg border w-[180px] h-[180px]" />
                </div>
              )}

              {!session.isOwner && (
                <p className="text-xs text-muted-foreground text-center">
                  Vous voyez les trains partagés par le créateur de la session.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {session && (
            <Button variant="destructive" size="sm" className="gap-2" onClick={handleLeave} disabled={isLoading}>
              {session.isOwner ? <Link2Off className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
              {session.isOwner ? 'Fermer la session' : 'Quitter la session'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
