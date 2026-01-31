import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  FileCode, 
  Mail, 
  Calendar as CalendarIcon,
  Download,
  BarChart3,
  Monitor,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  exportToPDF, 
  exportToHTML, 
  downloadHTML, 
  generateEmailContent, 
  openMailClient,
  downloadPDF,
  type ExportOptions,
} from '@/lib/exportUtils';
import { calculateStats, formatFraudRate } from '@/lib/stats';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useUserPreferences, type PdfOrientation } from '@/hooks/useUserPreferences';
import { PdfPreviewDialog } from './PdfPreviewDialog';

type Control = Database['public']['Tables']['controls']['Row'];

type DateFilterType = 'today' | 'week' | 'custom';
type ExportFormat = 'pdf' | 'html' | 'email';

interface ExportDialogProps {
  controls: Control[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ controls, open, onOpenChange }: ExportDialogProps) {
  const { preferences } = useUserPreferences();
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [includeStats, setIncludeStats] = useState(true);
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>(
    preferences?.pdf_orientation || 'auto'
  );
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<ReturnType<typeof exportToPDF> | null>(null);
  
  // Filter controls based on date selection
  const filteredControls = useMemo(() => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'today': {
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        return controls.filter(c => {
          const date = new Date(c.control_date);
          return date >= todayStart && date <= todayEnd;
        });
      }
      case 'week': {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        return controls.filter(c => {
          const date = new Date(c.control_date);
          return date >= weekStart && date <= weekEnd;
        });
      }
      case 'custom': {
        if (!customDateRange.from) return [];
        const start = startOfDay(customDateRange.from);
        const end = customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from);
        return controls.filter(c => {
          const date = new Date(c.control_date);
          return date >= start && date <= end;
        });
      }
      default:
        return controls;
    }
  }, [controls, dateFilter, customDateRange]);

  // Get date range string
  const getDateRangeString = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return format(now, 'dd MMMM yyyy', { locale: fr });
      case 'week':
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        return `${format(weekStart, 'dd MMM', { locale: fr })} - ${format(weekEnd, 'dd MMM yyyy', { locale: fr })}`;
      case 'custom':
        if (!customDateRange.from) return 'Sélectionnez une période';
        if (!customDateRange.to) return format(customDateRange.from, 'dd MMMM yyyy', { locale: fr });
        return `${format(customDateRange.from, 'dd MMM', { locale: fr })} - ${format(customDateRange.to, 'dd MMM yyyy', { locale: fr })}`;
      default:
        return '';
    }
  };

  const stats = useMemo(() => calculateStats(filteredControls), [filteredControls]);

  const getExportOptions = (): ExportOptions => ({
    controls: filteredControls,
    title: `Export des contrôles (${filteredControls.length} trains)`,
    dateRange: getDateRangeString(),
    includeStats,
    orientation: pdfOrientation,
  });

  const handlePreview = () => {
    if (filteredControls.length === 0) {
      toast.error('Aucun contrôle à exporter pour cette période');
      return;
    }

    try {
      const doc = exportToPDF(getExportOptions());
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      
      // Cleanup previous URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      setPdfDoc(doc);
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (error) {
      toast.error("Erreur lors de la génération du PDF");
      console.error('Preview error:', error);
    }
  };

  const handleDownloadFromPreview = () => {
    if (pdfDoc) {
      downloadPDF(pdfDoc, `controles-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
      toast.success('PDF téléchargé avec succès');
    }
  };

  const handleClosePreview = (isOpen: boolean) => {
    if (!isOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPdfDoc(null);
    }
    setShowPreview(isOpen);
  };

  const handleExport = () => {
    if (filteredControls.length === 0) {
      toast.error('Aucun contrôle à exporter pour cette période');
      return;
    }

    const options = getExportOptions();

    try {
      switch (exportFormat) {
        case 'pdf':
          const doc = exportToPDF(options);
          downloadPDF(doc, `controles-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
          toast.success('PDF généré avec succès');
          break;
        case 'html':
          const html = exportToHTML(options);
          downloadHTML(html, `controles-${format(new Date(), 'yyyy-MM-dd')}.html`);
          toast.success('Fichier HTML téléchargé');
          break;
        case 'email':
          const email = generateEmailContent(options);
          openMailClient(email);
          toast.success('Client mail ouvert');
          break;
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de l'export");
      console.error('Export error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter les contrôles
          </DialogTitle>
          <DialogDescription>
            Sélectionnez la période et le format d'export
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Date filter */}
          <div className="space-y-3">
            <Label>Période</Label>
            <RadioGroup value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilterType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="today" id="today" />
                <Label htmlFor="today" className="font-normal cursor-pointer">Aujourd'hui</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="week" />
                <Label htmlFor="week" className="font-normal cursor-pointer">Cette semaine</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">Période personnalisée</Label>
              </div>
            </RadioGroup>
            
            {dateFilter === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !customDateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange.from ? (
                      customDateRange.to ? (
                        <>
                          {format(customDateRange.from, "dd MMM", { locale: fr })} -{" "}
                          {format(customDateRange.to, "dd MMM yyyy", { locale: fr })}
                        </>
                      ) : (
                        format(customDateRange.from, "dd MMMM yyyy", { locale: fr })
                      )
                    ) : (
                      "Sélectionner les dates"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange.from}
                    selected={customDateRange}
                    onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={1}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
          
          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Période</span>
              <span className="font-medium">{getDateRangeString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Contrôles</span>
              <span className="font-medium">{filteredControls.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Voyageurs</span>
              <span className="font-medium">{stats.totalPassengers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taux de fraude</span>
              <span className={cn(
                "font-medium",
                stats.fraudRate > 10 ? 'text-red-600' : stats.fraudRate > 5 ? 'text-orange-600' : 'text-green-600'
              )}>
                {formatFraudRate(stats.fraudRate)}
              </span>
            </div>
          </div>
          
          {/* Format selection */}
          <div className="space-y-3">
            <Label>Format d'export</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3"
                onClick={() => setExportFormat('pdf')}
              >
                <FileText className="h-5 w-5 mb-1" />
                <span className="text-xs">PDF</span>
              </Button>
              <Button
                type="button"
                variant={exportFormat === 'html' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3"
                onClick={() => setExportFormat('html')}
              >
                <FileCode className="h-5 w-5 mb-1" />
                <span className="text-xs">HTML</span>
              </Button>
              <Button
                type="button"
                variant={exportFormat === 'email' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3"
                onClick={() => setExportFormat('email')}
              >
                <Mail className="h-5 w-5 mb-1" />
                <span className="text-xs">Email</span>
              </Button>
            </div>
          </div>

          {/* PDF Orientation - only show for PDF */}
          {exportFormat === 'pdf' && (
            <div className="space-y-2">
              <Label>Orientation du PDF</Label>
              <Select
                value={pdfOrientation}
                onValueChange={(value: PdfOrientation) => setPdfOrientation(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Automatique
                    </div>
                  </SelectItem>
                  <SelectItem value="portrait">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-3 border border-foreground/50 rounded-sm" />
                      Portrait
                    </div>
                  </SelectItem>
                  <SelectItem value="landscape">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-4 border border-foreground/50 rounded-sm" />
                      Paysage
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="include-stats" className="font-normal cursor-pointer">
                Inclure les statistiques
              </Label>
            </div>
            <Switch
              id="include-stats"
              checked={includeStats}
              onCheckedChange={setIncludeStats}
            />
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {exportFormat === 'pdf' && (
            <Button 
              variant="secondary" 
              onClick={handlePreview} 
              disabled={filteredControls.length === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              Prévisualiser
            </Button>
          )}
          <Button onClick={handleExport} disabled={filteredControls.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* PDF Preview Dialog */}
      <PdfPreviewDialog
        open={showPreview}
        onOpenChange={handleClosePreview}
        pdfUrl={previewUrl}
        onDownload={handleDownloadFromPreview}
        title={`Prévisualisation - ${getDateRangeString()}`}
      />
    </Dialog>
  );
}
