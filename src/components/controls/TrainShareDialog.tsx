import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Users, LogOut, QrCode, Link2Off, Camera, X } from 'lucide-react';
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
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanLoopRef = useRef<number | null>(null);

  useEffect(() => {
    if (!session?.code) { setQrDataUrl(null); return; }
    const joinUrl = `${window.location.origin}/onboard?join=${session.code}`;
    QRCode.toDataURL(joinUrl, { width: 180, margin: 1, color: { dark: '#000', light: '#fff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [session?.code]);

  useEffect(() => {
    if (open && session) onRefreshCount();
  }, [open]);

  // Stop camera when dialog closes or session is joined
  useEffect(() => {
    if (!open || session) stopScan();
  }, [open, session]);

  const stopScan = useCallback(() => {
    if (scanLoopRef.current) { cancelAnimationFrame(scanLoopRef.current); scanLoopRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanning(false);
    setScanError(null);
  }, []);

  const startScan = async () => {
    setScanError(null);
    try {
      // Check BarcodeDetector support
      if (!('BarcodeDetector' in window)) {
        setScanError('Scanner non disponible sur ce navigateur. Saisir le code manuellement.');
        return;
      }
      // Afficher la vidéo AVANT d'attacher le stream pour que videoRef.current soit dans le DOM
      setScanning(true);
      await new Promise(r => setTimeout(r, 50)); // laisser React re-rendre
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      detectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      scanFrame();
    } catch {
      setScanError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  };

  const scanFrame = async () => {
    if (!videoRef.current || !detectorRef.current) return;
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        const raw: string = barcodes[0].rawValue;
        // Extract 6-char code from URL or use raw value directly
        const urlMatch = raw.match(/[?&]join=([A-Z2-9]{6})/i);
        const code = urlMatch ? urlMatch[1].toUpperCase() : raw.toUpperCase().trim();
        if (/^[A-Z2-9]{6}$/.test(code)) {
          stopScan();
          setJoinCode(code);
          // Auto-join
          const ok = await onJoinSession(code);
          if (ok) {
            setJoinCode('');
            toast.success('Session rejointe !');
            setTimeout(() => window.location.reload(), 500);
          }
          return;
        }
      }
    } catch { /* continue */ }
    scanLoopRef.current = requestAnimationFrame(scanFrame);
  };

  const handleCopy = () => {
    if (!session?.code) return;
    navigator.clipboard.writeText(session.code);
    toast.success('Code copié !');
  };

  const handleCreate = async () => { await onCreateSession(); };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    const ok = await onJoinSession(joinCode);
    if (ok) {
      setJoinCode('');
      toast.success('Session rejointe !');
      setTimeout(() => window.location.reload(), 500);
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
                <Button
                  size="icon"
                  variant="outline"
                  onClick={scanning ? stopScan : startScan}
                  title={scanning ? 'Arrêter le scan' : 'Scanner un QR code'}
                  disabled={isLoading}
                >
                  {scanning ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                </Button>
                <Button onClick={handleJoin} disabled={isLoading || joinCode.length < 6}>
                  {isLoading ? '…' : 'Rejoindre'}
                </Button>
              </div>

              {/* Viewfinder */}
              {scanning && (
                <div className="relative rounded-lg overflow-hidden border bg-black">
                  <video ref={videoRef} className="w-full h-40 object-cover" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-28 h-28 border-2 border-white/70 rounded-lg" />
                  </div>
                  <p className="absolute bottom-1 w-full text-center text-[10px] text-white/80">
                    Pointez le QR code vers la caméra
                  </p>
                </div>
              )}
              {scanError && (
                <p className="text-xs text-destructive">{scanError}</p>
              )}
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
