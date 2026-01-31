import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Loader2, ZoomIn, ZoomOut, RotateCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  onDownload: () => void;
  title?: string;
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  onDownload,
  title = 'Prévisualisation PDF',
}: PdfPreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (open && pdfUrl) {
      setIsLoading(true);
      setLoadError(false);
      // Set a timeout to show the PDF or fall back
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [open, pdfUrl]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const handleDownloadAndClose = () => {
    onDownload();
    onOpenChange(false);
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="truncate">{title}</DialogTitle>
              <DialogDescription>
                Vérifiez le contenu avant de télécharger
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium w-10 text-center">{zoom}%</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleResetZoom}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleOpenInNewTab}
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Génération du PDF...</span>
              </div>
            </div>
          )}
          {pdfUrl && (
            <div
              className={cn(
                'h-full w-full transition-opacity',
                isLoading && 'opacity-0'
              )}
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
              }}
            >
              <object
                data={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                type="application/pdf"
                className="w-full h-full min-h-[65vh]"
              >
                {/* Fallback for browsers that don't support PDF in object */}
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <p className="text-muted-foreground">
                    Votre navigateur ne peut pas afficher la prévisualisation PDF directement.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleOpenInNewTab} variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ouvrir dans un nouvel onglet
                    </Button>
                    <Button onClick={handleDownloadAndClose}>
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              </object>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Fermer
          </Button>
          <Button onClick={handleDownloadAndClose}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
