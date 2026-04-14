import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Minus, Plus, X, Users, Ticket, FileText, ClipboardList, ChevronRight, ShoppingBag } from 'lucide-react';
import { TarifListItem, type TarifEntry } from './TarifListItem';
import { TarifTypeToggle } from './TarifTypeToggle';

const TARIF_TYPES = [
  { value: 'stt', label: 'STT' },
  { value: 'rnv', label: 'RNV' },
  { value: 'titre_tiers', label: 'Titre tiers' },
  { value: 'd_naissance', label: 'D. naissance' },
  { value: 'autre', label: 'Autre' },
];

const PV_TYPES = [
  { value: 'pv_stt100', label: 'STT' },
  { value: 'pv_rnv', label: 'RNV' },
  { value: 'pv_titre_tiers', label: 'Titre tiers' },
  { value: 'pv_doc_naissance', label: 'D. naissance' },
  { value: 'pv_autre', label: 'Autre' },
];

const BORD_TYPES = [
  { value: 'bord', label: 'Bord' },
  { value: 'exceptionnel', label: 'Exceptionnel' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  stt50Count?: number;
  stt100Count?: number;
  onStt50Change?: (value: number) => void;
  onStt100Change?: (value: number) => void;
  // New props for quick entry
  tarifsControle?: TarifEntry[];
  onTarifsControleChange?: (entries: TarifEntry[]) => void;
  pvList?: TarifEntry[];
  onPvListChange?: (entries: TarifEntry[]) => void;
  tarifsBord?: TarifEntry[];
  onTarifsBordChange?: (entries: TarifEntry[]) => void;
  riPositif?: number;
  riNegatif?: number;
  onRiPositifChange?: (value: number) => void;
  onRiNegatifChange?: (value: number) => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

/** Popup saisie rapide tarifs contrôle ou PV — même UX que OnboardControl */
function QuickEntryDialog({
  open,
  onOpenChange,
  title,
  types,
  entries,
  onEntriesChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  types: { value: string; label: string }[];
  entries: TarifEntry[];
  onEntriesChange: (entries: TarifEntry[]) => void;
  category: 'controle' | 'pv' | 'bord';
}) {
  const [selectedType, setSelectedType] = useState(types[0]?.value ?? '');
  const [montant, setMontant] = useState('');

  const handleAdd = () => {
    const m = parseFloat(montant);
    if (!m || m <= 0) return;
    const typeObj = types.find(t => t.value === selectedType);
    // For bord entries, category matches the selected type (bord/exceptionnel)
    const entryCategory = category === 'bord'
      ? (selectedType as 'bord' | 'exceptionnel')
      : category;
    onEntriesChange([...entries, {
      id: generateId(),
      type: selectedType,
      typeLabel: typeObj?.label ?? selectedType,
      montant: m,
      category: entryCategory,
    }]);
    setMontant('');
  };

  const handleRemove = (id: string) => {
    onEntriesChange(entries.filter(e => e.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {category === 'controle' ? <ClipboardList className="h-5 w-5 text-amber-600" /> : category === 'pv' ? <FileText className="h-5 w-5 text-red-600" /> : <ShoppingBag className="h-5 w-5 text-blue-600" />}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {/* Type selector */}
          <TarifTypeToggle types={types} value={selectedType} onChange={setSelectedType} />

          {/* Montant + ajouter */}
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Montant (€)"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!montant || parseFloat(montant) <= 0}
              variant={category === 'pv' ? 'destructive' : category === 'bord' ? 'outline' : 'default'}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>

          {/* Liste des entrées */}
          {entries.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {entries.map((e) => (
                <TarifListItem key={e.id} item={e} onRemove={handleRemove} />
              ))}
            </div>
          )}

          {/* Total */}
          {entries.length > 0 && (
            <div className="flex justify-between items-center pt-2 border-t text-sm">
              <span className="text-muted-foreground">{entries.length} entrée{entries.length > 1 ? 's' : ''}</span>
              <span className="font-semibold">{entries.reduce((s, e) => s + e.montant, 0).toFixed(2)}€</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BigPassengerCounterDialog({
  open, onOpenChange, value, onChange, min = 0, max = 9999,
  stt50Count = 0, stt100Count = 0, onStt50Change, onStt100Change,
  tarifsControle = [], onTarifsControleChange,
  pvList = [], onPvListChange,
  tarifsBord = [], onTarifsBordChange,
  riPositif = 0, riNegatif = 0, onRiPositifChange, onRiNegatifChange,
}: Props) {
  const [tcPopupOpen, setTcPopupOpen] = useState(false);
  const [pvPopupOpen, setPvPopupOpen] = useState(false);
  const [bordPopupOpen, setBordPopupOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const change = (delta: number) => onChange(Math.max(min, Math.min(max, value + delta)));

  if (!open) return null;

  const bordCount = tarifsBord.length;
  const riTotal = riPositif + riNegatif;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background/95 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
      >
        {/* Close */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Spacer top */}
        <div className="flex-1" />

        {/* Counter section */}
        <div className="flex flex-col items-center">
          {/* Label */}
          <div className="flex items-center gap-2 text-muted-foreground mb-6">
            <Users className="h-5 w-5" />
            <span className="text-base font-medium tracking-wide uppercase">Voyageurs</span>
          </div>

          {/* Big number */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={value}
              initial={{ scale: 0.85, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="text-[140px] font-black leading-none tabular-nums select-none text-foreground"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {value}
            </motion.div>
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex items-center gap-4 mt-10">
            <Button variant="outline" size="lg" className="h-16 w-20 text-xl font-bold" onClick={() => change(-10)} disabled={value <= min}>
              −10
            </Button>
            <Button variant="outline" size="lg" className="h-20 w-20" onClick={() => change(-1)} disabled={value <= min}>
              <Minus className="h-8 w-8" />
            </Button>
            <Button variant="outline" size="lg" className="h-20 w-20" onClick={() => change(1)} disabled={value >= max}>
              <Plus className="h-8 w-8" />
            </Button>
            <Button variant="outline" size="lg" className="h-16 w-20 text-xl font-bold" onClick={() => change(10)} disabled={value >= max}>
              +10
            </Button>
          </div>
        </div>

        {/* Spacer middle */}
        <div className="flex-1" />

        {/* Bottom section: STT + Bord + RI */}
        <div className="w-full max-w-lg px-6 pb-8">
          <div className="flex items-center gap-2 text-muted-foreground mb-3 justify-center">
            <Ticket className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Compteurs rapides</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* STT 50€ — tarifs contrôle */}
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 relative">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">STT 50€</span>
              <span className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{stt50Count}</span>
              <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700">{stt50Count * 50}€</Badge>
              {onStt50Change && (
                <div className="flex items-center gap-2 mt-1">
                  <button type="button" onClick={() => onStt50Change(Math.max(0, stt50Count - 1))}
                    className="h-9 w-9 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60 active:scale-95 transition-all disabled:opacity-30"
                    disabled={stt50Count <= 0}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onStt50Change(stt50Count + 1)}
                    className="h-9 w-9 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60 active:scale-95 transition-all">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
              {/* Bouton détail tarifs contrôle */}
              {onTarifsControleChange && (
                <button
                  type="button"
                  onClick={() => setTcPopupOpen(true)}
                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <ClipboardList className="h-3 w-3" />
                  Détail TC{tarifsControle.length > 0 && ` (${tarifsControle.length})`}
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* PV 100€ — procès-verbaux */}
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 relative">
              <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">PV 100€</span>
              <span className="text-3xl font-bold tabular-nums text-red-600 dark:text-red-400">{stt100Count}</span>
              <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700">{stt100Count * 100}€</Badge>
              {onStt100Change && (
                <div className="flex items-center gap-2 mt-1">
                  <button type="button" onClick={() => onStt100Change(Math.max(0, stt100Count - 1))}
                    className="h-9 w-9 rounded-lg border border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 active:scale-95 transition-all disabled:opacity-30"
                    disabled={stt100Count <= 0}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onStt100Change(stt100Count + 1)}
                    className="h-9 w-9 rounded-lg border border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 active:scale-95 transition-all">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
              {/* Bouton détail PV */}
              {onPvListChange && (
                <button
                  type="button"
                  onClick={() => setPvPopupOpen(true)}
                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  <FileText className="h-3 w-3" />
                  Détail PV{pvList.length > 0 && ` (${pvList.length})`}
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Bord — tarifs à bord */}
            {onTarifsBordChange && (
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Bord</span>
                <span className="text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{bordCount}</span>
                {bordCount > 0 && (
                  <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                    {tarifsBord.reduce((s, t) => s + t.montant, 0).toFixed(0)}€
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => setBordPopupOpen(true)}
                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ShoppingBag className="h-3 w-3" />
                  Saisir{bordCount > 0 && ` (${bordCount})`}
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* RI — régularisations */}
            {(onRiPositifChange || onRiNegatifChange) && (
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 overflow-hidden">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">RI</span>
                <span className="text-3xl font-bold tabular-nums text-purple-600 dark:text-purple-400">{riTotal}</span>
                <div className="flex items-center gap-2 mt-1">
                  {onRiPositifChange && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">+RI</span>
                      <div className="flex items-center gap-0.5">
                        <button type="button" onClick={() => onRiPositifChange(Math.max(0, riPositif - 1))}
                          className="h-7 w-7 rounded-md border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-400 active:scale-95 transition-all disabled:opacity-30 text-xs"
                          disabled={riPositif <= 0}>
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-bold tabular-nums w-4 text-center text-green-600 dark:text-green-400">{riPositif}</span>
                        <button type="button" onClick={() => onRiPositifChange(riPositif + 1)}
                          className="h-7 w-7 rounded-md border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-400 active:scale-95 transition-all text-xs">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  {onRiNegatifChange && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-red-600 dark:text-red-400 font-medium">−RI</span>
                      <div className="flex items-center gap-0.5">
                        <button type="button" onClick={() => onRiNegatifChange(Math.max(0, riNegatif - 1))}
                          className="h-7 w-7 rounded-md border border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400 active:scale-95 transition-all disabled:opacity-30 text-xs"
                          disabled={riNegatif <= 0}>
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-bold tabular-nums w-4 text-center text-red-600 dark:text-red-400">{riNegatif}</span>
                        <button type="button" onClick={() => onRiNegatifChange(riNegatif + 1)}
                          className="h-7 w-7 rounded-md border border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400 active:scale-95 transition-all text-xs">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="pb-6 text-xs text-muted-foreground">Appuyez sur Échap ou touchez l'extérieur pour fermer</p>
      </div>

      {/* Popup saisie rapide tarifs contrôle */}
      {onTarifsControleChange && (
        <QuickEntryDialog
          open={tcPopupOpen}
          onOpenChange={setTcPopupOpen}
          title="Tarifs contrôle"
          types={TARIF_TYPES}
          entries={tarifsControle}
          onEntriesChange={onTarifsControleChange}
          category="controle"
        />
      )}

      {/* Popup saisie rapide PV */}
      {onPvListChange && (
        <QuickEntryDialog
          open={pvPopupOpen}
          onOpenChange={setPvPopupOpen}
          title="Procès-verbaux"
          types={PV_TYPES}
          entries={pvList}
          onEntriesChange={onPvListChange}
          category="pv"
        />
      )}

      {/* Popup saisie rapide Bord */}
      {onTarifsBordChange && (
        <QuickEntryDialog
          open={bordPopupOpen}
          onOpenChange={setBordPopupOpen}
          title="Tarifs à bord"
          types={BORD_TYPES}
          entries={tarifsBord}
          onEntriesChange={onTarifsBordChange}
          category="bord"
        />
      )}
    </>
  );
}
