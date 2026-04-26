import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QRCodeScannerProps {
  /** Called when a QR code is successfully decoded. */
  onScan: (decodedText: string) => void;
  /** Called when the user cancels or scanning fails fatally. */
  onError?: (message: string) => void;
}

/**
 * Camera-based QR scanner using html5-qrcode (loaded lazily so it's not in
 * the main bundle). Exposes a single video preview + status overlay.
 */
export function QRCodeScanner({ onScan, onError }: QRCodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  // Keep refs in sync so the scanner callback closure stays stable.
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    let cancelled = false;
    const elementId = 'qr-scanner-region';

    (async () => {
      try {
        const mod = await import('html5-qrcode');
        if (cancelled) return;

        // Wait one tick for the container div to mount with the right id
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (cancelled) return;

        const Html5Qrcode = mod.Html5Qrcode;
        const scanner = new Html5Qrcode(elementId, /* verbose */ false);

        // Adapter to match the ref shape we keep so tear-down logic stays simple.
        scannerRef.current = {
          stop: async () => {
            try { await scanner.stop(); } catch { /* already stopped */ }
          },
          clear: () => {
            try { scanner.clear(); } catch { /* element might already be gone */ }
          },
        };

        let alreadyHandled = false;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            if (alreadyHandled) return;
            alreadyHandled = true;
            // Stop the camera before notifying — avoids double-fire and frees the device.
            scanner.stop().catch(() => undefined).finally(() => {
              onScanRef.current(decodedText);
            });
          },
          // We deliberately ignore per-frame "no QR detected" errors — they're noisy.
          () => undefined
        );

        if (!cancelled) setStatus('ready');
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Erreur caméra';
        const friendly =
          /permission|denied|notallowed/i.test(msg)
            ? "Accès caméra refusé. Autorisez l'accès dans les réglages du navigateur."
            : /notfound|no.*camera|no.*device/i.test(msg)
              ? "Aucune caméra détectée sur cet appareil."
              : msg;
        setErrorMessage(friendly);
        setStatus('error');
        onErrorRef.current?.(friendly);
      }
    })();

    return () => {
      cancelled = true;
      const ref = scannerRef.current;
      scannerRef.current = null;
      if (ref) {
        ref.stop().finally(() => ref.clear());
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden bg-black">
        <div id="qr-scanner-region" ref={containerRef} className="w-full h-full" />
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs">Démarrage de la caméra…</span>
          </div>
        )}
        {status === 'ready' && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-2 text-white text-xs bg-black/50 rounded-md px-2 py-1">
            <Camera className="h-3 w-3" />
            <span>Visez le QR code</span>
          </div>
        )}
      </div>
      {status === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
